/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import FEATURES_IDENTIFICATION_YAML from './features_identification.yaml';
import ONBOARDING_YAML from './onboarding.yaml';
import QUERIES_GENERATION_YAML from './queries_generation.yaml';
import SOURCE_RECONCILIATION_YAML from './source_reconciliation.yaml';
import type { ManagedWorkflowDefinition } from '../../../types';

export const SIGNIFICANT_EVENTS_KI_FEATURES_IDENTIFICATION_WORKFLOW_ID =
  'system-streams-ki-features-identification';
export const SIGNIFICANT_EVENTS_KI_QUERIES_GENERATION_WORKFLOW_ID =
  'system-streams-ki-queries-generation';
export const SIGNIFICANT_EVENTS_KI_ONBOARDING_WORKFLOW_ID = 'system-streams-ki-onboarding';

// lifecycle: 'static' — definition is fixed in code, not user-editable.
// versionStrategy: 'auto' — version bumps are handled automatically on install.
// enablement: 'enforced' — always enabled, cannot be disabled by the user.
const SIGNIFICANT_EVENTS_KI_WORKFLOW_MANAGEMENT = {
  lifecycle: 'static',
  versionStrategy: 'auto',
  enablement: 'enforced',
} as const;

export const SIGNIFICANT_EVENTS_KI_FEATURES_IDENTIFICATION_WORKFLOW = {
  id: SIGNIFICANT_EVENTS_KI_FEATURES_IDENTIFICATION_WORKFLOW_ID,
  pluginId: 'significantEvents',
  version: 6,
  billable: false,
  yaml: FEATURES_IDENTIFICATION_YAML,
  management: SIGNIFICANT_EVENTS_KI_WORKFLOW_MANAGEMENT,
} as const satisfies ManagedWorkflowDefinition;

export const SIGNIFICANT_EVENTS_KI_QUERIES_GENERATION_WORKFLOW = {
  id: SIGNIFICANT_EVENTS_KI_QUERIES_GENERATION_WORKFLOW_ID,
  pluginId: 'significantEvents',
  version: 4,
  billable: false,
  yaml: QUERIES_GENERATION_YAML,
  management: SIGNIFICANT_EVENTS_KI_WORKFLOW_MANAGEMENT,
} as const satisfies ManagedWorkflowDefinition;

export const SIGNIFICANT_EVENTS_KI_ONBOARDING_WORKFLOW = {
  id: SIGNIFICANT_EVENTS_KI_ONBOARDING_WORKFLOW_ID,
  pluginId: 'significantEvents',
  version: 10,
  billable: false,
  yaml: ONBOARDING_YAML,
  management: SIGNIFICANT_EVENTS_KI_WORKFLOW_MANAGEMENT,
} as const satisfies ManagedWorkflowDefinition;

/** Durable cleanup and onboarding scheduling after source catalog changes. */
export const SIGNIFICANT_EVENTS_SOURCE_RECONCILIATION_WORKFLOW_ID =
  'system-nightshift-source-reconciliation';

/** Queues source changes so a later edit cannot be dropped behind a running cleanup. */
export const SIGNIFICANT_EVENTS_SOURCE_RECONCILIATION_WORKFLOW = {
  id: SIGNIFICANT_EVENTS_SOURCE_RECONCILIATION_WORKFLOW_ID,
  pluginId: 'significantEvents',
  version: 1,
  billable: false,
  yaml: SOURCE_RECONCILIATION_YAML,
  management: SIGNIFICANT_EVENTS_KI_WORKFLOW_MANAGEMENT,
} as const satisfies ManagedWorkflowDefinition;
