/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  PND_MANAGED_WORKFLOW_PLUGIN_ID,
  PND_RULE_WORKFLOW_MANAGEMENT,
  PND_WORKER_VISIBILITY,
} from './constants';
import RULE_CREATION_YAML from './rule_creation.yaml';
import RULE_PREVIEW_YAML from './rule_preview.yaml';
import RULE_TUNING_YAML from './rule_tuning.yaml';
import type { ManagedWorkflowDefinition, ManagedWorkflowTemplateValues } from '../../types';

export const PND_RULE_PREVIEW_WORKFLOW_ID = 'system-security-rule-preview';
export const PND_RULE_TUNING_WORKFLOW_ID = 'system-security-rule-tuning';
export const PND_RULE_CREATION_WORKFLOW_ID = 'system-security-rule-creation';

export const PND_RULE_PREVIEW_WORKFLOW = {
  billable: false,
  id: PND_RULE_PREVIEW_WORKFLOW_ID,
  management: PND_RULE_WORKFLOW_MANAGEMENT,
  pluginId: PND_MANAGED_WORKFLOW_PLUGIN_ID,
  version: 5,
  visibility: PND_WORKER_VISIBILITY,
  yamlTemplate: (_values: ManagedWorkflowTemplateValues): string => RULE_PREVIEW_YAML,
} as const satisfies ManagedWorkflowDefinition;

export const PND_RULE_TUNING_WORKFLOW = {
  billable: false,
  id: PND_RULE_TUNING_WORKFLOW_ID,
  management: PND_RULE_WORKFLOW_MANAGEMENT,
  pluginId: PND_MANAGED_WORKFLOW_PLUGIN_ID,
  version: 9,
  visibility: PND_WORKER_VISIBILITY,
  yamlTemplate: (_values: ManagedWorkflowTemplateValues): string => RULE_TUNING_YAML,
} as const satisfies ManagedWorkflowDefinition;

export const PND_RULE_CREATION_WORKFLOW = {
  billable: false,
  id: PND_RULE_CREATION_WORKFLOW_ID,
  management: PND_RULE_WORKFLOW_MANAGEMENT,
  pluginId: PND_MANAGED_WORKFLOW_PLUGIN_ID,
  version: 7,
  visibility: PND_WORKER_VISIBILITY,
  yamlTemplate: (_values: ManagedWorkflowTemplateValues): string => RULE_CREATION_YAML,
} as const satisfies ManagedWorkflowDefinition;
