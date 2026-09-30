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
import FIND_OR_CREATE_INVESTIGATION_YAML from './find_or_create_investigation.yaml';
import type { ManagedWorkflowDefinition } from '../../types';

export const ALERTZERO_HUNT_FIND_OR_CREATE_INVESTIGATION_WORKFLOW_ID =
  'system-security-hunt-find-or-create-investigation';

/**
 * Untagged child invoked by Hunt Watch's tagged Worker
 * (`hunt_continuous_threat_hunt.yaml`) via `workflow.execute`. Calls the
 * `find_or_create_investigation` internal route via `kibana.request` (the
 * deterministic id it mints requires a uuidv5 hash Liquid cannot compute, and
 * the route reads the hidden `.kibana-threat-reports` index as the internal
 * user, so this cannot be a pure-YAML composition of generic
 * `ai.conversation.*` steps). Owns no trigger of its own, so enablement is
 * `enforced` (a disabled child would silently break its parent), matching
 * `hunt.yaml`.
 */
export const ALERTZERO_HUNT_FIND_OR_CREATE_INVESTIGATION_WORKFLOW = {
  billable: false,
  id: ALERTZERO_HUNT_FIND_OR_CREATE_INVESTIGATION_WORKFLOW_ID,
  management: ALERTZERO_INTERNAL_WORKFLOW_MANAGEMENT,
  pluginId: ALERTZERO_MANAGED_WORKFLOW_PLUGIN_ID,
  version: 1,
  yaml: FIND_OR_CREATE_INVESTIGATION_YAML,
} as const satisfies ManagedWorkflowDefinition;
