/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsWorkflowExecution } from '@kbn/workflows';
import { ensureBoundExecutionAdmitted } from './ensure_bound_execution_admitted';

const execution: Partial<EsWorkflowExecution> = {
  id: 'child-execution',
  workflowId: 'child',
  spaceId: 'default',
  managed: true,
  effectiveIdentity: {
    type: 'service_account',
    id: 'parent-sa',
    inheritedFrom: {
      workloadId: 'root-parent',
    },
  },
};

describe('ensureBoundExecutionAdmitted', () => {
  const workflows = {
    isWorkflowEnabledRealtime: jest.fn(),
    isManagedChildAdmissibleRealtime: jest.fn(),
  };
  const executions = { discardUnstartedExecution: jest.fn() };

  beforeEach(() => {
    workflows.isWorkflowEnabledRealtime.mockReset().mockResolvedValue(true);
    workflows.isManagedChildAdmissibleRealtime.mockReset().mockResolvedValue(true);
    executions.discardUnstartedExecution.mockReset().mockResolvedValue(undefined);
  });

  it('requires live managed eligibility and allows global definitions for inheritance', async () => {
    await ensureBoundExecutionAdmitted(execution, workflows, executions);
    expect(workflows.isManagedChildAdmissibleRealtime).toHaveBeenCalledWith('child', 'default');
    expect(workflows.isWorkflowEnabledRealtime).not.toHaveBeenCalled();
    expect(executions.discardUnstartedExecution).not.toHaveBeenCalled();
  });

  it('discards an ineligible inherited execution before it can be scheduled', async () => {
    workflows.isManagedChildAdmissibleRealtime.mockResolvedValue(false);
    await expect(ensureBoundExecutionAdmitted(execution, workflows, executions)).rejects.toThrow(
      'Child workflow child must exist, be managed, enabled, valid, and available in space default'
    );
    expect(executions.discardUnstartedExecution).toHaveBeenCalledWith('child-execution', 'default');
  });

  it('discards the execution and propagates a failed eligibility lookup', async () => {
    const error = new Error('storage unavailable');
    workflows.isManagedChildAdmissibleRealtime.mockRejectedValue(error);
    await expect(ensureBoundExecutionAdmitted(execution, workflows, executions)).rejects.toBe(
      error
    );
    expect(executions.discardUnstartedExecution).toHaveBeenCalledWith('child-execution', 'default');
  });

  it('preserves ordinary caller execution without a binding check', async () => {
    await ensureBoundExecutionAdmitted(
      { ...execution, effectiveIdentity: undefined },
      workflows,
      executions
    );
    expect(workflows.isWorkflowEnabledRealtime).not.toHaveBeenCalled();
  });
});
