/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mintHitlExternalResumeApiKey } from './hitl_external_resume_helpers';
import type { StepExecutionRuntime } from '../../workflow_context_manager/step_execution_runtime';

jest.mock('@kbn/workflows/server', () => ({
  ...jest.requireActual('@kbn/workflows/server'),
  createExternalResumeApiKey: jest.fn().mockResolvedValue({
    id: 'api-key-id',
    encoded: 'encoded-api-key',
  }),
}));

const mockCreateExternalResumeApiKey = jest.requireMock('@kbn/workflows/server')
  .createExternalResumeApiKey as jest.Mock;

describe('mintHitlExternalResumeApiKey', () => {
  beforeEach(() => {
    mockCreateExternalResumeApiKey.mockClear();
  });

  it('converts workflow timeout to an Elasticsearch-compatible expiration', async () => {
    const stepExecutionRuntime = {
      contextManager: {
        getEsClientAsUser: jest.fn().mockReturnValue({}),
      },
    } as unknown as StepExecutionRuntime;

    await mintHitlExternalResumeApiKey({
      stepExecutionRuntime,
      execution: { id: 'execution-id', workflowId: 'workflow-id' },
      stepId: 'step-id',
      spaceId: 'default',
      timeout: '2w',
    });

    expect(mockCreateExternalResumeApiKey).toHaveBeenCalledWith(
      expect.objectContaining({
        expiration: '1209600000ms',
      })
    );
  });
});
