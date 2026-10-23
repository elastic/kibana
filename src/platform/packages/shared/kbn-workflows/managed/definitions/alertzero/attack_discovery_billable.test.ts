/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  ALERTZERO_ATTACK_DISCOVERY_BATCHED_GENERATION_WORKFLOW_ID,
  ALERTZERO_ATTACK_DISCOVERY_FP_TP_ANALYSIS_WORKFLOW_ID,
  ALERTZERO_ATTACK_DISCOVERY_REVIEW_WORKFLOW_ID,
  ALERTZERO_ATTACK_DISCOVERY_WORKER_WORKFLOW_ID,
  ALERTZERO_WORKER_FLOOR_ATTACK_DISCOVERY_WORKFLOW_ID,
} from '.';
import { managedWorkflowDefinitions } from '../..';

// Metering reads the persisted `billable` flag, so a regression here silently stops metering
// the Attack Discovery worker and the workflows it runs. Journal notes stay out of this list:
// `ALERTZERO_ATTACK_DISCOVERY_WORKFLOW_IDS` includes that shared helper.
describe('Attack Discovery Worker: billable', () => {
  const billableIds = [
    ALERTZERO_WORKER_FLOOR_ATTACK_DISCOVERY_WORKFLOW_ID,
    ALERTZERO_ATTACK_DISCOVERY_WORKER_WORKFLOW_ID,
    ALERTZERO_ATTACK_DISCOVERY_BATCHED_GENERATION_WORKFLOW_ID,
    ALERTZERO_ATTACK_DISCOVERY_REVIEW_WORKFLOW_ID,
    ALERTZERO_ATTACK_DISCOVERY_FP_TP_ANALYSIS_WORKFLOW_ID,
  ];

  it.each(billableIds)('%s is billable', (id) => {
    const definition = managedWorkflowDefinitions.find((candidate) => candidate.id === id);

    expect(definition?.billable).toBe(true);
  });
});
