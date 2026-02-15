/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutServerConfig } from '../../../../../types';
import { defaultConfig } from '../../default/stateful/base.config';

const defaultExporters = JSON.stringify([
  {
    http: {
      url: 'http://localhost:4318/v1/traces',
    },
  },
  {
    phoenix: {
      base_url: 'http://localhost:6006',
      public_url: 'http://localhost:6006',
      project_name: 'kibana-evals',
    },
  },
]);

// When TRACING_EXPORTERS is set (e.g. in CI), use it instead of the localhost defaults.
const { TRACING_EXPORTERS: tracingExporters } = process.env;
if (tracingExporters) {
  JSON.parse(tracingExporters); // validate parseable JSON; throws early if malformed
}
const exporters = tracingExporters ?? defaultExporters;

/**
 * Custom Scout stateful server configuration that enables OTLP trace exporting
 * from Kibana to a local OpenTelemetry collector (e.g. `node scripts/edot_collector.js`).
 *
 * Usage:
 *   node scripts/scout start-server --arch stateful --domain classic --serverConfigSet evals_tracing
 */
export const servers: ScoutServerConfig = {
  ...defaultConfig,
  kbnTestServer: {
    ...defaultConfig.kbnTestServer,
    env: {
      ...defaultConfig.kbnTestServer.env,
      KBN_OTEL_AUTO_INSTRUMENTATIONS: 'true',
    },
    serverArgs: [
      ...defaultConfig.kbnTestServer.serverArgs,

      '--telemetry.enabled=true',
      '--telemetry.tracing.enabled=true',
      '--telemetry.tracing.sample_rate=1',
      `--telemetry.tracing.exporters=${exporters}`,
    ],
  },
};
