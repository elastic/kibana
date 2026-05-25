/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExecutionStatus } from '@kbn/workflows';
import { hasActiveWorkflowExecutions } from './polling_utils';

describe('hasActiveWorkflowExecutions', () => {
  it('returns false for empty or undefined results', () => {
    expect(hasActiveWorkflowExecutions(undefined)).toBe(false);
    expect(hasActiveWorkflowExecutions([])).toBe(false);
  });

  it('returns true when any execution is active', () => {
    expect(
      hasActiveWorkflowExecutions([
        { status: ExecutionStatus.COMPLETED } as any,
        { status: ExecutionStatus.RUNNING } as any,
      ])
    ).toBe(true);
  });

  it('returns false when all executions are terminal', () => {
    expect(
      hasActiveWorkflowExecutions([
        { status: ExecutionStatus.COMPLETED } as any,
        { status: ExecutionStatus.FAILED } as any,
      ])
    ).toBe(false);
  });
});
