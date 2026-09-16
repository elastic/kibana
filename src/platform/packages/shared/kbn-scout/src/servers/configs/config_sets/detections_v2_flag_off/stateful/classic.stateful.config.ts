/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Scout server config set for the Detection Engine v2 feature-flag-off integration test.
 *
 * Alerting v2 is enabled so the framework is live, but
 * `xpack.securityDetections.enableDetectionsOnV2` is intentionally absent,
 * so Kibana never registers the Detection Engine v2 routes.  Every request
 * to a `/api/detection_engine/v2/...` path lands on Kibana's "route not
 * found" handler and returns 404.
 *
 * The sibling `detections_v2` config set adds the flag and covers the flag-on
 * path.  This set covers only the 404 off-state that the flag-on suite cannot
 * verify without a separate server boot.
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
      // Relax schedule guardrails so the framework starts cleanly.
      '--xpack.alerting_v2.rules.minimumScheduleInterval=5s',
      '--xpack.alerting_v2.rules.maxScheduledPerMinute=32000',
      // enableDetectionsOnV2 is deliberately absent: no Detection routes are registered.
    ],
  },
};
