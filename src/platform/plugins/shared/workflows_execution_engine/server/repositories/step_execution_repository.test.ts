/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { WORKFLOWS_STEP_EXECUTIONS_INDEX } from '../../common';
import { StepExecutionRepository } from './step_execution_repository';
import { ExecutionStatus } from '@kbn/workflows';

describe('StepExecutionRepository', () => {
  let repository: StepExecutionRepository;
  let esClient: { index: jest.Mock; update: jest.Mock; bulk: jest.Mock };

  beforeEach(() => {
    esClient = {
      index: jest.fn(),
      update: jest.fn(),
      bulk: jest.fn(),
    };
    repository = new StepExecutionRepository(esClient as any);
  });

  describe('createStepExecution', () => {
    it('should create a step execution', async () => {
      const stepExecution = { id: '1', stepId: 'test-step' };
      await repository.createStepExecution(stepExecution);
      expect(esClient.index).toHaveBeenCalledWith({
        index: WORKFLOWS_STEP_EXECUTIONS_INDEX,
        id: '1',
        refresh: true,
        document: stepExecution,
      });
    });

    it('should throw an error if ID is missing during create', async () => {
      await expect(repository.createStepExecution({})).rejects.toThrow(
        'Step execution ID is required for creation'
      );
    });
  });

  describe('updateStepExecution', () => {
    it('should update a step execution', async () => {
      const stepExecution = { id: '1', status: ExecutionStatus.RUNNING };
      await repository.updateStepExecution(stepExecution);
      expect(esClient.bulk).toHaveBeenCalledWith({
        index: WORKFLOWS_STEP_EXECUTIONS_INDEX,
        refresh: true,
        body: [{ update: { _id: '1' } }, { doc: { id: '1', status: ExecutionStatus.RUNNING } }],
      });
    });

    it('should throw an error if ID is missing during update', async () => {
      await expect(repository.updateStepExecution({})).rejects.toThrow(
        'Step execution ID is required for update'
      );
    });
  });

  describe('updateStepExecutions', () => {
    it('should update multiple step executions', async () => {
      const stepExecutions = [
        { id: '1', status: ExecutionStatus.COMPLETED },
        { id: '2', status: ExecutionStatus.FAILED },
      ];
      await repository.updateStepExecutions(stepExecutions);
      expect(esClient.bulk).toHaveBeenCalledWith({
        index: WORKFLOWS_STEP_EXECUTIONS_INDEX,
        refresh: true,
        body: [
          { update: { _id: '1' } },
          { doc: { id: '1', status: ExecutionStatus.COMPLETED } },
          { update: { _id: '2' } },
          { doc: { id: '2', status: ExecutionStatus.FAILED } },
        ],
      });
    });

    it('should throw an error if ID is missing during bulk update', async () => {
      await expect(repository.updateStepExecutions([{}])).rejects.toThrow(
        'Step execution ID is required for update'
      );
    });
  });
});
