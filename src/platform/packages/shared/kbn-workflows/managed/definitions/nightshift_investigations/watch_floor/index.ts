/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import WATCH_FLOOR_WORKFLOW_YAML from './watch_floor.yaml';
import type { ManagedWorkflowDefinition } from '../../../types';

export const NIGHTSHIFT_AUTOMATION_FLOOR_WORKFLOW_ID = 'system-nightshift-automation-floor';

export const NIGHTSHIFT_AUTOMATION_FLOOR_WORKFLOW = {
  id: NIGHTSHIFT_AUTOMATION_FLOOR_WORKFLOW_ID,
  pluginId: 'nightshiftInvestigations',
  version: 1,
  billable: false,
  yaml: WATCH_FLOOR_WORKFLOW_YAML,
  management: {
    lifecycle: 'static',
    versionStrategy: 'auto',
    enablement: 'restorable',
  },
} as const satisfies ManagedWorkflowDefinition;
