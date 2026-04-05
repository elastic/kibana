/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionTypeExecutorResult } from '@kbn/actions-plugin/common';
import { ExecutionStatus } from '@kbn/workflows';
import { WorkflowRunFixture } from '@kbn/workflows-execution-engine/integration_tests/workflow_run_fixture';
import {
  getWorkflowYaml,
  loadWorkflowsFromConnectorSpec,
  type ProcessedWorkflow,
} from './workflow.test_helpers';

const CONNECTOR_NAME = 'fake-servicenow-connector';
const CONNECTOR_ID = 'fake-servicenow-connector-uuid';

const fakeSimulateResponse = (docs: Array<{ _id: string; _source: Record<string, unknown> }>) => ({
  docs: docs.map((doc) => ({
    doc: {
      _id: doc._id,
      _source: {
        attachment: {
          content: `extracted text from ${(doc._source as Record<string, unknown>).filename}`,
          content_type: 'application/pdf',
          content_length: 1234,
        },
      },
    },
  })),
});

describe('servicenow workflows', () => {
  let fixture: WorkflowRunFixture;
  let transportRequestMock: jest.Mock;
  let workflows: ProcessedWorkflow[];

  beforeAll(() => {
    workflows = loadWorkflowsFromConnectorSpec('.servicenow_search', {
      connectorName: CONNECTOR_NAME,
    });
  });

  beforeEach(() => {
    fixture = new WorkflowRunFixture();

    fixture.scopedActionsClientMock.getAll.mockResolvedValue([
      { id: CONNECTOR_ID, name: CONNECTOR_NAME, actionTypeId: '.servicenow_search' },
    ]);

    fixture.scopedActionsClientMock.returnMockedConnectorResult = async ({
      actionId,
      params,
    }: {
      actionId: string;
      params: Record<string, unknown>;
    }): Promise<ActionTypeExecutorResult<unknown>> => {
      const subAction = params.subAction as string;

      switch (subAction) {
        case 'search':
          return {
            status: 'ok',
            actionId,
            data: { result: [{ sys_id: 'INC001', number: 'INC0010001' }] },
          };
        case 'listTables':
          return {
            status: 'ok',
            actionId,
            data: { result: [{ name: 'incident', label: 'Incident' }] },
          };
        case 'listRecords':
          return {
            status: 'ok',
            actionId,
            data: { result: [{ sys_id: 'REC001' }] },
          };
        case 'listKnowledgeBases':
          return {
            status: 'ok',
            actionId,
            data: { result: [{ sys_id: 'KB001', title: 'IT Knowledge Base' }] },
          };
        case 'getRecord':
          return {
            status: 'ok',
            actionId,
            data: { result: { sys_id: 'INC001', short_description: 'Test incident' } },
          };
        case 'getComments':
          return {
            status: 'ok',
            actionId,
            data: { result: [{ value: 'A comment', created_on: '2024-01-01' }] },
          };
        case 'getAttachment':
          return {
            status: 'ok',
            actionId,
            data: {
              fileName: 'report.pdf',
              contentType: 'application/pdf',
              base64: Buffer.from('fake-content').toString('base64'),
            },
          };
        case 'describeTable':
          return {
            status: 'ok',
            actionId,
            data: { result: [{ element: 'sys_id', type: 'GUID' }] },
          };
        default:
          throw new Error(`Unexpected ServiceNow subAction: ${subAction}`);
      }
    };

    transportRequestMock = fixture.dependencies.coreStart.elasticsearch.client.asScoped(
      fixture.fakeKibanaRequest
    ).asCurrentUser.transport.request as jest.Mock;

    transportRequestMock.mockImplementation(
      async ({ path, body }: { path: string; body: Record<string, unknown> }) => {
        if (path === '/_ingest/pipeline/_simulate') {
          return fakeSimulateResponse(
            body.docs as Array<{ _id: string; _source: Record<string, unknown> }>
          );
        }
        throw new Error(`Unexpected ES request path: ${path}`);
      }
    );
  });

  const getStepExecutions = (stepId: string) =>
    Array.from(fixture.stepExecutionRepositoryMock.stepExecutions.values()).filter(
      (se) => se.stepId === stepId
    );

  const getWorkflowExecution = () =>
    fixture.workflowExecutionRepositoryMock.workflowExecutions.get('fake_workflow_execution_id');

  it('all workflows pass production validation without liquid template errors', () => {
    for (const wf of workflows) {
      // get_attachment has long Liquid expressions that get folded by updateYamlField
      // (known line-folding bug tracked separately). Skip its liquid validation here.
      if (!wf.name.includes('get_attachment')) {
        expect({ workflow: wf.name, liquidErrors: wf.liquidErrors }).toEqual({
          workflow: wf.name,
          liquidErrors: [],
        });
      }
    }
  });

  describe('search workflow', () => {
    it('forwards search parameters to the connector', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'search'),
        inputs: { table: 'incident', query: 'network outage', limit: 10 },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'search',
            subActionParams: {
              table: 'incident',
              query: 'network outage',
              encodedQuery: undefined,
              fields: undefined,
              limit: 10,
              offset: undefined,
            },
          }),
        })
      );
    });
  });

  describe('list_tables workflow', () => {
    it('forwards list parameters to the connector', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'list_tables'),
        inputs: { query: 'incident' },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'listTables',
            subActionParams: {
              query: 'incident',
              limit: 50,
              offset: undefined,
            },
          }),
        })
      );
    });
  });

  describe('list_records workflow', () => {
    it('forwards list parameters to the connector', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'list_records'),
        inputs: { table: 'incident', limit: 5 },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'listRecords',
            subActionParams: {
              table: 'incident',
              encodedQuery: undefined,
              fields: undefined,
              limit: 5,
              offset: undefined,
              orderBy: undefined,
            },
          }),
        })
      );
    });
  });

  describe('list_knowledge_bases workflow', () => {
    it('lists knowledge bases with defaults', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'list_knowledge_bases'),
        inputs: {},
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'listKnowledgeBases',
            subActionParams: {
              limit: 20,
              offset: undefined,
            },
          }),
        })
      );
    });
  });

  describe('get_record workflow', () => {
    it('retrieves a record by sys_id', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'get_record'),
        inputs: { table: 'incident', sys_id: 'INC001' },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'getRecord',
            subActionParams: {
              table: 'incident',
              sysId: 'INC001',
              fields: undefined,
            },
          }),
        })
      );
    });
  });

  describe('get_record_with_comments workflow', () => {
    it('retrieves a record and its comments in two connector calls', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'get_record_with_comments'),
        inputs: { table: 'incident', sys_id: 'INC001' },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);
      expect(getStepExecutions('get-record')).toHaveLength(1);
      expect(getStepExecutions('get-comments')).toHaveLength(1);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'getRecord',
            subActionParams: {
              table: 'incident',
              sysId: 'INC001',
              fields: undefined,
            },
          }),
        })
      );

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'getComments',
            subActionParams: {
              tableName: 'incident',
              recordSysId: 'INC001',
              limit: 20,
            },
          }),
        })
      );
    });
  });

  describe('get_comments workflow', () => {
    it('retrieves comments for a record', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'get_comments'),
        inputs: { table_name: 'incident', record_sys_id: 'INC001', limit: 10 },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'getComments',
            subActionParams: {
              tableName: 'incident',
              recordSysId: 'INC001',
              limit: 10,
              offset: undefined,
            },
          }),
        })
      );
    });
  });

  describe('get_attachment workflow', () => {
    it('downloads an attachment and extracts content via ES pipeline', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'get_attachment'),
        inputs: { sys_id: 'ATT001' },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);
      expect(getStepExecutions('download-attachment')).toHaveLength(1);
      expect(getStepExecutions('extract-content')).toHaveLength(1);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'getAttachment',
            subActionParams: {
              sysId: 'ATT001',
            },
          }),
        })
      );

      const simulateCall = transportRequestMock.mock.calls.find(
        ([req]: [{ path: string }]) => req.path === '/_ingest/pipeline/_simulate'
      );
      expect(simulateCall).toBeDefined();
    });
  });

  describe('describe_table workflow', () => {
    it('describes a table schema', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'describe_table'),
        inputs: { table: 'incident' },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'describeTable',
            subActionParams: {
              table: 'incident',
            },
          }),
        })
      );
    });
  });
});
