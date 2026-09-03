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
import WATCH_DETECTION_YAML from './watch_detection.yaml';
import type { ManagedWorkflowDefinition, ManagedWorkflowTemplateValues } from '../../types';

export const PND_WATCH_DETECTION_WORKFLOW_ID = 'system-security-watch-detection';

export const PND_WATCH_DETECTION_WORKFLOW = {
  billable: false,
  id: PND_WATCH_DETECTION_WORKFLOW_ID,
  management: PND_RULE_WORKFLOW_MANAGEMENT,
  pluginId: PND_MANAGED_WORKFLOW_PLUGIN_ID,
  version: 8,
  visibility: PND_WORKER_VISIBILITY,
  yamlTemplate: (_values: ManagedWorkflowTemplateValues): string => WATCH_DETECTION_YAML,
} as const satisfies ManagedWorkflowDefinition;
