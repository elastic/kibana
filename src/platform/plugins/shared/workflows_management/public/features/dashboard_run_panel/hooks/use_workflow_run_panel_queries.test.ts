/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExecutionStatus } from '@kbn/workflows';
import { getPollInterval, isExecutionInProgress } from './use_workflow_run_panel_queries';

describe('isExecutionInProgress', () => {
  it.each([ExecutionStatus.PENDING, ExecutionStatus.QUEUED, ExecutionStatus.RUNNING])(
    'is true while the run is %s',
    (status) => expect(isExecutionInProgress(status)).toBe(true)
  );

  it.each([
    ExecutionStatus.COMPLETED,
    ExecutionStatus.FAILED,
    ExecutionStatus.WAITING,
    ExecutionStatus.WAITING_FOR_INPUT,
    ExecutionStatus.WAITING_FOR_CHILD,
  ])('is false once the run is %s', (status) => expect(isExecutionInProgress(status)).toBe(false));
});

describe('getPollInterval', () => {
  it('polls quickly until the run is known and while it executes', () => {
    expect(getPollInterval(undefined)).toBe(2_000);
    expect(getPollInterval(ExecutionStatus.RUNNING)).toBe(2_000);
  });

  it('polls slowly while the run is parked', () => {
    expect(getPollInterval(ExecutionStatus.WAITING_FOR_INPUT)).toBe(30_000);
  });

  it('stops polling once the run finishes', () => {
    expect(getPollInterval(ExecutionStatus.CANCELLED)).toBe(false);
  });
});
