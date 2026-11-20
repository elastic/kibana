/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DockerServerSpec, RunningDockerServer } from '@kbn/test-docker-servers';
import { runDockerServer, toDockerServer } from '@kbn/test-docker-servers';
import type { ToolingLog } from '@kbn/tooling-log';
import type { Config } from './configs';
import {
  FLEET_PACKAGE_REGISTRY_PORT_ENV,
  SCOUT_FLEET_PACKAGE_REGISTRY_ENV,
  fleetPackageRegistry,
} from './configs/fleet_package_registry';

export type StopDockerServers = () => Promise<void>;

/**
 * Starts every enabled entry of the server config's `dockerServers` (e.g. the Fleet package
 * registry) and resolves once they are ready. Returns a function that stops them all; it is a
 * no-op when nothing is enabled, so callers can always await it on shutdown.
 */
export async function runDockerServers({
  config,
  log,
  onEarlyExit,
  signal,
}: {
  config: Config;
  log: ToolingLog;
  onEarlyExit?: (msg: string) => void;
  /** Aborting while the servers are starting stops them and rejects (see `runDockerServer`). */
  signal?: AbortSignal;
}): Promise<StopDockerServers> {
  const specs: Record<string, DockerServerSpec> = config.get('dockerServers') ?? {};
  const servers = Object.entries(specs)
    .filter(([, spec]) => spec.enabled)
    .map(([name, spec]) => toDockerServer(name, spec));

  if (servers.length === 0) {
    if (!fleetPackageRegistry.enabled && process.env[FLEET_PACKAGE_REGISTRY_PORT_ENV]) {
      // The port alone used to flip `dockerServers.registry.enabled`, although nothing started
      // the container. Say so, in case someone expects the registry from the port alone.
      log.info(
        `scout: ${FLEET_PACKAGE_REGISTRY_PORT_ENV} is set but ${SCOUT_FLEET_PACKAGE_REGISTRY_ENV} is not; ` +
          'the Fleet package registry container is not started and Kibana installs packages from the public EPR'
      );
    }
    return async () => {};
  }

  log.info(`scout: starting docker server(s): ${servers.map((s) => s.name).join(', ')}`);

  // One failed start aborts the others right away, instead of waiting for them to become ready
  // or time out; the caller's signal aborts them all the same way.
  const abortOthers = new AbortController();
  const onCallerAbort = () => abortOthers.abort();
  signal?.addEventListener('abort', onCallerAbort, { once: true });
  if (signal?.aborted) {
    abortOthers.abort();
  }

  const results = await Promise.allSettled(
    servers.map((server) =>
      runDockerServer(server, {
        log,
        signal: abortOthers.signal,
        onUnexpectedExit: (error) =>
          onEarlyExit?.(`[docker:${server.name}] container exited unexpectedly: ${error.message}`),
      }).catch((error) => {
        abortOthers.abort();
        throw error;
      })
    )
  );
  signal?.removeEventListener('abort', onCallerAbort);

  const running: RunningDockerServer[] = [];
  const failures: unknown[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled') {
      running.push(result.value);
    } else {
      failures.push(result.reason);
    }
  }

  const stop: StopDockerServers = async () => {
    if (running.length > 0) {
      log.info(`scout: stopping docker server(s): ${running.map((s) => s.name).join(', ')}`);
    }
    const stopResults = await Promise.allSettled(running.map((server) => server.stop()));
    const stopFailures = stopResults.flatMap((result, i) =>
      result.status === 'rejected' ? [{ name: running[i].name, reason: result.reason }] : []
    );
    for (const { name, reason } of stopFailures) {
      log.error(`[docker:${name}] failed to stop: ${reason?.message ?? reason}`);
    }
    if (stopFailures.length > 0) {
      throw stopFailures[0].reason;
    }
  };

  if (failures.length > 0) {
    // Stop errors are logged above; the startup failure is the one worth surfacing, and the
    // aborts it caused in the other servers are consequences, not the cause.
    await stop().catch(() => {});
    throw (
      failures.find((error) => (error as { name?: string })?.name !== 'AbortError') ?? failures[0]
    );
  }

  return stop;
}
