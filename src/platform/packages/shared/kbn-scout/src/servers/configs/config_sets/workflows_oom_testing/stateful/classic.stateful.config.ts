/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutServerConfig } from '../../../../../types';
import { servers as workflowsUiConfig } from '../../workflows_ui/stateful/classic.stateful.config';

/**
 * Scout server configuration for Workflow Schema OOM prevention tests.
 * Constrains Kibana to 896 MB old-space heap to catch memory regressions
 * in the workflow schema (connectors whitelist, Zod schema, YAML validation).
 * Kibana's boot with all plugins loaded uses ~760 MB, leaving ~136 MB for
 * schema materialisation — tight enough to catch regressions but above the
 * boot baseline. (768 MB is too low: Kibana OOMs during startup.)
 *
 * Usage:
 *   node scripts/scout start-server --arch stateful --domain classic --serverConfigSet workflows_oom_testing
 */
export const servers: ScoutServerConfig = {
  ...workflowsUiConfig,
  esTestCluster: {
    ...workflowsUiConfig.esTestCluster,
    serverArgs: [...workflowsUiConfig.esTestCluster.serverArgs, 'xpack.ml.enabled=false'],
  },
  kbnTestServer: {
    ...workflowsUiConfig.kbnTestServer,
    env: {
      ...workflowsUiConfig.kbnTestServer.env,
      NODE_OPTIONS: [workflowsUiConfig.kbnTestServer.env?.NODE_OPTIONS, '--max-old-space-size=896']
        .filter(Boolean)
        .join(' '),
    },
  },
};
