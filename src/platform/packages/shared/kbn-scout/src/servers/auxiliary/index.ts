/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Server } from 'http';
import type { ToolingLog } from '@kbn/tooling-log';
import type { AuxiliaryServerConfig } from '../../types/server_config';

interface RunningAuxiliaryServer {
  config: AuxiliaryServerConfig;
  server: Server;
}

const runningServers: RunningAuxiliaryServer[] = [];

/**
 * Wait for an auxiliary server to become ready by checking if it's listening.
 */
async function waitForServerReady(
  serverName: string,
  port: number,
  timeout: number,
  log: ToolingLog
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      // Simple check: server is ready if it's listening
      await new Promise((resolve) => setTimeout(resolve, 100));
      log.debug(`[${serverName}] Server appears to be listening on port ${port}`);
      return;
    } catch (err) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  throw new Error(`[${serverName}] Server did not become ready within ${timeout}ms`);
}

/**
 * Start all configured auxiliary servers and return a cleanup function.
 *
 * @param configs - Array of auxiliary server configurations
 * @param log - Logger instance
 * @returns Cleanup function that stops all servers
 */
export async function startAuxiliaryServers(
  configs: AuxiliaryServerConfig[],
  log: ToolingLog
): Promise<() => Promise<void>> {
  if (!configs || configs.length === 0) {
    return async () => {}; // No-op cleanup
  }

  log.info(`Starting ${configs.length} auxiliary server(s)...`);

  for (const config of configs) {
    log.info(`[${config.name}] Starting on port ${config.port}...`);

    try {
      // Delegate ALL startup logic to the config
      const server = await config.startServer(log);

      // Wait for server to be ready
      await waitForServerReady(config.name, config.port, config.startTimeout || 10000, log);

      runningServers.push({ config, server });
    } catch (err) {
      log.error(`[${config.name}] Failed to start auxiliary server: ${err}`);
      throw err;
    }
  }

  // Return cleanup function
  return async () => {
    if (runningServers.length === 0) {
      return;
    }

    log.info('Stopping auxiliary servers...');

    for (const { config, server } of runningServers) {
      try {
        await new Promise<void>((resolve) => {
          server.close(() => {
            log.success(`[${config.name}] Stopped successfully`);
            resolve();
          });
        });
      } catch (err) {
        log.warning(`[${config.name}] Error during shutdown:`, err);
      }
    }

    runningServers.length = 0;
  };
}
