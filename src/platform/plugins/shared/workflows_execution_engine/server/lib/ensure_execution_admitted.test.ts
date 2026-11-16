/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { WorkflowExecutionNotAdmittedError } from '@kbn/workflows/common/errors';
import { ensureExecutionAdmitted } from './ensure_execution_admitted';

describe('ensureExecutionAdmitted', () => {
  const checkExecutionAdmission = jest.fn();
  const workflowsExtensions = { checkExecutionAdmission };

  beforeEach(() => {
    checkExecutionAdmission.mockReset();
  });

  it('resolves when the run is admitted', async () => {
    checkExecutionAdmission.mockResolvedValue({ admitted: true });

    await expect(
      ensureExecutionAdmitted({
        workflow: { id: 'wf-1', isEphemeral: false },
        spaceId: 'default',
        triggeredBy: 'manual',
        workflowsExtensions,
      })
    ).resolves.toBeUndefined();
    expect(checkExecutionAdmission).toHaveBeenCalledWith({
      workflowId: 'wf-1',
      spaceId: 'default',
      triggeredBy: 'manual',
    });
  });

  it('throws a not-admitted error carrying the guard id and reason', async () => {
    checkExecutionAdmission.mockResolvedValue({
      admitted: false,
      guardId: 'contextEngine.budget',
      reason: 'Monthly budget reached',
    });

    const result = ensureExecutionAdmitted({
      workflow: { id: 'wf-1' },
      spaceId: 'default',
      triggeredBy: 'scheduled',
      workflowsExtensions,
    });

    await expect(result).rejects.toBeInstanceOf(WorkflowExecutionNotAdmittedError);
    await expect(result).rejects.toMatchObject({
      guardId: 'contextEngine.budget',
      reason: 'Monthly budget reached',
    });
  });

  it('skips ephemeral workflows', async () => {
    await ensureExecutionAdmitted({
      workflow: { id: 'ephemeral-workflow', isEphemeral: true },
      spaceId: 'default',
      triggeredBy: 'manual',
      workflowsExtensions,
    });

    expect(checkExecutionAdmission).not.toHaveBeenCalled();
  });
});
