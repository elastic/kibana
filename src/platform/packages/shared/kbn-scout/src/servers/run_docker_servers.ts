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
}: {
  config: Config;
  log: ToolingLog;
  onEarlyExit?: (msg: string) => void;
}): Promise<StopDockerServers> {
  const specs: Record<string, DockerServerSpec> = config.get('dockerServers') ?? {};
  const servers = Object.entries(specs)
    .filter(([, spec]) => spec.enabled)
    .map(([name, spec]) => toDockerServer(name, spec));

  if (servers.length === 0) {
    return async () => {};
  }

  log.info(`scout: starting docker server(s): ${servers.map((s) => s.name).join(', ')}`);

  const results = await Promise.allSettled(
    servers.map((server) =>
      runDockerServer(server, {
        log,
        onUnexpectedExit: (error) =>
          onEarlyExit?.(`[docker:${server.name}] container exited unexpectedly: ${error.message}`),
      })
    )
  );

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
    await Promise.all(running.map((server) => server.stop()));
  };

  if (failures.length > 0) {
    await stop();
    throw failures[0];
  }

  return stop;
}
