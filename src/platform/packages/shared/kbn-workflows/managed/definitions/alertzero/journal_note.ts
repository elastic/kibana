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
import JOURNAL_NOTE_YAML from './journal_note.yaml';
import type { ManagedWorkflowDefinition } from '../../types';

export const ALERTZERO_JOURNAL_NOTE_WORKFLOW_ID = 'system-alertzero-journal-note';

/**
 * Child-only helper: persist a `user_message` on an Investigation without running
 * the agent. Review and the forensics handoff invoke it via `workflow.execute`.
 *
 * Individual journal steps ride with whichever slice owns the step around them.
 */
export const ALERTZERO_JOURNAL_NOTE_WORKFLOW = {
  billable: false,
  id: ALERTZERO_JOURNAL_NOTE_WORKFLOW_ID,
  management: ALERTZERO_INTERNAL_WORKFLOW_MANAGEMENT,
  pluginId: ALERTZERO_MANAGED_WORKFLOW_PLUGIN_ID,
  version: 1,
  yaml: JOURNAL_NOTE_YAML,
} as const satisfies ManagedWorkflowDefinition;
