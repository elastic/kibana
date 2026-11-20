/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ToolingLog } from '@kbn/tooling-log';
import { once } from 'lodash';
import { asError } from './as_error';
import type { Config } from './configs';
import { assertFleetPackageRegistry } from './configs/fleet_package_registry';
import type { StopDockerServers } from './run_docker_servers';
import { runDockerServers } from './run_docker_servers';
import { runElasticsearch } from './run_elasticsearch';

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
  /**
   * Stops whatever came up. A docker start still in progress is aborted (which stops its
   * containers) and an Elasticsearch start is waited for, so nothing is left behind. Runs once:
   * the signal hook, an early exit and the normal shutdown can all call it.
   */
  shutdown: () => Promise<void>;
}

/**
 * Starts the services Kibana depends on: the docker servers of the config (e.g. the Fleet
 * package registry) and Elasticsearch, together, since they do not depend on each other.
 */
export function startBackingServices({
  config,
  log,
  onEarlyExit,
  es,
}: StartBackingServicesOptions): BackingServices {
  const abortDockerStart = new AbortController();
  let dockerStartup: Promise<StopDockerServers> | undefined;
  let esStartup: Promise<() => Promise<void>> | undefined;
  let stopDockerServers: StopDockerServers | undefined;
  let shutdownEs: (() => Promise<void>) | undefined;

  // Runs synchronously up to its first `await`, so both startup handles exist by the time this
  // function returns and `shutdown` can always find them.
  const ready = (async () => {
    assertFleetPackageRegistry(log);
    dockerStartup = runDockerServers({
      config,
      log,
      onEarlyExit,
      signal: abortDockerStart.signal,
    }).then((stop) => {
      stopDockerServers = stop;
      return stop;
    });
    esStartup = runElasticsearch({ config, log, ...es, onEarlyExit }).then((shutdown) => {
      shutdownEs = once(shutdown);
      return shutdownEs;
    });
    await Promise.all([dockerStartup, esStartup]);
  })();

  const shutdown = once(async () => {
    abortDockerStart.abort();
    const errors: Error[] = [];
    const stop = async (fn?: () => Promise<void>) => {
      try {
        await fn?.();
      } catch (error) {
        errors.push(asError(error));
      }
    };
    // The docker servers first: they do not depend on Elasticsearch, and a container must not
    // outlive a slow Elasticsearch boot that a signal cannot cut short.
    await dockerStartup?.catch(() => {});
    await stop(stopDockerServers);
    await esStartup?.catch(() => {});
    await stop(shutdownEs);
    if (errors.length > 0) {
      throw errors[0];
    }
  });

  return { ready, shutdown };
}

export interface RunOutcomeInput {
  log: ToolingLog;
  /** A backing service exited on its own; reported ahead of whatever the teardown made fail. */
  earlyExitError?: Error;
  /** The signal hook fired: whatever the interrupted step threw is not a failure to report. */
  interrupted: boolean;
  interruptedMessage: string;
  /** What the start or the run threw, if anything. */
  runError?: Error;
  /** What the shutdown threw, if anything. */
  shutdownError?: Error;
}

/**
 * Decides what a server run reports once everything is stopped: the early exit, the interrupt
 * (exit code 130, as exit-hook uses once its hooks are done), the run's own error, or a shutdown
 * error. Throws for the failures; returns the outcome otherwise.
 */
export function resolveRunOutcome({
  log,
  earlyExitError,
  interrupted,
  interruptedMessage,
  runError,
  shutdownError,
}: RunOutcomeInput): 'ok' | 'interrupted' {
  if (shutdownError !== undefined && (earlyExitError !== undefined || runError !== undefined)) {
    log.error(`shutdown after a failed run also failed: ${shutdownError.message}`);
  }
  if (earlyExitError !== undefined) {
    throw earlyExitError;
  }
  if (interrupted || runError?.name === 'AbortError') {
    log.info(interruptedMessage);
    process.exitCode = SIGINT_EXIT_CODE;
    return 'interrupted';
  }
  if (runError !== undefined) {
    throw runError;
  }
  if (shutdownError !== undefined) {
    throw shutdownError;
  }
  return 'ok';
}
