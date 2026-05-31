/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import GITHUB_SYNC_ORCHESTRATOR_YAML from './github_sync_orchestrator.yaml';
import SETUP_INDICES_YAML from './setup_indices.yaml';
import type { ManagedWorkflowDefinition } from '../../types';

export const SDLC_SETUP_INDICES_WORKFLOW_ID = 'system-sdlc-setup-indices';
export const SDLC_GITHUB_SYNC_ORCHESTRATOR_WORKFLOW_ID = 'system-sdlc-github-sync-orchestrator';

const SDLC_WORKFLOW_MANAGEMENT = {
  lifecycle: 'static',
  versionStrategy: 'auto',
  enablement: 'enforced',
} as const;

export const SDLC_SETUP_INDICES_WORKFLOW = {
  id: SDLC_SETUP_INDICES_WORKFLOW_ID,
  pluginId: 'sdlcIntel',
  version: 2,
  yaml: SETUP_INDICES_YAML,
  management: SDLC_WORKFLOW_MANAGEMENT,
} as const satisfies ManagedWorkflowDefinition;

export const SDLC_GITHUB_SYNC_ORCHESTRATOR_WORKFLOW = {
  id: SDLC_GITHUB_SYNC_ORCHESTRATOR_WORKFLOW_ID,
  pluginId: 'sdlcIntel',
  version: 9,
  yaml: GITHUB_SYNC_ORCHESTRATOR_YAML,
  management: SDLC_WORKFLOW_MANAGEMENT,
} as const satisfies ManagedWorkflowDefinition;
