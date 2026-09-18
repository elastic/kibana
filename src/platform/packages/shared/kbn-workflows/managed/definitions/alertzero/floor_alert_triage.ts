/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ALERTZERO_MANAGED_WORKFLOW_PLUGIN_ID, ALERTZERO_WORKER_MANAGEMENT } from './constants';
import FLOOR_ALERT_TRIAGE_YAML from './floor_alert_triage.yaml';
import { type CommonWorkerTemplateValues, renderCommonWorkerYaml } from './worker_template_values';
import type { ManagedWorkflowDefinition } from '../../types';

export const ALERTZERO_WORKER_FLOOR_ALERT_TRIAGE_WORKFLOW_ID = 'system-security-floor-alert-triage';

export const ALERTZERO_WORKER_FLOOR_ALERT_TRIAGE_WORKFLOW = {
  billable: false,
  id: ALERTZERO_WORKER_FLOOR_ALERT_TRIAGE_WORKFLOW_ID,
  management: ALERTZERO_WORKER_MANAGEMENT,
  pluginId: ALERTZERO_MANAGED_WORKFLOW_PLUGIN_ID,
  version: 1,
  yamlTemplate: (values: CommonWorkerTemplateValues): string =>
    renderCommonWorkerYaml(FLOOR_ALERT_TRIAGE_YAML, values),
} as const satisfies ManagedWorkflowDefinition<CommonWorkerTemplateValues>;
