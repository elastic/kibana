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
import {
  renderRunQuotaGate,
  type SignificantEventsRunQuotaTemplateValues,
} from '../run_quota_gate';

export const SIGNIFICANT_EVENTS_MEMORY_CONSOLIDATION_WORKFLOW_ID =
  'system-significant-events-memory-consolidation';

// Templated because it carries the daily run-quota gate. All four memory
// workflows share the `memory` budget, so all four are reinstalled when it changes.
export const SIGNIFICANT_EVENTS_MEMORY_CONSOLIDATION_WORKFLOW = {
  id: SIGNIFICANT_EVENTS_MEMORY_CONSOLIDATION_WORKFLOW_ID,
  pluginId: 'significantEvents',
  version: 5,
  billable: false,
  yamlTemplate: (values) => renderRunQuotaGate(MEMORY_CONSOLIDATION_YAML, values),
  management: {
    lifecycle: 'static',
    versionStrategy: 'auto',
    enablement: 'restorable',
  },
} as const satisfies ManagedWorkflowDefinition<SignificantEventsRunQuotaTemplateValues>;
