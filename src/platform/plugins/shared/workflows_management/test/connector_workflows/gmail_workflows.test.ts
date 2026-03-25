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

const CONNECTOR_NAME = 'fake-gmail-connector';
const CONNECTOR_ID = 'fake-gmail-connector-uuid';

describe('gmail workflows', () => {
  let fixture: WorkflowRunFixture;
  let workflows: ProcessedWorkflow[];

  beforeAll(() => {
    workflows = loadWorkflowsFromConnectorSpec('.gmail', {
      connectorName: CONNECTOR_NAME,
    });
  });

  beforeEach(() => {
    fixture = new WorkflowRunFixture();

    fixture.scopedActionsClientMock.getAll.mockResolvedValue([
      { id: CONNECTOR_ID, name: CONNECTOR_NAME, actionTypeId: '.gmail' },
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
        case 'searchMessages':
          return {
            status: 'ok',
            actionId,
            data: {
              messages: [
                { id: 'msg-1', threadId: 'thread-1' },
                { id: 'msg-2', threadId: 'thread-1' },
              ],
              nextPageToken: null,
              resultSizeEstimate: 2,
            },
          };
        case 'listMessages':
          return {
            status: 'ok',
            actionId,
            data: {
              messages: [{ id: 'msg-inbox-1', threadId: 'thread-1' }],
              nextPageToken: null,
              resultSizeEstimate: 1,
            },
          };
        case 'getMessage':
          return {
            status: 'ok',
            actionId,
            data: {
              id: 'msg-1',
              threadId: 'thread-1',
              labelIds: ['INBOX', 'UNREAD'],
              snippet: 'Test email snippet',
              payload: {
                headers: [
                  { name: 'From', value: 'sender@example.com' },
                  { name: 'Subject', value: 'Test subject' },
                ],
              },
            },
          };
        case 'getAttachment':
          return {
            status: 'ok',
            actionId,
            data: { data: 'base64url-encoded-attachment-content' },
          };
        default:
          throw new Error(`Unexpected Gmail subAction: ${subAction}`);
      }
    };
  });

  const getStepExecutions = (stepId: string) =>
    Array.from(fixture.stepExecutionRepositoryMock.stepExecutions.values()).filter(
      (se) => se.stepId === stepId
    );

  const getWorkflowExecution = () =>
    fixture.workflowExecutionRepositoryMock.workflowExecutions.get('fake_workflow_execution_id');

  it('all workflows pass production validation without liquid template errors', () => {
    for (const wf of workflows) {
      expect({ workflow: wf.name, liquidErrors: wf.liquidErrors }).toEqual({
        workflow: wf.name,
        liquidErrors: [],
      });
    }
  });

  describe('search workflow', () => {
    it('forwards search parameters to the connector', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'search'),
        inputs: { query: 'from:alice@example.com is:unread', maxResults: 20 },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);
      expect(getStepExecutions('search_messages')).toHaveLength(1);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'searchMessages',
            subActionParams: expect.objectContaining({
              query: 'from:alice@example.com is:unread',
              maxResults: 20,
            }),
          }),
        })
      );
    });
  });

  describe('list_messages workflow', () => {
    it('forwards list parameters to the connector', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'list_messages'),
        inputs: { maxResults: 10, pageToken: 'next-page-token' },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);
      expect(getStepExecutions('list_messages')).toHaveLength(1);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'listMessages',
            subActionParams: expect.objectContaining({
              maxResults: 10,
              pageToken: 'next-page-token',
            }),
          }),
        })
      );
    });
  });

  describe('get_message workflow', () => {
    it('forwards message ID and format to the connector', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'get_message'),
        inputs: { messageId: 'msg-abc-123', format: 'full' },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);
      expect(getStepExecutions('get_message')).toHaveLength(1);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'getMessage',
            subActionParams: expect.objectContaining({
              messageId: 'msg-abc-123',
              format: 'full',
            }),
          }),
        })
      );
    });
  });

  describe('get_attachment workflow', () => {
    it('forwards message ID and attachment ID to the connector', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'get_attachment'),
        inputs: { messageId: 'msg-123', attachmentId: 'ANGjdJ1' },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);
      expect(getStepExecutions('get_attachment')).toHaveLength(1);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'getAttachment',
            subActionParams: expect.objectContaining({
              messageId: 'msg-123',
              attachmentId: 'ANGjdJ1',
            }),
          }),
        })
      );
    });
  });
});
