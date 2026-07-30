/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import INVESTIGATION_WORKFLOW_YAML from './investigation_workflow.yaml';
import type { ManagedWorkflowDefinition } from '../../../types';
import {
  renderRunQuotaGate,
  type SignificantEventsRunQuotaTemplateValues,
} from '../run_quota_gate';

export const SIGNIFICANT_EVENTS_INVESTIGATION_WORKFLOW_ID =
  'system-significant-events-investigation';

// Templated because it carries the daily run-quota gate: the limit has to be
// baked in at install time, so the significant_events plugin reinstalls this
// workflow whenever the investigation budget changes.
export const SIGNIFICANT_EVENTS_INVESTIGATION_WORKFLOW = {
  id: SIGNIFICANT_EVENTS_INVESTIGATION_WORKFLOW_ID,
  pluginId: 'significantEvents',
  version: 5,
  billable: false,
  yamlTemplate: (values) => renderRunQuotaGate(INVESTIGATION_WORKFLOW_YAML, values),
  management: {
    lifecycle: 'static',
    versionStrategy: 'auto',
    enablement: 'restorable',
  },
} as const satisfies ManagedWorkflowDefinition<SignificantEventsRunQuotaTemplateValues>;
