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
import { servers as workflowsUiConfig } from '../../workflows_ui/stateful/classic.stateful.config';

/**
 * Scout server configuration for Workflow Schema OOM prevention tests.
 * Constrains Kibana to 1 GB heap to catch memory regressions in the
 * workflow schema (connectors whitelist, Zod schema, YAML validation).
 *
 * Usage:
 *   node scripts/scout start-server --arch stateful --domain classic --serverConfigSet workflows_oom_testing
 */
export const servers: ScoutServerConfig = {
  ...workflowsUiConfig,
  esTestCluster: {
    ...defaultConfig.esTestCluster,
    serverArgs: [
      ...defaultConfig.esTestCluster.serverArgs,
      // ML native code can crash on certain macOS snapshot builds; disable it
      // since these tests only exercise Kibana workflow schema paths.
      'xpack.ml.enabled=false',
    ],
  },
  kbnTestServer: {
    ...workflowsUiConfig.kbnTestServer,
    env: {
      ...workflowsUiConfig.kbnTestServer.env,
      NODE_OPTIONS: '--max-old-space-size=1024',
    },
  },
};
