/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import INVESTIGATION_WORKFLOW_YAML from './investigation_workflow.yaml';
import INVESTIGATION_HYP_WORKFLOW_YAML from './investigation_hyp_workflow.yaml';
import type { ManagedWorkflowDefinition } from '../../types';

export const STREAMS_INVESTIGATION_WORKFLOW_ID = 'system-streams-sigevents-investigation';

export const STREAMS_INVESTIGATION_WORKFLOW = {
  id: STREAMS_INVESTIGATION_WORKFLOW_ID,
  pluginId: 'streams',
  version: 4,
  yaml: INVESTIGATION_WORKFLOW_YAML,
  management: {
    lifecycle: 'static',
    versionStrategy: 'auto',
    enablement: 'restorable',
  },
} as const satisfies ManagedWorkflowDefinition;

export const STREAMS_INVESTIGATION_HYP_WORKFLOW_ID =
  'system-streams-sigevents-investigation-hyp';

export const STREAMS_INVESTIGATION_HYP_WORKFLOW = {
  id: STREAMS_INVESTIGATION_HYP_WORKFLOW_ID,
  pluginId: 'streams',
  version: 4,
  yaml: INVESTIGATION_HYP_WORKFLOW_YAML,
  management: {
    lifecycle: 'static',
    versionStrategy: 'auto',
    enablement: 'restorable',
  },
} as const satisfies ManagedWorkflowDefinition;
