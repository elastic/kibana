/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ManagedWorkflowDefinition } from '../../../types';
import { readManagedWorkflowYaml } from '../../read_managed_workflow_yaml';

// Static and restorable: an action owns no trigger, and a space that disabled one keeps it off.
const CONTEXT_ENGINE_ACTION_WORKFLOW_MANAGEMENT = {
  enablement: 'restorable',
  lifecycle: 'static',
  versionStrategy: 'auto',
} as const;

export const CONTEXT_ENGINE_ACTION_ADD_KI_WORKFLOW_ID = 'system-context-engine-action-add-ki';

export const CONTEXT_ENGINE_ACTION_ADD_KI_WORKFLOW = {
  billable: false,
  id: CONTEXT_ENGINE_ACTION_ADD_KI_WORKFLOW_ID,
  management: CONTEXT_ENGINE_ACTION_WORKFLOW_MANAGEMENT,
  pluginId: 'contextEngine',
  version: 2,
  get yaml() {
    return readManagedWorkflowYaml(__dirname, 'action_add_ki.yaml');
  },
} as const satisfies ManagedWorkflowDefinition;

export const CONTEXT_ENGINE_ACTION_EDIT_KI_WORKFLOW_ID = 'system-context-engine-action-edit-ki';

export const CONTEXT_ENGINE_ACTION_EDIT_KI_WORKFLOW = {
  billable: false,
  id: CONTEXT_ENGINE_ACTION_EDIT_KI_WORKFLOW_ID,
  management: CONTEXT_ENGINE_ACTION_WORKFLOW_MANAGEMENT,
  pluginId: 'contextEngine',
  version: 2,
  get yaml() {
    return readManagedWorkflowYaml(__dirname, 'action_edit_ki.yaml');
  },
} as const satisfies ManagedWorkflowDefinition;

export const CONTEXT_ENGINE_ACTION_REMOVE_KI_WORKFLOW_ID = 'system-context-engine-action-remove-ki';

export const CONTEXT_ENGINE_ACTION_REMOVE_KI_WORKFLOW = {
  billable: false,
  id: CONTEXT_ENGINE_ACTION_REMOVE_KI_WORKFLOW_ID,
  management: CONTEXT_ENGINE_ACTION_WORKFLOW_MANAGEMENT,
  pluginId: 'contextEngine',
  version: 2,
  get yaml() {
    return readManagedWorkflowYaml(__dirname, 'action_remove_ki.yaml');
  },
} as const satisfies ManagedWorkflowDefinition;
