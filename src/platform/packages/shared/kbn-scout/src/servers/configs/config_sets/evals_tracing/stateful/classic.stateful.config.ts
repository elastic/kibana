/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License.
 * 2.0.
 */

import type { ScoutServerConfig } from '../../../../../types';
import { defaultConfig } from '../../default/stateful/base.config';
import { withEvalsTracing } from '../shared';

/**
 * Custom Scout stateful server configuration that enables OTLP trace exporting
 * from Kibana to a local OpenTelemetry collector (e.g. `node scripts/edot_collector.js`).
 *
 * Usage:
 *   node scripts/scout start-server --arch stateful --domain classic --serverConfigSet evals_tracing
 */
export const servers: ScoutServerConfig = withEvalsTracing(defaultConfig);
