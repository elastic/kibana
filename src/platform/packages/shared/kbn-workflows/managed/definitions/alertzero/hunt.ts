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
import HUNT_YAML from './hunt.yaml';
import type { ManagedWorkflowDefinition } from '../../types';

export const ALERTZERO_HUNT_WORKFLOW_ID = 'system-security-hunt-execute';

/**
 * Untagged child invoked by PR 4's tagged Worker
 * (`hunt_continuous_threat_hunt.yaml`) via `workflow.execute`. Runs the
 * two-tier hunt coordinator for one report, stages the SSE attachment on a
 * confirmed hit, writes the hunt-results message, and writes the per-space
 * `evidence[]` element. Owns no trigger of its own, so enablement is
 * `enforced` (a disabled child would silently break its parent).
 */
export const ALERTZERO_HUNT_WORKFLOW = {
  billable: false,
  id: ALERTZERO_HUNT_WORKFLOW_ID,
  management: ALERTZERO_INTERNAL_WORKFLOW_MANAGEMENT,
  pluginId: ALERTZERO_MANAGED_WORKFLOW_PLUGIN_ID,
  version: 1,
  yaml: HUNT_YAML,
} as const satisfies ManagedWorkflowDefinition;
