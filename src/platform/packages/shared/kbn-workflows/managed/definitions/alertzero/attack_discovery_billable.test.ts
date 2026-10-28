/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  ALERTZERO_ACTION_HANDOFF_TO_FORENSICS_WORKFLOW_ID,
  ALERTZERO_ATTACK_DISCOVERY_ATTACH_WORKFLOW_ID,
  ALERTZERO_ATTACK_DISCOVERY_BATCHED_GENERATION_WORKFLOW_ID,
  ALERTZERO_ATTACK_DISCOVERY_FP_TP_ANALYSIS_WORKFLOW_ID,
  ALERTZERO_ATTACK_DISCOVERY_REVIEW_WORKFLOW_ID,
  ALERTZERO_ATTACK_DISCOVERY_WORKER_WORKFLOW_ID,
  ALERTZERO_CREATE_PROPOSAL_WORKFLOW_ID,
  ALERTZERO_JOURNAL_NOTE_WORKFLOW_ID,
  ALERTZERO_WORKER_FLOOR_ATTACK_DISCOVERY_WORKFLOW_ID,
} from '.';
import { managedWorkflowDefinitions } from '../..';
import {
  ATTACK_DISCOVERY_ALERT_RETRIEVAL_WORKFLOW_ID,
  ATTACK_DISCOVERY_GENERATION_WORKFLOW_ID,
  ATTACK_DISCOVERY_VALIDATE_WORKFLOW_ID,
} from '../discoveries';

// Metering reads the persisted `billable` flag. The billable list is the Attack Discovery
// worker chain plus the handoff action the review's proposal runs after approval. The
// unbilled list is the helpers and shared Attack Discovery workflows this change leaves
// out. Other workers own their own flags.
describe('Attack Discovery Worker: billable', () => {
  const billableIds = [
    ALERTZERO_WORKER_FLOOR_ATTACK_DISCOVERY_WORKFLOW_ID,
    ALERTZERO_ATTACK_DISCOVERY_WORKER_WORKFLOW_ID,
    ALERTZERO_ATTACK_DISCOVERY_BATCHED_GENERATION_WORKFLOW_ID,
    ALERTZERO_ATTACK_DISCOVERY_REVIEW_WORKFLOW_ID,
    ALERTZERO_ATTACK_DISCOVERY_FP_TP_ANALYSIS_WORKFLOW_ID,
    ALERTZERO_ATTACK_DISCOVERY_ATTACH_WORKFLOW_ID,
    ALERTZERO_ACTION_HANDOFF_TO_FORENSICS_WORKFLOW_ID,
  ];

  const unbilledIds = [
    ALERTZERO_JOURNAL_NOTE_WORKFLOW_ID,
    ALERTZERO_CREATE_PROPOSAL_WORKFLOW_ID,
    ATTACK_DISCOVERY_ALERT_RETRIEVAL_WORKFLOW_ID,
    ATTACK_DISCOVERY_GENERATION_WORKFLOW_ID,
    ATTACK_DISCOVERY_VALIDATE_WORKFLOW_ID,
  ];

  it.each(billableIds)('%s is billable', (id) => {
    const definition = managedWorkflowDefinitions.find((candidate) => candidate.id === id);

    expect(definition?.billable).toBe(true);
  });

  it.each(unbilledIds)('%s stays unbilled', (id) => {
    const definition = managedWorkflowDefinitions.find((candidate) => candidate.id === id);

    expect(definition?.billable).toBe(false);
  });
});
