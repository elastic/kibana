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
import { getExecution } from './get_execution';
import type { ExecutionReadDeps } from './types';
import { WORKFLOWS_STEP_EXECUTIONS_INDEX } from '../repositories/data_access_layer/constants/execution_indexes';
import {
  createMockGetExecutionsByIdsResponse,
  createMockStepDataClient,
  createMockWorkflowDataClient,
} from '../repositories/data_access_layer/mocks';

const EMBEDDED_STEPS_MAX_COUNT = 5000;

describe('getExecution', () => {
  const workflowExecutionsDataClient = createMockWorkflowDataClient();
  const stepExecutionsDataClient = createMockStepDataClient();
  const logger = loggerMock.create();
  const deps: ExecutionReadDeps = {
    logger,
    workflowExecutionsDataClient,
    stepExecutionsDataClient,
  };

  const baseParams = {
    executionId: 'exec-1',
    spaceId: 'default',
  };

  const baseExecutionDoc = {
    spaceId: 'default',
    workflowId: 'workflow-1',
    status: 'completed',
    startedAt: '2024-01-01T00:00:00Z',
    stepExecutionIds: ['step-doc-1', 'step-doc-2'],
  };

  const mockStepGetByIds = (documents: unknown[]) =>
    createMockGetExecutionsByIdsResponse(documents as unknown as EsWorkflowStepExecution[], {
      index: WORKFLOWS_STEP_EXECUTIONS_INDEX,
    });

  beforeEach(() => {
    jest.clearAllMocks();
    workflowExecutionsDataClient.getByIds.mockReset();
    stepExecutionsDataClient.getByIds.mockReset();
    stepExecutionsDataClient.search.mockReset();
  });

  describe('source excludes with mget (stepExecutionIds present)', () => {
    beforeEach(() => {
      workflowExecutionsDataClient.getByIds.mockResolvedValue(
        createMockGetExecutionsByIdsResponse([baseExecutionDoc] as unknown as EsWorkflowExecution[])
      );
      stepExecutionsDataClient.getByIds.mockResolvedValue(
        mockStepGetByIds([
          { stepId: 's1', status: 'completed', globalExecutionIndex: 0 },
          { stepId: 's2', status: 'completed', globalExecutionIndex: 1 },
        ])
      );
    });

    it('should not pass _source_excludes when both includeInput and includeOutput are true', async () => {
      await getExecution(deps, { ...baseParams, includeInput: true, includeOutput: true });

      expect(stepExecutionsDataClient.getByIds).toHaveBeenCalledWith(
        baseExecutionDoc.stepExecutionIds,
        { sourceExcludes: [] }
      );
    });

    it('should pass _source_excludes: ["input", "output"] when both are false', async () => {
      await getExecution(deps, { ...baseParams, includeInput: false, includeOutput: false });

      expect(stepExecutionsDataClient.getByIds).toHaveBeenCalledWith(
        baseExecutionDoc.stepExecutionIds,
        { sourceExcludes: ['input', 'output'] }
      );
    });

    it('should pass _source_excludes: ["input"] when only includeInput is false', async () => {
      await getExecution(deps, { ...baseParams, includeInput: false, includeOutput: true });

      expect(stepExecutionsDataClient.getByIds).toHaveBeenCalledWith(
        baseExecutionDoc.stepExecutionIds,
        { sourceExcludes: ['input'] }
      );
    });

    it('should pass _source_excludes: ["output"] when only includeOutput is false', async () => {
      await getExecution(deps, { ...baseParams, includeInput: true, includeOutput: false });

      expect(stepExecutionsDataClient.getByIds).toHaveBeenCalledWith(
        baseExecutionDoc.stepExecutionIds,
        { sourceExcludes: ['output'] }
      );
    });

    it('should default includeInput and includeOutput to false when omitted', async () => {
      await getExecution(deps, baseParams);

      expect(stepExecutionsDataClient.getByIds).toHaveBeenCalledWith(
        baseExecutionDoc.stepExecutionIds,
        { sourceExcludes: ['input', 'output'] }
      );
    });
  });

  describe('source excludes with search fallback (no stepExecutionIds)', () => {
    beforeEach(() => {
      workflowExecutionsDataClient.getByIds.mockResolvedValue(
        createMockGetExecutionsByIdsResponse([
          { ...baseExecutionDoc, stepExecutionIds: undefined },
        ] as unknown as EsWorkflowExecution[])
      );
      stepExecutionsDataClient.search.mockResolvedValue({ hits: { hits: [] } } as never);
    });

    it('should pass _source excludes to search when includeInput/includeOutput are false', async () => {
      await getExecution(deps, { ...baseParams, includeInput: false, includeOutput: false });

      expect(stepExecutionsDataClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          _source: { excludes: ['input', 'output'] },
        })
      );
    });

    it('should not pass _source excludes when both flags are true', async () => {
      await getExecution(deps, { ...baseParams, includeInput: true, includeOutput: true });

      expect(stepExecutionsDataClient.search).toHaveBeenCalledWith(
        expect.not.objectContaining({
          _source: expect.anything(),
        })
      );
    });
  });

  describe('basic behavior', () => {
    it('should return null when document is not found', async () => {
      workflowExecutionsDataClient.getByIds.mockResolvedValue(
        createMockGetExecutionsByIdsResponse([])
      );

      await expect(getExecution(deps, baseParams)).resolves.toBeNull();
    });

    it('should return null when spaceId does not match', async () => {
      workflowExecutionsDataClient.getByIds.mockResolvedValue(
        createMockGetExecutionsByIdsResponse([
          { ...baseExecutionDoc, spaceId: 'other-space' },
        ] as unknown as EsWorkflowExecution[])
      );

      await expect(getExecution(deps, baseParams)).resolves.toBeNull();
    });

    it('should return the execution with its steps', async () => {
      workflowExecutionsDataClient.getByIds.mockResolvedValue(
        createMockGetExecutionsByIdsResponse([baseExecutionDoc] as unknown as EsWorkflowExecution[])
      );
      stepExecutionsDataClient.getByIds.mockResolvedValue(
        mockStepGetByIds([
          { stepId: 's1', status: 'completed', globalExecutionIndex: 1 },
          { stepId: 's2', status: 'completed', globalExecutionIndex: 0 },
        ])
      );

      const result = await getExecution(deps, baseParams);

      expect(result?.execution).toEqual(expect.objectContaining({ workflowId: 'workflow-1' }));
      expect(result?.steps).toHaveLength(2);
    });

    it('should cap search fallback size at the embed max', async () => {
      workflowExecutionsDataClient.getByIds.mockResolvedValue(
        createMockGetExecutionsByIdsResponse([
          { ...baseExecutionDoc, stepExecutionIds: undefined },
        ] as unknown as EsWorkflowExecution[])
      );
      stepExecutionsDataClient.search.mockResolvedValue({ hits: { hits: [] } } as never);

      await getExecution(deps, baseParams);

      expect(stepExecutionsDataClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          size: EMBEDDED_STEPS_MAX_COUNT,
        })
      );
    });

    it('should load only the first step ids up to the mget cap', async () => {
      const manyIds = Array.from(
        { length: EMBEDDED_STEPS_MAX_COUNT + 1 },
        (_, index) => `s${index}`
      );
      workflowExecutionsDataClient.getByIds.mockResolvedValue(
        createMockGetExecutionsByIdsResponse([
          { ...baseExecutionDoc, stepExecutionIds: manyIds },
        ] as unknown as EsWorkflowExecution[])
      );
      stepExecutionsDataClient.getByIds.mockImplementation(async (ids) =>
        mockStepGetByIds(ids.map((id) => ({ id, stepId: id, status: 'completed' })))
      );

      const result = await getExecution(deps, baseParams);

      expect(stepExecutionsDataClient.getByIds).toHaveBeenCalledTimes(1);
      expect(stepExecutionsDataClient.getByIds.mock.calls[0][0]).toHaveLength(
        EMBEDDED_STEPS_MAX_COUNT
      );
      expect(result?.steps).toHaveLength(EMBEDDED_STEPS_MAX_COUNT);
    });

    it('should return empty steps when search fallback hits a size abort', async () => {
      workflowExecutionsDataClient.getByIds.mockResolvedValue(
        createMockGetExecutionsByIdsResponse([
          { ...baseExecutionDoc, stepExecutionIds: undefined },
        ] as unknown as EsWorkflowExecution[])
      );
      stepExecutionsDataClient.search.mockRejectedValue(
        new errors.RequestAbortedError(
          'The content length (9000) is bigger than the maximum allowed buffer (42)'
        )
      );

      const result = await getExecution(deps, baseParams);

      expect(result?.steps).toEqual([]);
      expect(logger.warn).toHaveBeenCalled();
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('should return the execution with empty steps when no step documents could be loaded', async () => {
      workflowExecutionsDataClient.getByIds.mockResolvedValue(
        createMockGetExecutionsByIdsResponse([baseExecutionDoc] as unknown as EsWorkflowExecution[])
      );
      stepExecutionsDataClient.getByIds.mockRejectedValue(
        new errors.RequestAbortedError(
          'The content length (9000) is bigger than the maximum allowed buffer (42)'
        )
      );

      const result = await getExecution(deps, baseParams);

      expect(result?.execution).toEqual(expect.objectContaining({ status: 'completed' }));
      expect(result?.steps).toEqual([]);
      expect(logger.warn).toHaveBeenCalled();
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('should omit steps when omitSteps is true', async () => {
      workflowExecutionsDataClient.getByIds.mockResolvedValue(
        createMockGetExecutionsByIdsResponse([baseExecutionDoc] as unknown as EsWorkflowExecution[])
      );

      const result = await getExecution(deps, { ...baseParams, omitSteps: true });

      expect(stepExecutionsDataClient.getByIds).not.toHaveBeenCalled();
      expect(stepExecutionsDataClient.search).not.toHaveBeenCalled();
      expect(result?.steps).toEqual([]);
    });

    it('should log a warn and rethrow when the execution document mget exceeds the response size', async () => {
      const sizeError = new errors.RequestAbortedError(
        'The content length (9000) is bigger than the maximum allowed buffer (42)'
      );
      workflowExecutionsDataClient.getByIds.mockRejectedValue(sizeError);

      await expect(getExecution(deps, baseParams)).rejects.toBe(sizeError);

      expect(logger.warn).toHaveBeenCalledWith(
        'Workflow execution document exec-1 exceeded the maximum response size Kibana can process'
      );
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('should log the execution id for unexpected failures', async () => {
      workflowExecutionsDataClient.getByIds.mockRejectedValue(new Error('es down'));

      await expect(getExecution(deps, baseParams)).rejects.toThrow('es down');

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to get workflow execution exec-1: Error: es down'
      );
    });
  });
});
