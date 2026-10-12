/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  ALERTZERO_MANAGED_WORKFLOW_PLUGIN_ID,
  ALERTZERO_RULE_WORKFLOW_MANAGEMENT,
} from './constants';
import INVESTIGATION_SUMMARY_YAML from './investigation_summary.yaml';
import type { ManagedWorkflowDefinition } from '../../types';

export const ALERTZERO_INVESTIGATION_SUMMARY_WORKFLOW_ID = 'system-alertzero-investigation-summary';

/**
 * Global, shipped disabled. Enable it to refresh investigation card text from the
 * timeline. Restorable so an operator's enabled state survives an upgrade.
 */
export const ALERTZERO_INVESTIGATION_SUMMARY_WORKFLOW = {
  billable: false,
  id: ALERTZERO_INVESTIGATION_SUMMARY_WORKFLOW_ID,
  management: ALERTZERO_RULE_WORKFLOW_MANAGEMENT,
  pluginId: ALERTZERO_MANAGED_WORKFLOW_PLUGIN_ID,
  version: 1,
  yaml: INVESTIGATION_SUMMARY_YAML,
} as const satisfies ManagedWorkflowDefinition;
