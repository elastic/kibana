/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import DASHBOARD_KIS_YAML from './dashboard_kis.yaml';
import type { ManagedWorkflowDefinition } from '../../types';

export const DASHBOARD_KNOWLEDGE_INDICATORS_WORKFLOW_ID = 'system-elastic-dashboard-kis';

export const DASHBOARD_KNOWLEDGE_INDICATORS_WORKFLOW = {
  id: DASHBOARD_KNOWLEDGE_INDICATORS_WORKFLOW_ID,
  pluginId: 'agentBuilderSml',
  version: 1,
  billable: false,
  yaml: DASHBOARD_KIS_YAML,
  // lifecycle: 'static' — definition is fixed in code, not user-editable.
  // versionStrategy: 'auto' — version bumps are handled automatically on install.
  // enablement: 'enforced' — always enabled, cannot be disabled by the user.
  management: {
    lifecycle: 'static',
    versionStrategy: 'auto',
    enablement: 'enforced',
  },
} as const satisfies ManagedWorkflowDefinition;
