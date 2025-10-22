/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Url from 'url';
import execa from 'execa';
import * as Rx from 'rxjs';
import { filter, take, map } from 'rxjs';
import type { ToolingLog } from '@kbn/tooling-log';

import type { Lifecycle } from '../lifecycle';
import { observeContainerRunning } from './container_running';
import { observeContainerLogs } from './container_logs';
import type { DockerServer, DockerServerSpec } from './define_docker_servers_config';

const SECOND = 1000;
const ES_NODE_STAGGER_DELAY = 10 * SECOND; // 10 seconds between ES node startups

export class DockerServersService {
  private servers: DockerServer[];

  constructor(
    configs: {
      [name: string]: DockerServerSpec;
    },
    private log: ToolingLog,
    private lifecycle: Lifecycle,
    private disabled?: boolean
  ) {
    this.servers = Object.entries(configs).map(([name, config]) => ({
      ...config,
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

  private async dockerRun(server: DockerServer) {
    const { args } = server;
    try {
      this.log.info(`[docker:${server.name}] running image "${server.image}"`);

      const dockerArgs = [
        'run',
        '-dit',
        args || [],
        '-p',
        `${server.port}:${server.portInContainer}`,
        server.image,
      ].flat();
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

  private async startServer(server: DockerServer) {
    const { log, lifecycle } = this;
    const { image, name, waitFor, waitForLogLine, waitForLogLineTimeoutMs } = server;

    // pull image from registry
    log.info(`[docker:${name}] pulling docker image "${image}"`);
    await execa('docker', ['pull', image]);

    // run the image that we just pulled
    const containerId = await this.dockerRun(server);

    lifecycle.cleanup.add(() => {
      try {
        execa.sync('docker', ['kill', containerId]);
        // we don't remove the containers on CI because removing them causes the
        // network list to be updated and aborts all in-flight requests in Chrome
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

    // push the logs from the container to our logger, and expose an observable of those lines for testing
    const logLine$ = observeContainerLogs(name, containerId, log);
    lifecycle.cleanup.add(async () => {
      await logLine$.toPromise();
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
    if (this.disabled) {
      return;
    }

    // Separate ES nodes from other servers
    const esNodes: DockerServer[] = [];
    const otherServers: DockerServer[] = [];

    this.servers.forEach((server) => {
      if (server.enabled) {
        // Identify ES nodes by name pattern (es01, es02, es03, etc.)
        if (/^es\d+$/.test(server.name)) {
          esNodes.push(server);
        } else {
          otherServers.push(server);
        }
      }
    });

    // Sort ES nodes by name to ensure consistent ordering (es01, es02, es03)
    esNodes.sort((a, b) => a.name.localeCompare(b.name));

    // Start ES nodes sequentially with delay to prevent election race conditions
    const esStartupPromises: Promise<void>[] = [];
    for (const esNode of esNodes) {
      this.log.info(
        `[docker:${esNode.name}] Starting ES node (${esNodes.indexOf(esNode) + 1}/${
          esNodes.length
        })`
      );
      esStartupPromises.push(this.startServer(esNode));

      // Add delay between ES node startups (except after the last one)
      if (esNodes.indexOf(esNode) < esNodes.length - 1) {
        this.log.info(
          `[docker] Waiting ${
            ES_NODE_STAGGER_DELAY / SECOND
          }s before starting next ES node to prevent election race conditions`
        );
        await new Promise((resolve) => setTimeout(resolve, ES_NODE_STAGGER_DELAY));
      }
    }

    // Start all non-ES servers in parallel for efficiency
    const otherStartupPromises: Promise<void>[] = [];
    if (otherServers.length > 0) {
      this.log.info(`[docker] Starting ${otherServers.length} non-ES servers in parallel`);
      otherServers.forEach((server) => {
        otherStartupPromises.push(this.startServer(server));
      });
    }
    await Promise.all(esStartupPromises.concat(otherStartupPromises));
  }
}
