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
import type { ScoutServerConfig } from '../../../../../types';
import { defaultConfig } from '../../default/stateful/base.config';

/**
 * Escape-hatch config set for alerting_v2 Scout suites that need server-start args
 * the default config cannot provide (every other suite runs on the default config).
 * Each namespace under `test/scout_alerting_v2_custom_config` shares this server:
 *   - `engine`  — `alert_actions_cleanup.spec.ts`
 *   - `rules`   — `ebt_telemetry.spec.ts` (api + ui)
 *
 *   node scripts/scout.js start-server --arch stateful --domain classic --serverConfigSet alerting_v2_custom_config
 */

// The `.alert-actions` cleanup task is only scheduled when this is set at startup; it
// cannot be toggled at runtime.
const DISPATCHER_CLEANUP_ENABLED =
  '--xpack.alerting_v2.retention.alertActions.dispatcher.enabled=true';

// Buffers server-side EBT events behind `/internal/analytics_ftr_helpers/events` so the
// rules tests can assert on rule-lifecycle EBT (`alerting_v2_rule_created` and the other
// `alerting_v2_rule_*` event types). Loaded as a server arg, so those assertions are
// local-only: Cloud attaches to an existing deployment.
const analyticsFtrHelpersPluginPath = `--plugin-path=${resolve(
  REPO_ROOT,
  'src/platform/test/analytics/plugins/analytics_ftr_helpers'
)}`;

export const servers: ScoutServerConfig = {
  ...defaultConfig,
  kbnTestServer: {
    ...defaultConfig.kbnTestServer,
    serverArgs: [
      ...defaultConfig.kbnTestServer.serverArgs,
      DISPATCHER_CLEANUP_ENABLED,
      analyticsFtrHelpersPluginPath,
    ],
  },
};
