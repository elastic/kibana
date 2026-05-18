/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import ALERT_VALIDATION_WORKFLOW_YAML from './security_solution_alert_validation_workflow.yaml';
import type { ManagedWorkflowDefinition } from '../types';

export const SECURITY_ALERT_VALIDATION_WORKFLOW_ID = 'system-security-alert-validation';

export const SECURITY_ALERT_VALIDATION_WORKFLOW: ManagedWorkflowDefinition = {
  id: SECURITY_ALERT_VALIDATION_WORKFLOW_ID,
  pluginId: 'securitySolution',
  version: 1,
  yaml: ALERT_VALIDATION_WORKFLOW_YAML,
  management: {
    lifecycle: 'static',
    versionStrategy: 'auto',
    enablement: 'enforced',
  },
};
