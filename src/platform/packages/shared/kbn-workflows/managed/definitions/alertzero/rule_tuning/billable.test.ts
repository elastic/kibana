/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  ALERTZERO_RULE_PREVIEW_WORKFLOW_ID,
  ALERTZERO_RULE_TUNING_CHILD_WORKFLOW_IDS,
  ALERTZERO_WORKER_DETECTION_RULE_TUNING_WORKFLOW_ID,
} from '..';
import { managedWorkflowDefinitions } from '../../..';

// Metering reads the persisted `billable` flag, so a regression here silently stops metering
// the Rule Tuning Worker and the workflows it runs.
describe('Rule Tuning: billable', () => {
  const billableIds = [
    ALERTZERO_WORKER_DETECTION_RULE_TUNING_WORKFLOW_ID,
    ...ALERTZERO_RULE_TUNING_CHILD_WORKFLOW_IDS,
    ALERTZERO_RULE_PREVIEW_WORKFLOW_ID,
  ];

  it.each(billableIds)('%s is billable', (id) => {
    const definition = managedWorkflowDefinitions.find((candidate) => candidate.id === id);

    expect(definition?.billable).toBe(true);
  });
});
