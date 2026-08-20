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
import { servers as uiamConfig } from '../../uiam_local/serverless/security_essentials.serverless.config';
import type { ScoutServerConfig } from '../../../../../types';

// Same CPS local wiring as the `security_complete` variant, but on the `essentials`
// tier, which is NOT eligible for cross-project search.
//
// NOTE: Security serverless configs do not enable core pricing tiers, so we set
// `pricing.tiers.*` explicitly here to simulate what the control plane would provide
// for a real Security project. Without this, `isFeatureAvailable` returns true for all
// tiers (tiers disabled => available everywhere) and the tier gate is a no-op. Use this
// variant to verify tier-gated CPS UI (e.g. the project routing section) stays hidden.
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
      ...uiamConfig.kbnTestServer.serverArgs,
      '--cps.cpsEnabled=true',
      '--xpack.alerting.rules.apiKeyType=uiam',
      '--pricing.tiers.enabled=true',
      `--pricing.tiers.products=${JSON.stringify([
        { name: 'security', tier: 'essentials' },
        { name: 'endpoint', tier: 'essentials' },
        { name: 'cloud', tier: 'essentials' },
      ])}`,
    ],
  },
};
