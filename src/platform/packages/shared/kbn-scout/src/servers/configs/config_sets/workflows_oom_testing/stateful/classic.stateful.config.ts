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
 * Constrains Kibana to 1 GB old-space heap to catch memory regressions
 * in the workflow schema (connectors whitelist, Zod schema, YAML validation).
 *
 * Why 1024 MB and not lower:
 * - 768 MB: Kibana OOMs during boot (~760 MB baseline with 198 plugins)
 * - 896 MB: boots but heap doesn't settle below 85% after multiple schema
 *   materialisations, causing later tests to fail
 * - 1024 MB: tightest value where the full suite reliably passes while
 *   still catching significant schema-size regressions
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
      NODE_OPTIONS: [workflowsUiConfig.kbnTestServer.env?.NODE_OPTIONS, '--max-old-space-size=1024']
        .filter(Boolean)
        .join(' '),
    },
  },
};
