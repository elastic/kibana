/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutServerConfig } from '../../../../../types';
import { defaultConfig } from '../../../default/stateful/base.config';

/**
 * Custom Scout stateful server configuration that enables OTLP trace exporting
 * from Kibana to a local OpenTelemetry collector (e.g. `node scripts/edot_collector.js`).
 *
 * Usage:
 *   node scripts/scout.js start-server --stateful --config-dir evals_tracing
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

      // Enable Kibana OpenTelemetry tracing and export to the local EDOT collector
      '--telemetry.enabled=true',
      '--telemetry.tracing.enabled=true',
      '--telemetry.tracing.sample_rate=1',
      `--telemetry.tracing.exporters=${JSON.stringify([
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
      ])}`,
    ],
  },
};
