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
import CORRELATION_YAML from './correlation.yaml';
import type { ManagedWorkflowDefinition } from '../../types';

export const ALERTZERO_CORRELATION_WORKFLOW_ID = 'system-security-hunt-correlation';

/**
 * Untagged child invoked by PR 4's tagged Worker
 * (`hunt_continuous_threat_hunt.yaml`) via `workflow.execute`, after the hunt
 * child. Runs the anchors correlation engine against this report's own
 * extracted anchors and writes exactly one message to the Investigation.
 * Owns no trigger of its own, so enablement is `enforced` (a disabled child
 * would silently break its parent).
 */
export const ALERTZERO_CORRELATION_WORKFLOW = {
  billable: false,
  id: ALERTZERO_CORRELATION_WORKFLOW_ID,
  management: ALERTZERO_INTERNAL_WORKFLOW_MANAGEMENT,
  pluginId: ALERTZERO_MANAGED_WORKFLOW_PLUGIN_ID,
  version: 1,
  yaml: CORRELATION_YAML,
} as const satisfies ManagedWorkflowDefinition;
