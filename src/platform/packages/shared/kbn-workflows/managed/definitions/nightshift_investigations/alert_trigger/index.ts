/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import ALERT_TRIGGER_WORKFLOW_YAML from './alert_trigger_workflow.yaml';
import type { ManagedWorkflowDefinition } from '../../../types';

export const NIGHTSHIFT_INVESTIGATION_ALERT_TRIGGER_WORKFLOW_ID =
  'system-nightshift-investigation-alert-trigger';

/**
 * Opt-in v1 rule action that starts a Nightshift investigation for each firing
 * alert. `selectors: ['rule_action']` is what makes it appear in the rule-action
 * picker; it does not auto-run on every alert in the space.
 *
 * `enablement: 'restorable'` so a noisy space can disable it without an uninstall.
 */
export const NIGHTSHIFT_INVESTIGATION_ALERT_TRIGGER_WORKFLOW = {
  id: NIGHTSHIFT_INVESTIGATION_ALERT_TRIGGER_WORKFLOW_ID,
  pluginId: 'nightshiftInvestigations',
  version: 1,
  billable: false,
  visibility: {
    selectors: ['rule_action'],
  },
  yaml: ALERT_TRIGGER_WORKFLOW_YAML,
  management: {
    lifecycle: 'static',
    versionStrategy: 'auto',
    enablement: 'restorable',
  },
} as const satisfies ManagedWorkflowDefinition;
