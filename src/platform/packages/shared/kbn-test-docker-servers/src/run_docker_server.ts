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
import { filter, map, take } from 'rxjs';
import type { ToolingLog } from '@kbn/tooling-log';
import type { DockerServer, DockerServerSpec } from './define_docker_servers_config';
import { observeContainerLogs } from './container_logs';
import { observeContainerRunning } from './container_running';

const SECOND = 1000;
const DEFAULT_WAIT_TIMEOUT_MS = 30 * SECOND;
const LOG_DRAIN_TIMEOUT_MS = 10 * SECOND;

export interface RunningDockerServer {
  name: string;
  url: string;
  containerId: string;
  /** Lines the container writes to stdout/stderr, for callers that need to wait on more output. */
  logLine$: Rx.Observable<string>;
  /** Kills the container (and removes it outside CI). Safe to call more than once. */
  stop: () => Promise<void>;
}

export interface RunDockerServerOptions {
  log: ToolingLog;
  /** Called if the container exits on its own while it is supposed to be running. */
  onUnexpectedExit?: (error: Error) => void;
}

/** Turns a named entry of a `dockerServers` config into the spec `runDockerServer` takes. */
export function toDockerServer(name: string, spec: DockerServerSpec): DockerServer {
  return {
    ...spec,
    name,
    url: Url.format({ protocol: 'http:', hostname: 'localhost', port: spec.port }),
  };
}

export async function isDockerImageAvailableLocally(image: string): Promise<boolean> {
  try {
    const { stdout } = await execa('docker', ['images', '-q', image]);
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}

async function dockerRun(server: DockerServer, log: ToolingLog): Promise<string> {
  const { args, name, image, port, portInContainer } = server;
  try {
    log.info(`[docker:${name}] running image "${image}"`);

    const dockerArgs = [
      'run',
      '-dit',
      args || [],
      '-p',
      `${port}:${portInContainer}`,
      image,
    ].flat();
    const res = await execa('docker', dockerArgs);

    return res.stdout.trim();
  } catch (error) {
    if (error?.exitCode === 125 && error?.message.includes('port is already allocated')) {
      throw new Error(`
        [docker:${name}] Another process is already listening on port ${port}.

        When this happens on CI it is usually because the port number isn't taking into
        account parallel workers running on the same machine.

        When this happens locally it is usually because a previous test run didn't
        have a chance to cleanup the running docker containers before being killed.

        To see if this is the case:

         1. make sure that there aren't other test runs in progress
         2. run \`docker ps\` to see the containers running
         3. if one of them lists that it is using port ${port} then kill it with \`docker kill "container ID"\`
      `);
    }

    throw error;
  }
}

function firstWithTimeout<T>(
  name: string,
  source$: Rx.Observable<T>,
  errorMsg: string,
  ms = DEFAULT_WAIT_TIMEOUT_MS
) {
  return Rx.race(
    source$.pipe(take(1)),
    Rx.timer(ms).pipe(
      map(() => {
        throw new Error(`[docker:${name}] ${errorMsg} within ${ms / SECOND} seconds`);
      })
    )
  );
}

async function waitUntilReady(
  server: DockerServer,
  logLine$: Rx.Observable<string>,
  log: ToolingLog
): Promise<void> {
  const { name, waitFor, waitForLogLine, waitForLogLineTimeoutMs } = server;

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
    return;
  }

  await Rx.lastValueFrom(
    Rx.merge(
      waitFor === undefined
        ? Rx.EMPTY
        : firstWithTimeout(name, waitFor(server, logLine$), `waitFor() didn't emit anything`),

      waitForLogLine === undefined
        ? Rx.EMPTY
        : firstWithTimeout(
            name,
            logLine$.pipe(
              filter((line) =>
                waitForLogLine instanceof RegExp
                  ? waitForLogLine.test(line)
                  : line.includes(waitForLogLine)
              )
            ),
            `didn't find a log line matching "${waitForLogLine}"`,
            waitForLogLineTimeoutMs
          )
    )
  );
}

/**
 * Pulls (unless cached and `preferCached`), runs and waits for one docker server, the same way the
 * FTR `dockerServers` service does, but without any test-runner lifecycle: the caller owns the
 * returned `stop()`. Fails, and stops the container, if the readiness condition is not met in time.
 */
export async function runDockerServer(
  server: DockerServer,
  { log, onUnexpectedExit }: RunDockerServerOptions
): Promise<RunningDockerServer> {
  const { image, name } = server;

  if (server.preferCached && (await isDockerImageAvailableLocally(image))) {
    log.info(`[docker:${name}] skipping pull of docker image "${image}"`);
  } else {
    log.info(`[docker:${name}] pulling docker image "${image}"`);
    await execa('docker', ['pull', image]);
  }

  const containerId = await dockerRun(server, log);
  let stopped = false;

  // push the logs from the container to our logger, and expose an observable of those lines
  const logLine$ = observeContainerLogs(name, containerId, log);

  // ensure container stays running, report if it exits on its own
  const runningSub = observeContainerRunning(name, containerId, log).subscribe({
    error: (error) => {
      if (stopped) {
        return;
      }
      log.error(`[docker:${name}] Error ensuring that the container is running`);
      log.error(error);
      onUnexpectedExit?.(error);
    },
  });

  const stop = async () => {
    if (stopped) {
      return;
    }
    stopped = true;
    runningSub.unsubscribe();

    try {
      await execa('docker', ['kill', containerId]);
      // we don't remove the containers on CI because removing them causes the
      // network list to be updated and aborts all in-flight requests in Chrome
      if (!process.env.CI) {
        await execa('docker', ['rm', containerId]);
      }
    } catch (error) {
      if (
        !error.message.includes(`Container ${containerId} is not running`) &&
        !error.message.includes(`No such container: ${containerId}`)
      ) {
        throw error;
      }
    }

    // let the log stream drain so nothing is logged after shutdown, but never hang on it
    await Rx.lastValueFrom(
      Rx.race(logLine$.pipe(Rx.ignoreElements()), Rx.timer(LOG_DRAIN_TIMEOUT_MS)),
      { defaultValue: undefined }
    );
  };

  try {
    await waitUntilReady(server, logLine$, log);
  } catch (error) {
    await stop();
    throw error;
  }

  log.info(`[docker:${name}] ready at ${server.url}`);

  return { name, url: server.url, containerId, logLine$, stop };
}
