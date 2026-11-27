/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ProcRunner } from '@kbn/dev-proc-runner';
import type { ToolingLog } from '@kbn/tooling-log';
import { once } from 'lodash';
import { asError } from './as_error';
import type { Config } from './configs';
import { assertFleetPackageRegistry } from './configs/fleet_package_registry';
import type { StopDockerServers } from './run_docker_servers';
import { runDockerServers } from './run_docker_servers';
import { runElasticsearch } from './run_elasticsearch';
import { registerServerShutdown } from './server_shutdown';

/** Exit code of a run interrupted by SIGINT, the one exit-hook uses as well. */
export const SIGINT_EXIT_CODE = 130;

export interface StartBackingServicesOptions {
  config: Config;
  log: ToolingLog;
  /** Called when a docker server or Elasticsearch exits on its own after it came up. */
  onEarlyExit?: (msg: string) => void;
  es: {
    esFrom?: string;
    logsDir?: string;
    preserveEsData?: boolean;
  };
}

export interface BackingServices {
  /** Resolves once the docker servers and Elasticsearch are up; rejects when either fails. */
  ready: Promise<void>;
  /** Stops whatever came up, aborting or waiting for a start still in progress; runs once. */
  shutdown: () => Promise<void>;
}

/** Starts the docker servers of the config and Elasticsearch together; `shutdown` stops whatever came up, once. */
export function startBackingServices({
  config,
  log,
  onEarlyExit,
  es,
}: StartBackingServicesOptions): BackingServices {
  const abortDockerStart = new AbortController();
  let dockerStartup: Promise<StopDockerServers> | undefined;
  let esStartup: Promise<() => Promise<void>> | undefined;

  // Runs synchronously up to its first `await`, so both startup handles exist by the time this
  // function returns and `shutdown` can always find them.
  const ready = (async () => {
    assertFleetPackageRegistry(log);
    dockerStartup = runDockerServers({
      config,
      log,
      onEarlyExit,
      signal: abortDockerStart.signal,
    });
    esStartup = runElasticsearch({ config, log, ...es, onEarlyExit });
    await Promise.all([dockerStartup, esStartup]);
  })();

  const shutdown = once(async () => {
    // A docker start still in progress is aborted (which stops its containers) and an
    // Elasticsearch start is waited for; the two stops run side by side, they do not depend on
    // each other, and the docker one is not held back by a slow Elasticsearch boot.
    abortDockerStart.abort();
    const errors: Error[] = [];
    const stop = async (startup?: Promise<() => Promise<void>>) => {
      try {
        const stopFn = await startup?.catch(() => undefined);
        await stopFn?.();
      } catch (error) {
        errors.push(asError(error));
      }
    };
    await Promise.all([stop(dockerStartup), stop(esStartup)]);
    if (errors.length > 0) {
      throw errors[0];
    }
  });

  return { ready, shutdown };
}

export interface RunOutcomeInput {
  log: ToolingLog;
  /** The signal hook fired: whatever the interrupted steps threw or reported is not a failure. */
  interrupted: boolean;
  interruptedMessage: string;
  /** A backing service exited on its own; reported ahead of whatever the teardown made fail. */
  earlyExitError?: Error;
  /** What the start or the run threw, if anything. */
  runError?: Error;
  /** What the shutdown threw, if anything. */
  shutdownError?: Error;
}

/** Decides what a run reports once everything is stopped: throws for failures, else the outcome. */
export function resolveRunOutcome({
  log,
  interrupted,
  interruptedMessage,
  earlyExitError,
  runError,
  shutdownError,
}: RunOutcomeInput): 'ok' | 'interrupted' {
  // Precedence: the interrupt (a terminal Ctrl-C also reaches Elasticsearch and the docker
  // monitor, and the shutdown aborts a start in progress: those exits and aborts are
  // consequences), then an early exit (its teardown aborts the start too), then the run's own
  // error.
  if (interrupted) {
    if (runError !== undefined && runError.name !== 'AbortError') {
      // not the cause of the exit code, but not to be lost either (e.g. failing tests)
      log.error(`the run had failed before the interrupt: ${runError.message}`);
    }
    if (shutdownError !== undefined) {
      log.error(
        `shutdown after the interrupt failed, something may be left running: ${shutdownError.message}`
      );
    }
    log.info(interruptedMessage);
    process.exitCode = SIGINT_EXIT_CODE;
    return 'interrupted';
  }
  if (shutdownError !== undefined && (earlyExitError !== undefined || runError !== undefined)) {
    log.error(`shutdown after a failed run also failed: ${shutdownError.message}`);
  }
  if (earlyExitError !== undefined) {
    throw earlyExitError;
  }
  if (runError !== undefined) {
    throw runError;
  }
  if (shutdownError !== undefined) {
    throw shutdownError;
  }
  return 'ok';
}

export interface RunWithBackingServicesOptions
  extends Omit<StartBackingServicesOptions, 'onEarlyExit'> {
  procs: Pick<ProcRunner, 'teardown'>;
  interruptedMessage: string;
}

/** Runs `body` once the backing services are up and stops them after; returns 'interrupted' when a signal cut the run short, throws on failure. */
export async function runWithBackingServices(
  { config, log, procs, es, interruptedMessage }: RunWithBackingServicesOptions,
  body: (context: { onEarlyExit: (msg: string) => void }) => Promise<void>
): Promise<'ok' | 'interrupted'> {
  let backing: BackingServices | undefined;
  const shutdownBackingServices = () => backing?.shutdown() ?? Promise.resolve();

  // Registered before anything starts: a SIGINT/SIGTERM during the registry readiness wait or
  // the Elasticsearch boot must not leave a detached container holding its port. `interrupted`
  // is set as soon as the signal is handled, before any teardown, so the exits that teardown
  // causes are never mistaken for early exits.
  let interrupted = false;
  const removeShutdownHook = registerServerShutdown(procs, shutdownBackingServices, () => {
    interrupted = true;
  });

  // A backing service, or a server `body` started (Kibana), died on its own: Kibana would keep
  // serving against it. Tearing the managed processes down (SIGTERM, so a Playwright runner
  // still writes its reports) makes `body` return, and the one shutdown path below stops the
  // rest; that exit is reported rather than whatever the teardown makes fail next.
  // `ProcRunner.run()` never settles once a teardown is in progress, so a `body` waiting on
  // Kibana's boot or on the Playwright run would hang after that teardown: the early exit is
  // raced against both the start and the body instead, and the hung promise is left behind.
  let earlyExitError: Error | undefined;
  let rejectOnEarlyExit: (error: Error) => void = () => {};
  const earlyExit = new Promise<never>((_, reject) => {
    rejectOnEarlyExit = reject;
  });
  earlyExit.catch(() => {});
  const onEarlyExit = (msg: string) => {
    if (interrupted) {
      return;
    }
    log.error(msg);
    log.info('scout: a backing service exited; shutting the servers down');
    earlyExitError = earlyExitError ?? new Error(msg);
    process.exitCode = 1;
    rejectOnEarlyExit(earlyExitError);
    procs.teardown('SIGTERM').catch((error) => log.error(error));
  };

  let runError: Error | undefined;
  let started = false;
  try {
    backing = startBackingServices({ config, log, onEarlyExit, es });
    await Promise.race([backing.ready, earlyExit]);
    started = true;
    await Promise.race([body({ onEarlyExit }), earlyExit]);
  } catch (error) {
    runError = asError(error);
    if (!started && !interrupted && earlyExitError === undefined) {
      // say so now: the shutdown below may wait for an Elasticsearch boot to settle first
      log.error(`scout: start failed, shutting the servers down: ${runError.message}`);
    }
  }

  // Whatever failed, do not leave a detached container holding its port for the next run.
  const shutdownErrors: Error[] = [];
  await procs.teardown('SIGTERM').catch((error) => shutdownErrors.push(asError(error)));
  if (backing) {
    log.info('scout: shutting down backing services');
  }
  await shutdownBackingServices().catch((error) => shutdownErrors.push(asError(error)));
  removeShutdownHook();

  return resolveRunOutcome({
    log,
    interrupted,
    interruptedMessage,
    earlyExitError,
    runError,
    shutdownError: shutdownErrors[0],
  });
}
