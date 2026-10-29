/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import {
  NIGHTSHIFT_INVESTIGATION_FAILURE_SWEEP_WORKFLOW,
  NIGHTSHIFT_INVESTIGATION_FAILURE_SWEEP_WORKFLOW_ID,
} from '.';
import { getManagedWorkflowDefinition } from '../../..';
import { WorkflowSchema } from '../../../../spec/schema';

describe('managed investigation failure sweep', () => {
  it('is discoverable and validates a per-space schedule with bounded runtime and dropped overlaps', () => {
    expect(getManagedWorkflowDefinition(NIGHTSHIFT_INVESTIGATION_FAILURE_SWEEP_WORKFLOW_ID)).toBe(
      NIGHTSHIFT_INVESTIGATION_FAILURE_SWEEP_WORKFLOW
    );
    const definition = parse(NIGHTSHIFT_INVESTIGATION_FAILURE_SWEEP_WORKFLOW.yaml);
    expect(WorkflowSchema.parse(definition)).toMatchObject({
      enabled: false,
      settings: { timeout: '50s', concurrency: { strategy: 'drop', max: 1 } },
      triggers: expect.arrayContaining([{ type: 'scheduled', with: { every: '1m' } }]),
    });
  });
});
