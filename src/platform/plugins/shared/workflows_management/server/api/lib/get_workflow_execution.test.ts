/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { errors } from '@elastic/elasticsearch';
import { loggerMock } from '@kbn/logging-mocks';
import type { EsWorkflowExecution, EsWorkflowStepExecution } from '@kbn/workflows';
import type {
  StepExecutionsDataClient,
  WorkflowExecutionsDataClient,
} from '@kbn/workflows-execution-engine/server';
import {
  createMockGetExecutionsByIdsResponse,
  createMockStepDataClient,
  createMockWorkflowDataClient,
} from '@kbn/workflows-execution-engine/server/mocks';
import { getWorkflowExecution } from './get_workflow_execution';
import {
  WORKFLOW_EXECUTION_EMBEDDED_STEPS_MAX_COUNT,
  WORKFLOWS_STEP_EXECUTIONS_INDEX,
} from '../../../common';

describe('getWorkflowExecution', () => {
  let mockWorkflowDataClient: jest.Mocked<WorkflowExecutionsDataClient>;
  let mockStepDataClient: jest.Mocked<StepExecutionsDataClient>;
  let mockLogger: ReturnType<typeof loggerMock.create>;

  const baseParams = {
    workflowExecutionId: 'exec-1',
    spaceId: 'default',
  };

  const baseExecutionDoc = {
    spaceId: 'default',
    workflowId: 'workflow-1',
    status: 'completed',
    billable: true,
    startedAt: '2024-01-01T00:00:00Z',
    stepExecutionIds: ['step-doc-1', 'step-doc-2'],
    workflowDefinition: { version: '1', name: 'test', enabled: true, triggers: [], steps: [] },
    concurrencyGroupKey: 'streams-ki-onboarding-my-stream',
  };

  const mockStepGetByIds = (documents: unknown[]) =>
    createMockGetExecutionsByIdsResponse(documents as unknown as EsWorkflowStepExecution[], {
      index: WORKFLOWS_STEP_EXECUTIONS_INDEX,
    });

  beforeEach(() => {
    mockWorkflowDataClient = createMockWorkflowDataClient();
    mockStepDataClient = createMockStepDataClient();
    mockLogger = loggerMock.create();
    jest.clearAllMocks();
  });

  describe('source excludes with mget (stepExecutionIds present)', () => {
    beforeEach(() => {
      mockWorkflowDataClient.getByIds.mockResolvedValue(
        createMockGetExecutionsByIdsResponse([baseExecutionDoc] as unknown as EsWorkflowExecution[])
      );
      mockStepDataClient.getByIds.mockResolvedValue(
        mockStepGetByIds([
          { stepId: 's1', status: 'completed', globalExecutionIndex: 0 },
          { stepId: 's2', status: 'completed', globalExecutionIndex: 1 },
        ])
      );
    });

    it('should not pass _source_excludes when both includeInput and includeOutput are true', async () => {
      await getWorkflowExecution({
        ...baseParams,
        workflowExecutionsDataClient: mockWorkflowDataClient,
        stepExecutionsDataClient: mockStepDataClient,
        logger: mockLogger,
        includeInput: true,
        includeOutput: true,
      });

      expect(mockStepDataClient.getByIds).toHaveBeenCalledWith(baseExecutionDoc.stepExecutionIds, {
        sourceExcludes: [],
      });
    });

    it('should pass _source_excludes: ["input", "output"] when both are false', async () => {
      await getWorkflowExecution({
        ...baseParams,
        workflowExecutionsDataClient: mockWorkflowDataClient,
        stepExecutionsDataClient: mockStepDataClient,
        logger: mockLogger,
        includeInput: false,
        includeOutput: false,
      });

      expect(mockStepDataClient.getByIds).toHaveBeenCalledWith(baseExecutionDoc.stepExecutionIds, {
        sourceExcludes: ['input', 'output'],
      });
    });

    it('should pass _source_excludes: ["input"] when only includeInput is false', async () => {
      await getWorkflowExecution({
        ...baseParams,
        workflowExecutionsDataClient: mockWorkflowDataClient,
        stepExecutionsDataClient: mockStepDataClient,
        logger: mockLogger,
        includeInput: false,
        includeOutput: true,
      });

      expect(mockStepDataClient.getByIds).toHaveBeenCalledWith(baseExecutionDoc.stepExecutionIds, {
        sourceExcludes: ['input'],
      });
    });

    it('should pass _source_excludes: ["output"] when only includeOutput is false', async () => {
      await getWorkflowExecution({
        ...baseParams,
        workflowExecutionsDataClient: mockWorkflowDataClient,
        stepExecutionsDataClient: mockStepDataClient,
        logger: mockLogger,
        includeInput: true,
        includeOutput: false,
      });

      expect(mockStepDataClient.getByIds).toHaveBeenCalledWith(baseExecutionDoc.stepExecutionIds, {
        sourceExcludes: ['output'],
      });
    });

    it('should default includeInput and includeOutput to false when omitted', async () => {
      await getWorkflowExecution({
        ...baseParams,
        workflowExecutionsDataClient: mockWorkflowDataClient,
        stepExecutionsDataClient: mockStepDataClient,
        logger: mockLogger,
      });

      expect(mockStepDataClient.getByIds).toHaveBeenCalledWith(baseExecutionDoc.stepExecutionIds, {
        sourceExcludes: ['input', 'output'],
      });
    });
  });

  describe('source excludes with search fallback (no stepExecutionIds)', () => {
    beforeEach(() => {
      mockWorkflowDataClient.getByIds.mockResolvedValue(
        createMockGetExecutionsByIdsResponse([
          { ...baseExecutionDoc, stepExecutionIds: undefined },
        ] as unknown as EsWorkflowExecution[])
      );
      mockStepDataClient.search.mockResolvedValue({ hits: { hits: [] } } as any);
    });

    it('should pass _source excludes to search when includeInput/includeOutput are false', async () => {
      await getWorkflowExecution({
        ...baseParams,
        workflowExecutionsDataClient: mockWorkflowDataClient,
        stepExecutionsDataClient: mockStepDataClient,
        logger: mockLogger,
        includeInput: false,
        includeOutput: false,
      });

      expect(mockStepDataClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          _source: { excludes: ['input', 'output'] },
        })
      );
    });

    it('should not pass _source excludes when both flags are true', async () => {
      await getWorkflowExecution({
        ...baseParams,
        workflowExecutionsDataClient: mockWorkflowDataClient,
        stepExecutionsDataClient: mockStepDataClient,
        logger: mockLogger,
        includeInput: true,
        includeOutput: true,
      });

      expect(mockStepDataClient.search).toHaveBeenCalledWith(
        expect.not.objectContaining({
          _source: expect.anything(),
        })
      );
    });
  });

  describe('basic behavior', () => {
    it('should return null when document is not found', async () => {
      mockWorkflowDataClient.getByIds.mockResolvedValue(createMockGetExecutionsByIdsResponse([]));

      const result = await getWorkflowExecution({
        ...baseParams,
        workflowExecutionsDataClient: mockWorkflowDataClient,
        stepExecutionsDataClient: mockStepDataClient,
        logger: mockLogger,
      });

      expect(result).toBeNull();
    });

    it('should return null when spaceId does not match', async () => {
      mockWorkflowDataClient.getByIds.mockResolvedValue(
        createMockGetExecutionsByIdsResponse([
          { ...baseExecutionDoc, spaceId: 'other-space' },
        ] as unknown as EsWorkflowExecution[])
      );

      const result = await getWorkflowExecution({
        ...baseParams,
        workflowExecutionsDataClient: mockWorkflowDataClient,
        stepExecutionsDataClient: mockStepDataClient,
        logger: mockLogger,
      });

      expect(result).toBeNull();
    });

    it('should return the execution DTO with step executions', async () => {
      mockWorkflowDataClient.getByIds.mockResolvedValue(
        createMockGetExecutionsByIdsResponse([baseExecutionDoc] as unknown as EsWorkflowExecution[])
      );
      mockStepDataClient.getByIds.mockResolvedValue(
        mockStepGetByIds([
          {
            stepId: 's1',
            status: 'completed',
            globalExecutionIndex: 1,
            output: { result: 'ok' },
          },
          {
            stepId: 's2',
            status: 'completed',
            globalExecutionIndex: 0,
            input: { arg: 1 },
          },
        ])
      );

      const result = await getWorkflowExecution({
        ...baseParams,
        workflowExecutionsDataClient: mockWorkflowDataClient,
        stepExecutionsDataClient: mockStepDataClient,
        logger: mockLogger,
      });

      expect(result).not.toBeNull();
      expect(result?.id).toBe('exec-1');
      expect(result?.stepExecutions).toHaveLength(2);
      expect(result?.concurrencyGroupKey).toBe('streams-ki-onboarding-my-stream');
      expect(result).not.toHaveProperty('billable');
    });

    it('should include workflow document version when present on the execution', async () => {
      mockWorkflowDataClient.getByIds.mockResolvedValue(
        createMockGetExecutionsByIdsResponse([
          { ...baseExecutionDoc, version: 7 },
        ] as unknown as EsWorkflowExecution[])
      );
      mockStepDataClient.getByIds.mockResolvedValue(mockStepGetByIds([]));

      const result = await getWorkflowExecution({
        ...baseParams,
        workflowExecutionsDataClient: mockWorkflowDataClient,
        stepExecutionsDataClient: mockStepDataClient,
        logger: mockLogger,
      });

      expect(result?.version).toBe(7);
    });

    it('should omit workflow document version when absent on legacy executions', async () => {
      mockWorkflowDataClient.getByIds.mockResolvedValue(
        createMockGetExecutionsByIdsResponse([baseExecutionDoc] as unknown as EsWorkflowExecution[])
      );
      mockStepDataClient.getByIds.mockResolvedValue(mockStepGetByIds([]));

      const result = await getWorkflowExecution({
        ...baseParams,
        workflowExecutionsDataClient: mockWorkflowDataClient,
        stepExecutionsDataClient: mockStepDataClient,
        logger: mockLogger,
      });

      expect(result?.version).toBeUndefined();
    });

    it('should load only the first step ids up to the mget cap', async () => {
      const manyIds = Array.from(
        { length: WORKFLOW_EXECUTION_EMBEDDED_STEPS_MAX_COUNT + 1 },
        (_, index) => `s${index}`
      );
      mockWorkflowDataClient.getByIds.mockResolvedValue(
        createMockGetExecutionsByIdsResponse([
          { ...baseExecutionDoc, stepExecutionIds: manyIds },
        ] as unknown as EsWorkflowExecution[])
      );
      mockStepDataClient.getByIds.mockImplementation(async (ids) =>
        mockStepGetByIds(ids.map((id) => ({ id, stepId: id, status: 'completed' })))
      );

      const result = await getWorkflowExecution({
        ...baseParams,
        workflowExecutionsDataClient: mockWorkflowDataClient,
        stepExecutionsDataClient: mockStepDataClient,
        logger: mockLogger,
      });

      expect(mockStepDataClient.getByIds).toHaveBeenCalledTimes(1);
      expect(mockStepDataClient.getByIds.mock.calls[0][0]).toHaveLength(
        WORKFLOW_EXECUTION_EMBEDDED_STEPS_MAX_COUNT
      );
      expect(result?.stepExecutions).toHaveLength(WORKFLOW_EXECUTION_EMBEDDED_STEPS_MAX_COUNT);
    });

    it('should return empty steps when search fallback hits a size abort', async () => {
      mockWorkflowDataClient.getByIds.mockResolvedValue(
        createMockGetExecutionsByIdsResponse([
          { ...baseExecutionDoc, stepExecutionIds: undefined },
        ] as unknown as EsWorkflowExecution[])
      );
      mockStepDataClient.search.mockRejectedValue(
        new errors.RequestAbortedError(
          'The content length (9000) is bigger than the maximum allowed buffer (42)'
        )
      );

      const result = await getWorkflowExecution({
        ...baseParams,
        workflowExecutionsDataClient: mockWorkflowDataClient,
        stepExecutionsDataClient: mockStepDataClient,
        logger: mockLogger,
      });

      expect(result?.stepExecutions).toEqual([]);
      expect(mockLogger.warn).toHaveBeenCalled();
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should return the execution with empty steps when no step documents could be loaded', async () => {
      mockWorkflowDataClient.getByIds.mockResolvedValue(
        createMockGetExecutionsByIdsResponse([baseExecutionDoc] as unknown as EsWorkflowExecution[])
      );
      const sizeError = new errors.RequestAbortedError(
        'The content length (9000) is bigger than the maximum allowed buffer (42)'
      );
      mockStepDataClient.getByIds.mockRejectedValue(sizeError);

      const result = await getWorkflowExecution({
        ...baseParams,
        workflowExecutionsDataClient: mockWorkflowDataClient,
        stepExecutionsDataClient: mockStepDataClient,
        logger: mockLogger,
      });

      expect(result).not.toBeNull();
      expect(result?.id).toBe('exec-1');
      expect(result?.status).toBe('completed');
      expect(result?.stepExecutions).toEqual([]);
      expect(mockLogger.warn).toHaveBeenCalled();
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should omit step executions when omitStepExecutions is true', async () => {
      mockWorkflowDataClient.getByIds.mockResolvedValue(
        createMockGetExecutionsByIdsResponse([baseExecutionDoc] as unknown as EsWorkflowExecution[])
      );

      const result = await getWorkflowExecution({
        ...baseParams,
        workflowExecutionsDataClient: mockWorkflowDataClient,
        stepExecutionsDataClient: mockStepDataClient,
        logger: mockLogger,
        omitStepExecutions: true,
      });

      expect(mockStepDataClient.getByIds).not.toHaveBeenCalled();
      expect(mockStepDataClient.search).not.toHaveBeenCalled();
      expect(result?.stepExecutions).toEqual([]);
    });

    it('should log a warn and rethrow when the execution document mget exceeds the response size', async () => {
      const sizeError = new errors.RequestAbortedError(
        'The content length (9000) is bigger than the maximum allowed buffer (42)'
      );
      mockWorkflowDataClient.getByIds.mockRejectedValue(sizeError);

      await expect(
        getWorkflowExecution({
          ...baseParams,
          workflowExecutionsDataClient: mockWorkflowDataClient,
          stepExecutionsDataClient: mockStepDataClient,
          logger: mockLogger,
        })
      ).rejects.toBe(sizeError);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Workflow execution document exec-1 exceeded the maximum response size Kibana can process'
      );
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should log the execution id for unexpected failures', async () => {
      mockWorkflowDataClient.getByIds.mockRejectedValue(new Error('es down'));

      await expect(
        getWorkflowExecution({
          ...baseParams,
          workflowExecutionsDataClient: mockWorkflowDataClient,
          stepExecutionsDataClient: mockStepDataClient,
          logger: mockLogger,
        })
      ).rejects.toThrow('es down');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to get workflow execution exec-1: Error: es down'
      );
    });
  });
});
