/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import HUNT_MANUAL_SESSION_YAML from './hunt_manual_session.yaml';
import type { ManagedWorkflowDefinition } from '../../../types';
import {
  ALERTZERO_INTERNAL_WORKFLOW_MANAGEMENT,
  ALERTZERO_MANAGED_WORKFLOW_PLUGIN_ID,
} from '../constants';

export const ALERTZERO_HUNT_MANUAL_SESSION_WORKFLOW_ID = 'system-security-hunt-manual-session';

/**
 * Hunt Library history record for one analyst session. Started in-process by AlertZero with a
 * server-derived execution id and indexed labels, and finishes immediately; Discover work is never
 * stored on it. Untagged and not billable: it runs no query and calls no model.
 */
export const ALERTZERO_HUNT_MANUAL_SESSION_WORKFLOW = {
  billable: false,
  id: ALERTZERO_HUNT_MANUAL_SESSION_WORKFLOW_ID,
  management: ALERTZERO_INTERNAL_WORKFLOW_MANAGEMENT,
  pluginId: ALERTZERO_MANAGED_WORKFLOW_PLUGIN_ID,
  version: 1,
  yaml: HUNT_MANUAL_SESSION_YAML,
} as const satisfies ManagedWorkflowDefinition;
