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
import * as Rx from 'rxjs';
import { filter, take, map } from 'rxjs';
import type { ToolingLog } from '@kbn/tooling-log';

import type { Lifecycle } from '../lifecycle';
import { observeContainerRunning } from './container_running';
import { observeContainerLogs } from './container_logs';
import type { DockerServer, DockerServerSpec } from './define_docker_servers_config';

const SECOND = 1000;
const SERVER_LABEL_KEY = 'kbn.ftr.server';
const ARGS_HASH_LABEL_KEY = 'kbn.ftr.argsHash';
const KEEP_RUNNING_LABEL_KEY = 'kbn.ftr.keepRunning';

export class DockerServersService {
  private servers: DockerServer[];

  constructor(
    configs: {
      [name: string]: DockerServerSpec;
    },
    private log: ToolingLog,
    private lifecycle: Lifecycle
  ) {
    this.servers = Object.entries(configs).map(([name, config]) => ({
      ...config,
      keepRunning: Boolean(config.keepRunning),
      name,
      url: Url.format({
        protocol: 'http:',
        hostname: 'localhost',
        port: config.port,
      }),
    }));

    this.lifecycle.beforeTests.add(async () => {
      await this.startServers();
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

  private computeArgsHash(server: DockerServer) {
    const signature = JSON.stringify({
      image: server.image,
      port: server.port,
      portInContainer: server.portInContainer,
      args: server.args ?? [],
    });

    return createHash('sha256').update(signature).digest('hex');
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
      const { stdout } = await execa('docker', [
        'ps',
        '-a',
        '--filter',
        `label=${SERVER_LABEL_KEY}=${server.name}`,
        '--format',
        '{{.ID}}',
      ]);

      const containerIds = stdout
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

      for (const containerId of containerIds) {
        const labels = await this.getContainerLabels(containerId);

        if (labels[ARGS_HASH_LABEL_KEY] !== argsHash) {
          this.log.info(
            `[docker:${server.name}] stopping container ${containerId} due to argument changes`
          );
          await this.removeContainer(containerId);
          continue;
        }

        const state = await this.getContainerState(containerId);
        if (state?.Running) {
          return containerId;
        }

        await this.removeContainer(containerId);
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

  private async removeContainer(containerId: string) {
    try {
      await execa('docker', ['rm', '-f', containerId]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.log.debug(`Failed to remove container ${containerId}: ${errorMessage}`);
    }
  }

  private async startServer(server: DockerServer) {
    const { log, lifecycle } = this;
    const { image, name, waitFor, waitForLogLine, waitForLogLineTimeoutMs, keepRunning } = server;
    const argsHash = this.computeArgsHash(server);

    let containerId: string | undefined;
    if (keepRunning) {
      containerId = await this.findReusableContainer(server, argsHash);
      if (containerId) {
        log.info(`[docker:${name}] reusing container ${containerId}`);
      }
    }

    if (!containerId) {
      log.info(`[docker:${name}] pulling docker image "${image}"`);
      await execa('docker', ['pull', image]);
      containerId = await this.dockerRun(server, argsHash);
    }

    if (!containerId) {
      throw new Error(`[docker:${name}] Failed to start docker container`);
    }

    if (!keepRunning) {
      lifecycle.cleanup.add(() => {
        try {
          execa.sync('docker', ['kill', containerId]);
          if (!process.env.CI) {
            execa.sync('docker', ['rm', containerId]);
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
}
