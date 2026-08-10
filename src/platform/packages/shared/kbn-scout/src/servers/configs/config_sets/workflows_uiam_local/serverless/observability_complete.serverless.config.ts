/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutServerConfig } from '../../../../../types';
import { servers as workflowsConfig } from '../../workflows_ui/serverless/observability_complete.serverless.config';

/**
 * Enables Workflows together with Task Manager's UIAM API key strategy.
 *
 * This config is automatically used by tests under
 * workflows_management/test/scout_workflows_uiam_local/.
 */
export const servers: ScoutServerConfig = {
  ...workflowsConfig,
  kbnTestServer: {
    ...workflowsConfig.kbnTestServer,
    serverArgs: [
      ...workflowsConfig.kbnTestServer.serverArgs,
      '--xpack.task_manager.grant_uiam_api_keys=true',
      '--feature_flags.overrides.taskManager.provisionUiamApiKeys=true',
    ],
  },
};
