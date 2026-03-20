/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import { WorkflowApi } from './workflows_api';

const VERSION_HEADER = { 'elastic-api-version': '2023-10-31' };

describe('WorkflowApi', () => {
  let http: ReturnType<typeof httpServiceMock.createStartContract>;
  let api: WorkflowApi;

  beforeEach(() => {
    http = httpServiceMock.createStartContract();
    api = new WorkflowApi(http);
  });

  // ---------------------------------------------------------------------------
  // Workflow CRUD
  // ---------------------------------------------------------------------------

  describe('getWorkflows', () => {
    it('should call GET /api/workflows with query params', async () => {
      const params = { size: 20, page: 1, query: 'test' };
      await api.getWorkflows(params);

      expect(http.get).toHaveBeenCalledWith('/api/workflows', {
        query: params,
        headers: VERSION_HEADER,
      });
    });

    it('should call GET /api/workflows without query params when none provided', async () => {
      await api.getWorkflows();

      expect(http.get).toHaveBeenCalledWith('/api/workflows', {
        query: undefined,
        headers: VERSION_HEADER,
      });
    });
  });

  describe('getWorkflow', () => {
    it('should call GET /api/workflows/workflow/{id}', async () => {
      await api.getWorkflow('wf-1');

      expect(http.get).toHaveBeenCalledWith('/api/workflows/workflow/wf-1', {
        headers: VERSION_HEADER,
      });
    });

    it('should encode the workflow id', async () => {
      await api.getWorkflow('id/with/slashes');

      expect(http.get).toHaveBeenCalledWith('/api/workflows/workflow/id%2Fwith%2Fslashes', {
        headers: VERSION_HEADER,
      });
    });
  });

  describe('createWorkflow', () => {
    it('should call POST /api/workflows/workflow with body', async () => {
      const params = { name: 'New Workflow', yaml: 'steps: []' };
      await api.createWorkflow(params);

      expect(http.post).toHaveBeenCalledWith('/api/workflows/workflow', {
        body: JSON.stringify(params),
        headers: VERSION_HEADER,
      });
    });
  });

  describe('updateWorkflow', () => {
    it('should call PUT /api/workflows/workflow/{id} with body', async () => {
      const params = { name: 'Updated', enabled: false };
      await api.updateWorkflow('wf-1', params);

      expect(http.put).toHaveBeenCalledWith('/api/workflows/workflow/wf-1', {
        body: JSON.stringify(params),
        headers: VERSION_HEADER,
      });
    });
  });

  describe('deleteWorkflow', () => {
    it('should call DELETE /api/workflows/workflow/{id}', async () => {
      await api.deleteWorkflow('wf-1');

      expect(http.delete).toHaveBeenCalledWith('/api/workflows/workflow/wf-1', {
        headers: VERSION_HEADER,
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Workflow bulk operations
  // ---------------------------------------------------------------------------

  describe('bulkCreateWorkflows', () => {
    it('should call POST /api/workflows with workflows and overwrite', async () => {
      const workflows = [{ id: 'w-1', yaml: 'steps: []' }];
      await api.bulkCreateWorkflows({ workflows, overwrite: true });

      expect(http.post).toHaveBeenCalledWith('/api/workflows', {
        query: { overwrite: true },
        body: JSON.stringify({ workflows }),
        headers: VERSION_HEADER,
      });
    });

    it('should default overwrite to false', async () => {
      const workflows = [{ id: 'w-1', yaml: 'steps: []' }];
      await api.bulkCreateWorkflows({ workflows });

      expect(http.post).toHaveBeenCalledWith('/api/workflows', {
        query: { overwrite: false },
        body: JSON.stringify({ workflows }),
        headers: VERSION_HEADER,
      });
    });
  });

  describe('bulkDeleteWorkflows', () => {
    it('should call DELETE /api/workflows with ids in body', async () => {
      await api.bulkDeleteWorkflows(['wf-1', 'wf-2']);

      expect(http.delete).toHaveBeenCalledWith('/api/workflows', {
        body: JSON.stringify({ ids: ['wf-1', 'wf-2'] }),
        headers: VERSION_HEADER,
      });
    });
  });

  describe('getBatchWorkflows', () => {
    it('should call POST /api/workflows/batch with ids', async () => {
      await api.getBatchWorkflows({ ids: ['wf-1', 'wf-2'] });

      expect(http.post).toHaveBeenCalledWith('/api/workflows/batch', {
        body: JSON.stringify({ ids: ['wf-1', 'wf-2'] }),
        headers: VERSION_HEADER,
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Workflow operations
  // ---------------------------------------------------------------------------

  describe('cloneWorkflow', () => {
    it('should call POST /api/workflows/workflow/{id}/clone', async () => {
      await api.cloneWorkflow('wf-1');

      expect(http.post).toHaveBeenCalledWith('/api/workflows/workflow/wf-1/clone', {
        headers: VERSION_HEADER,
      });
    });
  });

  describe('validateWorkflow', () => {
    it('should call POST /api/workflows/validate with yaml', async () => {
      await api.validateWorkflow({ yaml: 'name: Test\nsteps: []' });

      expect(http.post).toHaveBeenCalledWith('/api/workflows/validate', {
        body: JSON.stringify({ yaml: 'name: Test\nsteps: []' }),
        headers: VERSION_HEADER,
      });
    });
  });

  describe('exportWorkflows', () => {
    it('should call POST /api/workflows/export with ids', async () => {
      await api.exportWorkflows({ ids: ['wf-1', 'wf-2'] });

      expect(http.post).toHaveBeenCalledWith('/api/workflows/export', {
        body: JSON.stringify({ ids: ['wf-1', 'wf-2'] }),
        headers: VERSION_HEADER,
      });
    });
  });

  describe('getStats', () => {
    it('should call GET /api/workflows/stats', async () => {
      await api.getStats();

      expect(http.get).toHaveBeenCalledWith('/api/workflows/stats', {
        headers: VERSION_HEADER,
      });
    });
  });

  describe('getAggs', () => {
    it('should call GET /api/workflows/aggs with fields', async () => {
      await api.getAggs({ fields: ['tags', 'createdBy'] });

      expect(http.get).toHaveBeenCalledWith('/api/workflows/aggs', {
        query: { fields: ['tags', 'createdBy'] },
        headers: VERSION_HEADER,
      });
    });
  });

  describe('getConnectors', () => {
    it('should call GET /api/workflows/connectors', async () => {
      await api.getConnectors();

      expect(http.get).toHaveBeenCalledWith('/api/workflows/connectors', {
        headers: VERSION_HEADER,
      });
    });
  });

  describe('getSchema', () => {
    it('should call GET /api/workflows/schema with loose param', async () => {
      await api.getSchema({ loose: true });

      expect(http.get).toHaveBeenCalledWith('/api/workflows/schema', {
        query: { loose: true },
        headers: VERSION_HEADER,
      });
    });
  });

  describe('getConfig', () => {
    it('should call GET /internal/workflows/config with version 1', async () => {
      await api.getConfig();

      expect(http.get).toHaveBeenCalledWith('/internal/workflows/config', {
        version: '1',
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Execution operations
  // ---------------------------------------------------------------------------

  describe('runWorkflow', () => {
    it('should call POST /api/workflows/workflow/{id}/run', async () => {
      const inputs = { key: 'value' };
      const metadata = { triggerType: 'manual' };
      await api.runWorkflow('wf-1', { inputs, metadata });

      expect(http.post).toHaveBeenCalledWith('/api/workflows/workflow/wf-1/run', {
        body: JSON.stringify({ inputs, metadata }),
        headers: VERSION_HEADER,
      });
    });
  });

  describe('testWorkflow', () => {
    it('should call POST /api/workflows/test', async () => {
      const params = { workflowYaml: 'steps: []', inputs: { key: 'value' } };
      await api.testWorkflow(params);

      expect(http.post).toHaveBeenCalledWith('/api/workflows/test', {
        body: JSON.stringify(params),
        headers: VERSION_HEADER,
      });
    });
  });

  describe('testStep', () => {
    it('should call POST /api/workflows/step/test', async () => {
      const params = {
        stepId: 'step-1',
        workflowYaml: 'steps: []',
        contextOverride: { key: 'value' },
      };
      await api.testStep(params);

      expect(http.post).toHaveBeenCalledWith('/api/workflows/step/test', {
        body: JSON.stringify(params),
        headers: VERSION_HEADER,
      });
    });
  });

  describe('getWorkflowExecutions', () => {
    it('should call GET /api/workflows/workflow/{id}/executions with query', async () => {
      const params = { page: 1, size: 10 };
      await api.getWorkflowExecutions('wf-1', params);

      expect(http.get).toHaveBeenCalledWith('/api/workflows/workflow/wf-1/executions', {
        query: params,
        headers: VERSION_HEADER,
      });
    });
  });

  describe('getWorkflowStepExecutions', () => {
    it('should call GET /api/workflows/workflow/{id}/executions/steps', async () => {
      const params = { stepId: 'step-1', page: 1 };
      await api.getWorkflowStepExecutions('wf-1', params);

      expect(http.get).toHaveBeenCalledWith('/api/workflows/workflow/wf-1/executions/steps', {
        query: params,
        headers: VERSION_HEADER,
      });
    });
  });

  describe('getExecution', () => {
    it('should call GET /api/workflows/executions/{executionId}', async () => {
      const params = { includeInput: true, includeOutput: false };
      await api.getExecution('exec-1', params);

      expect(http.get).toHaveBeenCalledWith('/api/workflows/executions/exec-1', {
        query: params,
        headers: VERSION_HEADER,
      });
    });
  });

  describe('cancelExecution', () => {
    it('should call POST /api/workflows/executions/{executionId}/cancel', async () => {
      await api.cancelExecution('exec-1');

      expect(http.post).toHaveBeenCalledWith('/api/workflows/executions/exec-1/cancel', {
        headers: VERSION_HEADER,
      });
    });
  });

  describe('getStepExecution', () => {
    it('should call GET /api/workflows/executions/{executionId}/step/{stepExecutionId}', async () => {
      await api.getStepExecution('exec-1', 'step-1');

      expect(http.get).toHaveBeenCalledWith('/api/workflows/executions/exec-1/step/step-1', {
        headers: VERSION_HEADER,
      });
    });
  });

  describe('resumeExecution', () => {
    it('should call POST /api/workflows/executions/{executionId}/resume with input', async () => {
      const input = { answer: 'yes' };
      await api.resumeExecution('exec-1', { input });

      expect(http.post).toHaveBeenCalledWith('/api/workflows/executions/exec-1/resume', {
        body: JSON.stringify({ input }),
        headers: VERSION_HEADER,
      });
    });
  });

  describe('getChildrenExecutions', () => {
    it('should call GET /api/workflows/executions/{executionId}/children', async () => {
      await api.getChildrenExecutions('exec-1');

      expect(http.get).toHaveBeenCalledWith('/api/workflows/executions/exec-1/children', {
        headers: VERSION_HEADER,
      });
    });
  });
});
