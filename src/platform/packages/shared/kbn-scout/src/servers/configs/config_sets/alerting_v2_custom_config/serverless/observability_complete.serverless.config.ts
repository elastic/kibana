/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { resolve } from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import { servers as defaultConfig } from '../../default/serverless/observability_complete.serverless.config';
import type { ScoutServerConfig } from '../../../../../types';

/**
 * Serverless variant of the alerting_v2 escape-hatch config set. Only the `rules`
 * EBT telemetry suite runs here (`@local-serverless-observability_complete`); the
 * cleanup suite is stateful-classic only, so this variant omits the dispatcher arg.
 */

// Buffers server-side EBT events behind `/internal/analytics_ftr_helpers/events` so the
// rules tests can assert on rule-lifecycle EBT. Loaded as a server arg, so those
// assertions are local-only: Cloud attaches to an existing deployment.
const analyticsFtrHelpersPluginPath = `--plugin-path=${resolve(
  REPO_ROOT,
  'src/platform/test/analytics/plugins/analytics_ftr_helpers'
)}`;

export const servers: ScoutServerConfig = {
  ...defaultConfig,
  kbnTestServer: {
    ...defaultConfig.kbnTestServer,
    serverArgs: [...defaultConfig.kbnTestServer.serverArgs, analyticsFtrHelpersPluginPath],
  },
};
