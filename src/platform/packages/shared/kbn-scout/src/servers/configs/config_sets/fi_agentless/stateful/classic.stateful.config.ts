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
import { fiAgentlessServerArgs } from '../shared';

/**
 * Scout server configuration for Fleet Identity Federation agentless tests (stateful / classic).
 *
 * Extends the default stateful config with:
 * - Fleet agentless + cloud_connectors feature flags (from fiAgentlessServerArgs)
 * - A synthetic cloud ID so the server treats itself as a cloud deployment, which
 *   is required for agentless setup technology to be presented as the default option.
 *
 * Tests use Playwright page.route() to mock API calls — no real agentless controller
 * or AWS account is contacted.
 */
export const servers: ScoutServerConfig = {
  ...defaultConfig,

  kbnTestServer: {
    ...defaultConfig.kbnTestServer,
    serverArgs: [
      ...defaultConfig.kbnTestServer.serverArgs,
      ...fiAgentlessServerArgs,

      // Synthetic cloud environment (required for agentless + cloud connectors in stateful mode)
      '--xpack.cloud.id=scout_fi_test:dXMtZWFzdC0xLmF3cy5lbGFzdGljLWNsb3VkLmNvbSQxMjM0NTY3ODkwYWJjZGVmMTIzNDU2Nzg5MGFiY2RlZiRhYmNkZWYxMjM0NTY3ODkwYWJjZGVmMTIzNDU2Nzg5MA==',
      '--xpack.cloud.base_url=https://cloud.elastic.co',
      '--xpack.cloud.deployment_url=/deployments/scout-fi-test',
    ],
  },
};
