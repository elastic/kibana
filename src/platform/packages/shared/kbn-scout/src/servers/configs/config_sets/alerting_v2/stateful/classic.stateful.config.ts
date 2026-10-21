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

// Buffers server-side EBT events behind `/internal/analytics_ftr_helpers/events` so API tests
// can assert on the plugin's EBT events (for example `alerting_v2_workflow_dispatched`). A config
// set is server args, so those assertions are local-only: Cloud attaches to an existing deployment.
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
      '--xpack.alerting_v2.enabled=true',
      // Relax the schedule guardrails so functional tests can run rules every few seconds
      // without tripping the minimum-interval or per-minute limits.
      '--xpack.alerting_v2.rules.minimumScheduleInterval=5s',
      '--xpack.alerting_v2.rules.maxScheduledPerMinute=32000',
      '--xpack.alerting_v2.retention.alertActions.dispatcher.enabled=true',
      '--uiSettings.globalOverrides.alerting:v2:enabled=true',
      analyticsFtrHelpersPluginPath,
    ],
  },
};
