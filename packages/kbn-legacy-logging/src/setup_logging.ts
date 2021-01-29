/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

// @ts-expect-error missing typedef
import { plugin as good } from '@elastic/good';
import { Server } from '@hapi/hapi';
import { LegacyLoggingConfig } from './schema';
import { getLoggingConfiguration } from './get_logging_config';

export async function setupLogging(
  server: Server,
  config: LegacyLoggingConfig,
  opsInterval: number
) {
  // NOTE: legacy logger creates a new stream for each new access
  // In https://github.com/elastic/kibana/pull/55937 we reach the max listeners
  // default limit of 10 for process.stdout which starts a long warning/error
  // thrown every time we start the server.
  // In order to keep using the legacy logger until we remove it I'm just adding
  // a new hard limit here.
  process.stdout.setMaxListeners(40);

  return await server.register({
    plugin: good,
    options: getLoggingConfiguration(config, opsInterval),
  });
}

export function reconfigureLogging(
  server: Server,
  config: LegacyLoggingConfig,
  opsInterval: number
) {
  const loggingOptions = getLoggingConfiguration(config, opsInterval);
  (server.plugins as any)['@elastic/good'].reconfigure(loggingOptions);
}
