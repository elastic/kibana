/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExecutionStatus } from '@kbn/workflows';
import { WorkflowExecutionRepository } from './workflow_execution_repository';
import { WORKFLOWS_EXECUTIONS_INDEX } from '../../common';

describe('WorkflowExecutionRepository', () => {
  let repository: WorkflowExecutionRepository;
  let esClient: { index: jest.Mock; update: jest.Mock };

  beforeEach(() => {
    esClient = {
      index: jest.fn(),
      update: jest.fn(),
    };
    repository = new WorkflowExecutionRepository(esClient as any);
  });

  describe('createWorkflowExecution', () => {
    it('should create a workflow execution', async () => {
      const workflowExecution = { id: '1', workflowId: 'test-workflow' };
      await repository.createWorkflowExecution(workflowExecution);
      expect(esClient.index).toHaveBeenCalledWith({
        index: WORKFLOWS_EXECUTIONS_INDEX,
        id: '1',
        refresh: true,
        document: workflowExecution,
      });
    });

    it('should throw an error if ID is missing during creation', async () => {
      await expect(repository.createWorkflowExecution({})).rejects.toThrow(
        'Workflow execution ID is required for creation'
      );
    });
  });

  describe('updateWorkflowExecution', () => {
    it('should update a workflow execution', async () => {
      const workflowExecution = { id: '1', status: ExecutionStatus.RUNNING };
      await repository.updateWorkflowExecution(workflowExecution);
      expect(esClient.update).toHaveBeenCalledWith({
        index: WORKFLOWS_EXECUTIONS_INDEX,
        id: '1',
        refresh: true,
        doc: workflowExecution,
      });
    });

    it('should throw an error if ID is missing during update', async () => {
      await expect(repository.updateWorkflowExecution({})).rejects.toThrow(
        'Workflow execution ID is required for update'
      );
    });
  });
});
