/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Scout server config set for Detection Engine v2 API integration tests.
 *
 * Extends the `alerting_v2` defaults with the detection feature flag so routes
 * are registered at startup.  The suite tests the 503 off-state by flipping the
 * `alerting:v2:enabled` uiSettings entry at runtime; the 404 off-state (feature
 * flag disabled) cannot be tested without a separate Kibana boot.
 */

import type { ScoutServerConfig } from '../../../../../types';
import { defaultConfig } from '../../default/stateful/base.config';

export const servers: ScoutServerConfig = {
  ...defaultConfig,
  kbnTestServer: {
    ...defaultConfig.kbnTestServer,
    serverArgs: [
      ...defaultConfig.kbnTestServer.serverArgs,
      '--xpack.alerting_v2.enabled=true',
      // Relax the schedule guardrails so functional tests can run rules every few seconds.
      '--xpack.alerting_v2.rules.minimumScheduleInterval=5s',
      '--xpack.alerting_v2.rules.maxScheduledPerMinute=32000',
      // Enable the detection feature flag so routes are registered.
      '--xpack.securityDetections.enableDetectionsOnV2=true',
    ],
  },
};
