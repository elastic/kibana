/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutServerConfig } from '../../../../../types';
import { servers as alertingV2Config } from '../../alerting_v2/stateful/classic.stateful.config';

/**
 * Identical to the `alerting_v2` config set, but switches the ES|QL response
 * format to Arrow. The default (`json`) is covered by the `scout_alerting_v2` suite.
 */
export const servers: ScoutServerConfig = {
  ...alertingV2Config,
  kbnTestServer: {
    ...alertingV2Config.kbnTestServer,
    serverArgs: [
      ...alertingV2Config.kbnTestServer.serverArgs,
      '--xpack.alerting_v2.esql.responseFormat=arrow',
    ],
  },
};
