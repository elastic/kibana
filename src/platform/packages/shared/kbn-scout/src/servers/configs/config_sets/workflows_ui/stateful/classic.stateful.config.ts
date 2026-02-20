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

/**
 * Custom Scout server configuration for Workflows Management UI tests.
 * Enables the workflows:ui:enabled feature flag.
 *
 * This config is automatically used when running tests from:
 * workflows_management/test/scout_workflows_ui/
 */
export const servers: ScoutServerConfig = {
  ...defaultConfig,
  kbnTestServer: {
    ...defaultConfig.kbnTestServer,
    serverArgs: [
      ...defaultConfig.kbnTestServer.serverArgs,
      '--uiSettings.overrides.workflows:ui:enabled=true',
      // Allow short alert rule intervals for alert trigger tests (default minimum is 1m)
      '--xpack.alerting.rules.minimumScheduleInterval.value=15s',
    ],
  },
};
