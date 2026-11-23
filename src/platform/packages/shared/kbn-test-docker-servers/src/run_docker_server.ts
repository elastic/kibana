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
import { catchError, filter, map, take, throwIfEmpty } from 'rxjs';
import type { ToolingLog } from '@kbn/tooling-log';
import type { DockerServer, DockerServerSpec } from './define_docker_servers_config';
import { observeContainerLogs } from './container_logs';
import { ContainerExitError, observeContainerRunning } from './container_running';

const SECOND = 1000;
const DEFAULT_WAIT_TIMEOUT_MS = 30 * SECOND;
const LOG_DRAIN_TIMEOUT_MS = 10 * SECOND;
const MONITOR_RETRY_DELAY_MS = 1 * SECOND;
const MONITOR_RETRY_MAX_DELAY_MS = 30 * SECOND;
const MONITOR_RETRY_MAX_ATTEMPTS = 10;

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
  /**
   * Aborting while the start is in progress (pull, run, readiness wait) stops the container and
   * rejects with an `AbortError`, so a shutdown signal never leaves a half-started container behind.
   */
  signal?: AbortSignal;
}

function abortError(name: string) {
  const error = new Error(`[docker:${name}] start aborted`);
  error.name = 'AbortError';
  return error;
}

/** Turns a named entry of a `dockerServers` config into the spec `runDockerServer` takes. */
export function toDockerServer(name: string, spec: DockerServerSpec): DockerServer {
  return {
    ...spec,
    name,
    url: Url.format({ protocol: 'http:', hostname: 'localhost', port: spec.port }),
  };
}

/** Whether the container is running per `docker inspect`; `undefined` when the daemon could not answer. */
export async function isDockerContainerRunning(containerId: string): Promise<boolean | undefined> {
  try {
    const { stdout } = await execa('docker', ['inspect', '-f', '{{.State.Running}}', containerId]);
    return stdout.trim() === 'true';
  } catch (error) {
    // "No such container" is an answer; anything else is the daemon not answering
    return ignoreGoneContainerSilently(containerId, error) ? false : undefined;
  }
}

function ignoreGoneContainerSilently(containerId: string, error: Error): boolean {
  try {
    ignoreGoneContainer(containerId, error);
    return true;
  } catch {
    return false;
  }
}

export async function isDockerImageAvailableLocally(image: string): Promise<boolean> {
  try {
    const { stdout } = await execa('docker', ['images', '-q', image]);
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}

/** `docker pull`, killed as soon as `signal` aborts so a shutdown does not wait for a slow pull. */
async function dockerPull(server: DockerServer, log: ToolingLog, signal?: AbortSignal) {
  if (signal?.aborted) {
    // aborted during the image-cache lookup: the listener below would never fire
    throw abortError(server.name);
  }
  const pull = execa('docker', ['pull', server.image]);
  const onAbort = () => pull.kill('SIGTERM');
  signal?.addEventListener('abort', onAbort, { once: true });
  try {
    await pull;
  } catch (error) {
    if (signal?.aborted) {
      log.info(`[docker:${server.name}] pull cancelled`);
      throw abortError(server.name);
    }
    throw error;
  } finally {
    signal?.removeEventListener('abort', onAbort);
  }
}

/** A name of our own for the container, so the error paths can find it before `docker run` returned its id. */
function containerName(server: DockerServer) {
  return `${server.name}-${server.port}-${Date.now().toString(36)}`.replace(
    /[^a-zA-Z0-9_.-]/g,
    '-'
  );
}

async function dockerRun(server: DockerServer, log: ToolingLog): Promise<string> {
  const { args, name, image, port, portInContainer } = server;
  const containerNameArg = containerName(server);
  try {
    log.info(`[docker:${name}] running image "${image}"`);

    const dockerArgs = [
      'run',
      '-dit',
      '--name',
      containerNameArg,
      args || [],
      // loopback only: Kibana on this host is the only client, nothing else needs the registry
      '-p',
      `127.0.0.1:${port}:${portInContainer}`,
      image,
    ].flat();
    const res = await execa('docker', dockerArgs);

    return res.stdout.trim();
  } catch (error) {
    // docker may have created (even started) the container before failing; do not leave it
    await execa('docker', ['rm', '-f', containerNameArg]).catch(() => {});
    if (error?.exitCode === 125 && error?.message?.includes('port is already allocated')) {
      throw new Error(
        `
        [docker:${name}] Another process is already listening on port ${port}.

        When this happens on CI it is usually because the port number isn't taking into
        account parallel workers running on the same machine.

        When this happens locally it is usually because a previous test run didn't
        have a chance to cleanup the running docker containers before being killed.

        To see if this is the case:

         1. make sure that there aren't other test runs in progress
         2. run \`docker ps\` to see the containers running
         3. if one of them lists that it is using port ${port} then kill it with \`docker kill "container ID"\`
      `.trim()
      );
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
  log: ToolingLog,
  abort$: Rx.Observable<void>
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

  // The log stream ending before a match (the container died, the daemon dropped the attach) is
  // not readiness. `abort$` tears the wait down, timers included, when the caller gives up.
  const ready$ = Rx.merge(
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
  ).pipe(
    throwIfEmpty(
      () => new Error(`[docker:${name}] the container's log stream ended before it was ready`)
    )
  );
  await Rx.lastValueFrom(Rx.race(ready$, abort$.pipe(take(1))), { defaultValue: undefined });
}

/** Rethrows unless the error says the container is already gone (the daemon's wording varies in case). */
export function ignoreGoneContainer(containerId: string, error: Error) {
  const message = (error.message ?? '').toLowerCase();
  if (
    !message.includes(`container ${containerId} is not running`.toLowerCase()) &&
    !message.includes(`no such container: ${containerId}`.toLowerCase())
  ) {
    throw error;
  }
}

/** Pulls (unless cached), runs and waits for one docker server; the caller owns the returned `stop()`. */
export async function runDockerServer(
  server: DockerServer,
  { log, onUnexpectedExit, signal }: RunDockerServerOptions
): Promise<RunningDockerServer> {
  const { image, name } = server;

  if (signal?.aborted) {
    throw abortError(name);
  }

  if (server.preferCached && (await isDockerImageAvailableLocally(image))) {
    log.info(`[docker:${name}] skipping pull of docker image "${image}"`);
  } else {
    log.info(`[docker:${name}] pulling docker image "${image}"`);
    await dockerPull(server, log, signal);
  }

  if (signal?.aborted) {
    throw abortError(name);
  }

  const containerId = await dockerRun(server, log);
  let stopped = false;
  let starting = true;
  const abort$ = new Rx.Subject<void>();

  // push the logs from the container to our logger, and expose an observable of those lines
  const logLine$ = observeContainerLogs(name, containerId, log);

  // ensure container stays running, report if it exits on its own; an abort during the start
  // takes the same exit so the container is stopped below
  let rejectOnExit: (error: Error) => void = () => {};
  const exited = new Promise<never>((_, reject) => {
    rejectOnExit = reject;
  });
  exited.catch(() => {}); // only observed while waiting for readiness below
  const onAbort = () => rejectOnExit(abortError(name));
  signal?.addEventListener('abort', onAbort, { once: true });
  if (signal?.aborted) {
    onAbort();
  }
  let exitDuringStart: Error | undefined;
  let runningSub: Rx.Subscription;
  let monitorRetries = 0;
  const watchContainer = () => {
    runningSub = observeContainerRunning(name, containerId, log).subscribe({
      complete: () => {
        // the `docker wait` child was ended by a signal: a shutdown usually follows within
        // milliseconds (a terminal Ctrl-C reaches the child first), so look again a moment later
        // and treat it as a lost monitor only if nothing is stopping the container by then
        setTimeout(() => {
          if (!stopped) {
            onMonitorEvent(new Error('the container monitor ended'));
          }
        }, MONITOR_RETRY_DELAY_MS).unref();
      },
      error: (error) => onMonitorEvent(error),
    });
  };
  const onMonitorEvent = async (error: Error) => {
    if (stopped) {
      return;
    }
    // `docker wait` failing is not the same as the container exiting: unless the daemon says
    // the container is gone, watch it again, backing off, and give up after a while.
    const running =
      error instanceof ContainerExitError ? false : await isDockerContainerRunning(containerId);
    if (stopped) {
      // stopped while the daemon was being asked: nothing to report either way
      return;
    }
    if (running !== false) {
      monitorRetries += 1;
      if (monitorRetries > MONITOR_RETRY_MAX_ATTEMPTS) {
        log.warning(
          `[docker:${name}] lost the container monitor ${MONITOR_RETRY_MAX_ATTEMPTS} times (${error.message}); an exit will no longer be reported`
        );
        return;
      }
      const delay = Math.min(
        MONITOR_RETRY_DELAY_MS * 2 ** (monitorRetries - 1),
        MONITOR_RETRY_MAX_DELAY_MS
      );
      log.warning(
        `[docker:${name}] lost the container monitor (${error.message}); watching again in ${
          delay / SECOND
        }s`
      );
      setTimeout(() => {
        if (!stopped) {
          watchContainer();
        }
      }, delay).unref();
      return;
    }
    log.error(`[docker:${name}] Error ensuring that the container is running`);
    log.error(error);
    if (starting) {
      // reported to the caller by the readiness race, or right after it settles
      exitDuringStart = error;
      rejectOnExit(error);
      return;
    }
    onUnexpectedExit?.(error);
  };
  watchContainer();

  let stopPromise: Promise<void> | undefined;
  const doStop = async () => {
    stopped = true;
    runningSub.unsubscribe();
    abort$.next();
    abort$.complete();

    log.info(`[docker:${name}] stopping container [id=${containerId}]`);
    try {
      await execa('docker', ['kill', containerId]);
    } catch (error) {
      ignoreGoneContainer(containerId, error);
      log.debug(`[docker:${name}] container was already stopped`);
    }
    // we don't remove the containers on CI because removing them causes the
    // network list to be updated and aborts all in-flight requests in Chrome.
    // Outside CI remove it even if it had already exited, so crashes leave nothing behind.
    if (!process.env.CI) {
      try {
        await execa('docker', ['rm', containerId]);
      } catch (error) {
        ignoreGoneContainer(containerId, error);
      }
    }

    // let the log stream drain so nothing is logged after shutdown, but never hang on it, and a
    // broken log stream is no reason to report a container that is already gone as "failed to stop"
    await Rx.lastValueFrom(
      Rx.race(
        logLine$.pipe(
          Rx.ignoreElements(),
          catchError(() => Rx.EMPTY)
        ),
        Rx.timer(LOG_DRAIN_TIMEOUT_MS)
      ),
      { defaultValue: undefined }
    );
    log.info(`[docker:${name}] container stopped`);
  };
  // concurrent and repeated callers all wait for the same kill, none returns early
  const stop = () => {
    stopPromise = stopPromise ?? doStop();
    return stopPromise;
  };

  try {
    // a container that dies before the readiness line fails here, not after the wait timeout;
    // `stop()` aborts the wait so its timers do not keep the process alive
    await Promise.race([waitUntilReady(server, logLine$, log, abort$), exited]);
    // an exit that landed just as the readiness race settled must not be lost between the two,
    // and neither must an abort that landed while `docker run` was in flight (with no readiness
    // check, the race above was already settled when it was built)
    if (exitDuringStart) {
      throw exitDuringStart;
    }
    if (signal?.aborted) {
      throw abortError(name);
    }
  } catch (error) {
    // the start failure is the one to report; a stop failure on top of it is logged
    await stop().catch((stopError) => {
      log.error(`[docker:${name}] failed to stop after a failed start: ${stopError?.message}`);
    });
    throw error;
  } finally {
    signal?.removeEventListener('abort', onAbort);
  }
  starting = false;

  log.info(`[docker:${name}] ready at ${server.url}`);

  return { name, url: server.url, containerId, logLine$, stop };
}
