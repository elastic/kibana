/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  ELASTIC_SERVERLESS_SUPERUSER,
  ELASTIC_SERVERLESS_SUPERUSER_PASSWORD,
  LINKED_CLUSTER_PORT_OFFSET,
} from '@kbn/es';
import { servers as uiamConfig } from '../../uiam_local/serverless/observability_logs_essentials.serverless.config';
import type { ScoutServerConfig } from '../../../../../types';
import { withoutSecurityTestEndpoints } from './utils';

// Same CPS local wiring as the `observability_complete` variant, but on the
// `logs_essentials` tier, which is NOT eligible for cross-project search. Use
// this to verify tier-gated CPS UI (e.g. the project routing section) stays hidden.
export const servers: ScoutServerConfig = {
  ...uiamConfig,
  servers: {
    ...uiamConfig.servers,
    linkedElasticsearch: {
      ...uiamConfig.servers.elasticsearch,
      port: (uiamConfig.servers.elasticsearch.port as number) + LINKED_CLUSTER_PORT_OFFSET,
      username: ELASTIC_SERVERLESS_SUPERUSER,
      password: ELASTIC_SERVERLESS_SUPERUSER_PASSWORD,
    },
  },
  esServerlessOptions: {
    uiam: true,
    cps: true,
  },
  kbnTestServer: {
    ...uiamConfig.kbnTestServer,
    serverArgs: [
      ...withoutSecurityTestEndpoints(uiamConfig.kbnTestServer.serverArgs),
      '--cps.cpsEnabled=true',
      '--xpack.alerting.rules.apiKeyType=uiam',
    ],
  },
};
