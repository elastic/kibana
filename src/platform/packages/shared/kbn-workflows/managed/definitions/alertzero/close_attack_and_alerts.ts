/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  ALERTZERO_INTERNAL_WORKFLOW_MANAGEMENT,
  ALERTZERO_MANAGED_WORKFLOW_PLUGIN_ID,
} from './constants';
import type { ManagedWorkflowDefinition } from '../../types';
import { readManagedWorkflowYaml } from '../read_managed_workflow_yaml';

export const ALERTZERO_CLOSE_ATTACK_AND_ALERTS_WORKFLOW_ID =
  'system-alertzero-close-attack-and-alerts';

/**
 * Child-only helper: closes an Attack Discovery attack and the detection alerts it
 * lists with one reason, leaving out any alert another open attack also owns. The
 * Close Investigation action runs it via `workflow.execute` as the approving analyst.
 * Owns no trigger, so enablement is `enforced` like the journal-note child.
 */
export const ALERTZERO_CLOSE_ATTACK_AND_ALERTS_WORKFLOW = {
  billable: false,
  id: ALERTZERO_CLOSE_ATTACK_AND_ALERTS_WORKFLOW_ID,
  management: ALERTZERO_INTERNAL_WORKFLOW_MANAGEMENT,
  pluginId: ALERTZERO_MANAGED_WORKFLOW_PLUGIN_ID,
  version: 1,
  get yaml() {
    return readManagedWorkflowYaml(__dirname, 'close_attack_and_alerts.yaml');
  },
} as const satisfies ManagedWorkflowDefinition;
