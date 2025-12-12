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

import type { Config } from '../../functional_test_runner';
import type { DockerServerSpec } from '../../functional_test_runner/lib/docker_servers/define_docker_servers_config';
import { observeContainerRunning } from '../../functional_test_runner/lib/docker_servers/container_running';
import { observeContainerLogs } from '../../functional_test_runner/lib/docker_servers/container_logs';

const SECOND = 1000;

export interface DockerServer extends DockerServerSpec {
  name: string;
  url: string;
}

interface RunningContainer {
  name: string;
  containerId: string;
  logSubscription: Rx.Subscription;
  runningSubscription: Rx.Subscription;
  cleanupPromise: Promise<void>;
}

interface RunDockerServersOptions {
  log: ToolingLog;
  config: Config;
  onEarlyExit?: (msg: string) => void;
}

/**
 * Starts docker containers defined in the config's dockerServers section.
 * Returns a cleanup function that stops all containers.
 */
export async function runDockerServers(
  options: RunDockerServersOptions
): Promise<() => Promise<void>> {
  const { log, config, onEarlyExit } = options;
  const dockerServerConfigs = config.get('dockerServers') as {
    [name: string]: DockerServerSpec;
  };

  // Return early if no docker servers configured
  if (!dockerServerConfigs || Object.keys(dockerServerConfigs).length === 0) {
    return async () => {}; // no-op cleanup
  }

  const servers: DockerServer[] = Object.entries(dockerServerConfigs).map(([name, cfg]) => ({
    ...cfg,
    name,
    url: Url.format({
      protocol: 'http:',
      hostname: 'localhost',
      port: cfg.port,
    }),
  }));

  const runningContainers: RunningContainer[] = [];

  // Start all enabled servers
  for (const server of servers) {
    if (server.enabled) {
      const container = await startDockerServer(server, log, onEarlyExit);
      runningContainers.push(container);
    }
  }

  // Store running container info for DockerServersService to access
  (global as any).__kibanaDockerServers = servers;
  (global as any).__kibanaDockerServerContainers = runningContainers.reduce((acc, container) => {
    acc[container.name] = container.containerId;
    return acc;
  }, {} as Record<string, string>);

  // Return cleanup function
  return async () => {
    log.info('Stopping docker servers...');
    await Promise.all(runningContainers.map((container) => stopDockerContainer(container, log)));
    delete (global as any).__kibanaDockerServers;
    delete (global as any).__kibanaDockerServerContainers;
  };
}

async function startDockerServer(
  server: DockerServer,
  log: ToolingLog,
  onEarlyExit?: (msg: string) => void
): Promise<RunningContainer> {
  const { image, name, waitFor, waitForLogLine, waitForLogLineTimeoutMs } = server;

  // Pull image from registry
  log.info(`[docker:${name}] pulling docker image "${image}"`);
  await execa('docker', ['pull', image]);

  // Run the image
  const containerId = await dockerRun(server, log);
  log.info(`[docker:${name}] started container ${containerId}`);

  // Set up log streaming
  const logLine$ = observeContainerLogs(name, containerId, log);
  const cleanupLogPromise = logLine$.toPromise().then(() => {});

  // Monitor container health - if it exits unexpectedly, trigger early exit
  const runningSubscription = observeContainerRunning(name, containerId, log).subscribe({
    error: (error) => {
      log.error(`[docker:${name}] Container exited unexpectedly`);
      log.error(error);
      if (onEarlyExit) {
        onEarlyExit(`Docker container "${name}" exited unexpectedly`);
      }
    },
  });

  // Wait for container to be ready
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

  log.info(`[docker:${name}] container is ready`);

  return {
    name,
    containerId,
    logSubscription: logLine$.subscribe(), // Keep logs flowing
    runningSubscription,
    cleanupPromise: cleanupLogPromise,
  };
}

async function dockerRun(server: DockerServer, log: ToolingLog): Promise<string> {
  const { args, name, port, portInContainer, image } = server;
  try {
    log.debug(`[docker:${name}] running image "${image}"`);

    const dockerArgs = ['run', '-dit', ...(args || []), '-p', `${port}:${portInContainer}`, image];
    const res = await execa('docker', dockerArgs);

    return res.stdout.trim();
  } catch (error: any) {
    if (error?.exitCode === 125 && error?.message.includes('port is already allocated')) {
      throw new Error(`
        [docker:${name}] Another process is already listening on port ${port}.

        When this happens on CI it is usually because the port number isn't taking into
        account parallel workers running on the same machine.

        When this happens locally it is usually because the functional test runner didn't
        have a chance to cleanup the running docker containers before being killed.

        To see if this is the case:

         1. make sure that there aren't other instances of the functional test runner running
         2. run \`docker ps\` to see the containers running
         3. if one of them lists that it is using port ${port} then kill it with \`docker kill "container ID"\`
      `);
    }

    throw error;
  }
}

async function stopDockerContainer(container: RunningContainer, log: ToolingLog): Promise<void> {
  const { name, containerId, logSubscription, runningSubscription } = container;

  log.info(`[docker:${name}] stopping container ${containerId}`);

  // Unsubscribe from observables
  runningSubscription.unsubscribe();
  logSubscription.unsubscribe();

  try {
    // Kill the container
    await execa('docker', ['kill', containerId]);

    // Remove container (except on CI where it can cause network issues)
    if (!process.env.CI) {
      await execa('docker', ['rm', containerId]);
    }
  } catch (error: any) {
    if (
      error.message.includes(`Container ${containerId} is not running`) ||
      error.message.includes(`No such container: ${containerId}`)
    ) {
      return;
    }
    throw error;
  }

  // Wait for log cleanup to complete
  await container.cleanupPromise;
}
