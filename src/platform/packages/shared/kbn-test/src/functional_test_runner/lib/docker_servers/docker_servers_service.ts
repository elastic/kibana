/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Url from 'url';
import { createHash } from 'crypto';
import execa from 'execa';
import getPort from 'get-port';
import * as Rx from 'rxjs';
import { filter, take, map } from 'rxjs';
import type { ToolingLog } from '@kbn/tooling-log';

import { Lifecycle } from '../lifecycle';
import { observeContainerRunning } from './container_running';
import { observeContainerLogs } from './container_logs';
import type { DockerServer, DockerServerSpec } from './define_docker_servers_config';

const SECOND = 1000;
const SERVER_LABEL_KEY = 'kbn.ftr.server';
const ARGS_HASH_LABEL_KEY = 'kbn.ftr.argsHash';
const KEEP_RUNNING_LABEL_KEY = 'kbn.ftr.keepRunning';

export class DockerServersService {
  private servers: DockerServer[];
  private startPromise?: Promise<void>;
  // track containers created or discovered during this service lifetime by argsHash
  private activeContainersByHash: Map<string, string> = new Map();
  private originalPortValueByServer: Map<string, string | number | undefined> = new Map();

  constructor(
    configs: {
      [name: string]: DockerServerSpec;
    },
    private log: ToolingLog,
    private lifecycle: Lifecycle
  ) {
    this.servers = Object.entries(configs).map(([name, config]) => {
      this.originalPortValueByServer.set(name, config.port);
      const normalizedPort = this.normalizePortValue(config.port) ?? 0;
      const server: DockerServer = {
        ...config,
        keepRunning: Boolean(config.keepRunning),
        name,
        port: normalizedPort,
        url: '',
      };
      this.updateServerUrl(server);
      return server;
    });

    this.lifecycle.beforeTests.add(async () => {
      await this.ensureStarted();
    });
  }

  isEnabled(name: string) {
    return this.get(name).enabled;
  }

  has(name: string) {
    return this.servers.some((s) => s.name === name);
  }

  get(name: string) {
    const server = this.servers.find((s) => s.name === name);
    if (!server) {
      throw new Error(`no server with name "${name}"`);
    }
    return { ...server };
  }

  public warmUp() {
    return this.ensureStarted();
  }

  private ensureStarted() {
    if (!this.startPromise) {
      this.startPromise = this.startServers();
    }
    return this.startPromise;
  }

  private normalizePortValue(port: number | string | undefined) {
    if (typeof port === 'number') {
      return Number.isFinite(port) ? port : undefined;
    }

    if (typeof port === 'string') {
      const parsed = Number.parseInt(port, 10);
      return Number.isFinite(parsed) ? parsed : undefined;
    }

    return undefined;
  }

  private updateServerUrl(server: DockerServer) {
    server.url = Url.format({
      protocol: 'http:',
      hostname: 'localhost',
      port: server.port || undefined,
    });
  }

  private overridePortEnv(
    server: DockerServer,
    originalPort: string | number | undefined,
    newPort: number
  ) {
    if (originalPort === undefined || Number(newPort) !== newPort) {
      return;
    }

    const original = String(originalPort);
    const target = String(newPort);
    const updatedEnvVars: string[] = [];

    for (const [key, value] of Object.entries(process.env)) {
      if (!value) {
        continue;
      }

      if (!key.includes('PORT')) {
        continue;
      }

      if (value === original) {
        process.env[key] = target;
        updatedEnvVars.push(key);
      }
    }

    if (updatedEnvVars.length) {
      this.log.info(
        `[docker:${server.name}] reassigned env port (${updatedEnvVars.join(', ')}) to ${target}`
      );
    } else {
      this.log.debug(
        `[docker:${server.name}] no environment variable with value ${original} found to override`
      );
    }
  }

  private async ensureServerPortAvailable(server: DockerServer) {
    const originalPortValue = this.originalPortValueByServer.get(server.name);
    const requestedPort =
      this.normalizePortValue(originalPortValue) ??
      this.normalizePortValue(server.port) ??
      undefined;

    const resolvedPort =
      requestedPort !== undefined ? await getPort({ port: requestedPort }) : await getPort();

    if (!Number.isFinite(resolvedPort)) {
      throw new Error(`[docker:${server.name}] Failed to obtain an available host port`);
    }

    if (requestedPort !== undefined && resolvedPort !== requestedPort) {
      this.log.info(
        `[docker:${server.name}] requested host port ${requestedPort} unavailable, using ${resolvedPort}`
      );
      this.overridePortEnv(server, originalPortValue, resolvedPort);
    }

    if (server.port !== resolvedPort) {
      server.port = resolvedPort;
      this.updateServerUrl(server);
    }

    this.originalPortValueByServer.set(server.name, resolvedPort);

    return resolvedPort;
  }

  private computeArgsHash(server: DockerServer) {
    const signature = JSON.stringify({
      image: server.image,
      port: server.port,
      portInContainer: server.portInContainer,
      args: server.args ?? [],
    });

    const h = createHash('sha256').update(signature).digest('hex');

    return h;
  }

  private buildDockerArgs(server: DockerServer, argsHash: string) {
    const args = server.args ?? [];

    return [
      'run',
      '-dit',
      '--label',
      `${SERVER_LABEL_KEY}=${server.name}`,
      '--label',
      `${ARGS_HASH_LABEL_KEY}=${argsHash}`,
      '--label',
      `${KEEP_RUNNING_LABEL_KEY}=${server.keepRunning ? 'true' : 'false'}`,
      ...args,
      '-p',
      `${server.port}:${server.portInContainer}`,
      server.image,
    ];
  }

  private async dockerRun(server: DockerServer, argsHash: string) {
    try {
      this.log.info(`[docker:${server.name}] running image "${server.image}"`);

      const dockerArgs = this.buildDockerArgs(server, argsHash);
      const res = await execa('docker', dockerArgs);

      return res.stdout.trim();
    } catch (error) {
      if (error?.exitCode === 125 && error?.message.includes('port is already allocated')) {
        throw new Error(`
          [docker:${server.name}] Another process is already listening on port ${server.port}.

          When this happens on CI it is usually because the port number isn't taking into
          account parallel workers running on the same machine.

          When this happens locally it is usually because the functional test runner didn't
          have a chance to cleanup the running docker containers before being killed.

          To see if this is the case:

           1. make sure that there aren't other instances of the functional test runner running
           2. run \`docker ps\` to see the containers running
           3. if one of them lists that it is using port ${server.port} then kill it with \`docker kill "container ID"\`
        `);
      }

      throw error;
    }
  }

  private async findReusableContainer(server: DockerServer, argsHash: string) {
    try {
      // search for any container that was created for this exact arguments hash
      // (this allows reuse across server names/configs that share the same args)
      const { stdout } = await execa('docker', [
        'ps',
        '-a',
        '--filter',
        `label=${ARGS_HASH_LABEL_KEY}=${argsHash}`,
        '--format',
        '{{.ID}}',
      ]);

      const containerIds = stdout
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

      for (const containerId of containerIds) {
        let state = await this.getContainerState(containerId);

        // found a container that matches this argsHash (we filtered by label above)

        if (state?.Paused) {
          await this.resumeContainer(server, containerId);
          state = await this.getContainerState(containerId);
        }

        if (state?.Running) {
          return containerId;
        }

        if (state?.Status === 'created' || state?.Status === 'exited') {
          await this.startContainer(server, containerId);
          return containerId;
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.log.debug(
        `[docker:${server.name}] failed to inspect existing containers for reuse: ${errorMessage}`
      );
    }

    return undefined;
  }

  private async getContainerLabels(containerId: string) {
    const { stdout } = await execa('docker', [
      'inspect',
      '--format',
      '{{json .Config.Labels}}',
      containerId,
    ]);

    const labels = stdout ? JSON.parse(stdout) : {};
    return labels ?? {};
  }

  private async getContainerState(containerId: string) {
    const { stdout } = await execa('docker', [
      'inspect',
      '--format',
      '{{json .State}}',
      containerId,
    ]);

    return stdout ? JSON.parse(stdout) ?? undefined : undefined;
  }

  private async pauseContainer(server: DockerServer, containerId: string) {
    try {
      this.log.debug(`[docker:${server.name}] pausing container ${containerId}`);
      await execa('docker', ['pause', containerId]);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('is already paused') || message.includes('is not running')) {
        return;
      }

      throw error;
    }
  }

  private async resumeContainer(server: DockerServer, containerId: string) {
    try {
      this.log.debug(`[docker:${server.name}] resuming container ${containerId}`);
      await execa('docker', ['unpause', containerId]);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('is not paused')) {
        return;
      }

      throw error;
    }
  }

  private async startContainer(server: DockerServer, containerId: string) {
    this.log.info(`[docker:${server.name}] starting container ${containerId}`);
    await execa('docker', ['start', containerId]);
  }

  private async ensureContainerRunning(server: DockerServer, containerId: string) {
    let state = await this.getContainerState(containerId);

    if (state?.Paused) {
      await this.resumeContainer(server, containerId);
      state = await this.getContainerState(containerId);
    }

    if (state?.Restarting) {
      return;
    }

    if (!state?.Running) {
      await this.startContainer(server, containerId);
    }
  }

  private async startServer(server: DockerServer) {
    const { log, lifecycle } = this;
    const { image, name, waitFor, waitForLogLine, waitForLogLineTimeoutMs, keepRunning } = server;
    let argsHash = this.computeArgsHash(server);

    let containerId: string | undefined;
    if (keepRunning) {
      containerId = await this.findReusableContainer(server, argsHash);
      if (containerId) {
        log.info(`[docker:${name}] reusing container ${containerId}`);
      }
    }

    if (!containerId) {
      await this.ensureServerPortAvailable(server);
      argsHash = this.computeArgsHash(server);

      if (keepRunning && !containerId) {
        containerId = await this.findReusableContainer(server, argsHash);
        if (containerId) {
          log.info(`[docker:${name}] reusing container ${containerId}`);
        }
      }
    }

    if (!containerId) {
      log.info(`[docker:${name}] pulling docker image "${image}"`);
      await execa('docker', ['pull', image]);
      containerId = await this.dockerRun(server, argsHash);
    }

    // record the active container for this argsHash so subsequent starts for the same
    // args won't create duplicate containers during this service lifetime
    if (containerId) {
      this.activeContainersByHash.set(argsHash, containerId);
    }

    // pause other running keepRunning containers that were created for a different
    // argsHash so we only run the container that is currently needed. We filter
    // for containers we manage via the KEEP_RUNNING label.
    try {
      const { stdout: allContainers } = await execa('docker', [
        'ps',
        '-a',
        '--filter',
        `label=${KEEP_RUNNING_LABEL_KEY}=true`,
        '--format',
        '{{.ID}} {{.Status}}',
      ]);

      const rows = allContainers
        .split('\n')
        .map((r) => r.trim())
        .filter(Boolean);

      for (const row of rows) {
        const parts = row.split(' ');
        const id = parts[0];
        if (!id || id === containerId) continue;

        try {
          const labels = await this.getContainerLabels(id);
          const otherHash = labels[ARGS_HASH_LABEL_KEY];

          // if the other container has a different argsHash and is running, pause it
          if (otherHash && otherHash !== argsHash) {
            const st = await this.getContainerState(id);
            if (st && st.Running) {
              await this.pauseContainer(server, id);
            }
          }
        } catch (err) {
          this.log.debug(`[docker:${name}] failed to inspect/pause container ${id}: ${err}`);
        }
      }
    } catch (err) {
      this.log.debug(
        `[docker:${name}] failed to enumerate keepRunning containers for pausing: ${err}`
      );
    }

    if (!containerId) {
      throw new Error(`[docker:${name}] Failed to start docker container`);
    }

    await this.ensureContainerRunning(server, containerId);

    if (!keepRunning) {
      lifecycle.cleanup.add(() => {
        try {
          // only kill/remove if the container is running. If it's paused or already stopped
          // we should not remove it here because a different config might still reuse it.
          const state = this.getContainerState(containerId);
          if (state && state instanceof Promise) {
            // shouldn't happen, but guard the type
          }

          // check synchronously by asking docker for the state
          const { stdout: stateStdout } = execa.sync('docker', [
            'inspect',
            '--format',
            '{{json .State}}',
            containerId,
          ]);
          const parsedState = stateStdout ? JSON.parse(stateStdout) : undefined;

          if (parsedState && parsedState.Running) {
            execa.sync('docker', ['kill', containerId]);
            if (!process.env.CI) {
              execa.sync('docker', ['rm', containerId]);
            }
          }
        } catch (error) {
          if (
            error.message.includes(`Container ${containerId} is not running`) ||
            error.message.includes(`No such container: ${containerId}`)
          ) {
            return;
          }

          throw error;
        }
      });
    }

    // push the logs from the container to our logger, and expose an observable of those lines for testing
    const logStream = observeContainerLogs(name, containerId, log);
    const logLine$ = logStream.lines$;
    lifecycle.cleanup.add(async () => {
      await logStream.stop();
    });

    // ensure container stays running, error if it exits
    lifecycle.cleanup.addSub(
      observeContainerRunning(name, containerId, log).subscribe({
        error: (error) => {
          lifecycle.cleanup.after$.subscribe(() => {
            log.error(`[docker:${name}] Error ensuring that the container is running`);
            log.error(error);
            process.exit(1);
          });

          if (!lifecycle.cleanup.triggered) {
            lifecycle.cleanup.trigger();
          }
        },
      })
    );

    // wait for conditions before completing
    if (waitForLogLine instanceof RegExp) {
      log.info(`[docker:${name}] Waiting for log line matching /${waitForLogLine.source}/`);
    }
    if (typeof waitForLogLine === 'string') {
      log.info(`[docker:${name}] Waiting for log line containing "${waitForLogLine}"`);
    }
    if (waitFor !== undefined) {
      log.info(`[docker:${name}] Waiting for waitFor() promise to resolve`);
    }
    if (waitForLogLine === undefined && waitFor === undefined) {
      log.warning(`
        [docker:${name}] No "waitFor*" condition defined, you should always
          define a wait condition to avoid race conditions that are more likely
          to fail on CI because we're not waiting for the contained server to be ready.
      `);
    }

    function firstWithTimeout(source$: Rx.Observable<any>, errorMsg: string, ms = 30 * SECOND) {
      return Rx.race(
        source$.pipe(take(1)),
        Rx.timer(ms).pipe(
          map(() => {
            throw new Error(`[docker:${name}] ${errorMsg} within ${ms / SECOND} seconds`);
          })
        )
      );
    }

    await Rx.merge(
      waitFor === undefined
        ? Rx.EMPTY
        : firstWithTimeout(
            waitFor(server, logLine$),
            `didn't find a line containing "${waitForLogLine}"`
          ),

      waitForLogLine === undefined
        ? Rx.EMPTY
        : firstWithTimeout(
            logLine$.pipe(
              filter((line) =>
                waitForLogLine instanceof RegExp
                  ? waitForLogLine.test(line)
                  : line.includes(waitForLogLine)
              )
            ),
            `waitForLogLine didn't emit anything`,
            waitForLogLineTimeoutMs
          )
    ).toPromise();
  }

  private async startServers() {
    await Promise.all(
      this.servers.map(async (server) => {
        if (server.enabled) {
          await this.startServer(server);
        }
      })
    );
  }

  static async warmUpServers(
    configs: { [name: string]: DockerServerSpec } | undefined,
    log: ToolingLog
  ) {
    if (!configs) {
      return;
    }

    const keepRunningEntries = Object.entries(configs).filter(
      ([, server]) => server.enabled && server.keepRunning
    );

    if (!keepRunningEntries.length) {
      return;
    }

    const lifecycle = new Lifecycle(log);
    const service = new DockerServersService(
      Object.fromEntries(keepRunningEntries),
      log,
      lifecycle
    );
    await service.warmUp();
    await lifecycle.cleanup.trigger();
  }
}
