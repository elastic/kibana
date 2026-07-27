/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import MEMORY_CONSOLIDATION_YAML from './memory_consolidation.yaml';
import type { ManagedWorkflowDefinition } from '../../../types';

export const SIGNIFICANT_EVENTS_MEMORY_CONSOLIDATION_WORKFLOW_ID =
  'system-significant-events-memory-consolidation';

export const SIGNIFICANT_EVENTS_MEMORY_CONSOLIDATION_WORKFLOW = {
  id: SIGNIFICANT_EVENTS_MEMORY_CONSOLIDATION_WORKFLOW_ID,
  pluginId: 'significant_events',
  version: 4,
  billable: false,
  yaml: MEMORY_CONSOLIDATION_YAML,
  management: {
    lifecycle: 'static',
    versionStrategy: 'auto',
    enablement: 'restorable',
  },
} as const satisfies ManagedWorkflowDefinition;
