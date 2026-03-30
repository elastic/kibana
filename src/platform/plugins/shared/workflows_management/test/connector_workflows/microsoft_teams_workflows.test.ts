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
  registerExtensionSteps,
} from './workflow.test_helpers';

const CONNECTOR_NAME = 'fake-microsoft-teams-connector';
const CONNECTOR_ID = 'fake-ms-teams-connector-uuid';

const MOCK_TEAMS_RESPONSE = {
  value: [
    {
      id: 'team-1',
      displayName: 'Engineering',
      description: 'Engineering team',
      isArchived: false,
    },
  ],
};

const MOCK_CHANNELS_RESPONSE = {
  value: [
    {
      id: 'channel-1',
      displayName: 'General',
      membershipType: 'standard',
      webUrl: 'https://teams.microsoft.com/channel-1',
    },
  ],
};

const MOCK_MESSAGES_RESPONSE = {
  value: [
    {
      id: 'msg-1',
      messageType: 'message',
      createdDateTime: '2025-01-01T10:00:00Z',
      from: { user: { displayName: 'Alice' } },
      body: { contentType: 'text', content: 'Hello team!' },
      webUrl: 'https://teams.microsoft.com/msg-1',
    },
  ],
};

const MOCK_CHATS_RESPONSE = {
  value: [
    {
      id: 'chat-1',
      topic: 'Project Discussion',
      chatType: 'group',
      webUrl: 'https://teams.microsoft.com/chat-1',
    },
  ],
};

const MOCK_SEARCH_RESPONSE = {
  value: [
    {
      hitsContainers: [
        {
          hits: [
            {
              hitId: 'hit-1',
              rank: 1,
              summary: 'project update...',
              resource: {
                id: 'msg-1',
                createdDateTime: '2025-01-01T10:00:00Z',
                from: { user: { displayName: 'Bob' } },
                body: { content: 'Here is the project update' },
                webUrl: 'https://teams.microsoft.com/msg-1',
              },
            },
          ],
          total: 1,
          moreResultsAvailable: false,
        },
      ],
    },
  ],
};

describe('microsoft teams workflows', () => {
  let fixture: WorkflowRunFixture;
  let workflows: ProcessedWorkflow[];

  beforeAll(() => {
    workflows = loadWorkflowsFromConnectorSpec('.microsoft-teams', {
      connectorName: CONNECTOR_NAME,
    });
  });

  beforeEach(() => {
    fixture = new WorkflowRunFixture();

    fixture.scopedActionsClientMock.getAll.mockResolvedValue([
      { id: CONNECTOR_ID, name: CONNECTOR_NAME, actionTypeId: '.microsoft-teams' },
    ]);

    registerExtensionSteps(fixture);

    fixture.scopedActionsClientMock.returnMockedConnectorResult = async ({
      actionId,
      params,
    }: {
      actionId: string;
      params: Record<string, unknown>;
    }): Promise<ActionTypeExecutorResult<unknown>> => {
      const subAction = params.subAction as string;

      switch (subAction) {
        case 'listJoinedTeams':
          return { status: 'ok', actionId, data: MOCK_TEAMS_RESPONSE };
        case 'listChannels':
          return { status: 'ok', actionId, data: MOCK_CHANNELS_RESPONSE };
        case 'listChannelMessages':
          return { status: 'ok', actionId, data: MOCK_MESSAGES_RESPONSE };
        case 'listChats':
          return { status: 'ok', actionId, data: MOCK_CHATS_RESPONSE };
        case 'listChatMessages':
          return { status: 'ok', actionId, data: MOCK_MESSAGES_RESPONSE };
        case 'searchMessages':
          return { status: 'ok', actionId, data: MOCK_SEARCH_RESPONSE };
        default:
          throw new Error(`Unexpected Microsoft Teams subAction: ${subAction}`);
      }
    };
  });

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
    it('forwards query to the searchMessages connector action', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'search'),
        inputs: { query: 'project update' },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'searchMessages',
            subActionParams: expect.objectContaining({
              query: 'project update',
            }),
          }),
        })
      );
    });

    it('forwards optional pagination parameters', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'search'),
        inputs: { query: 'meeting notes', from: 0, size: 10 },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'searchMessages',
            subActionParams: expect.objectContaining({
              query: 'meeting notes',
              from: 0,
              size: 10,
            }),
          }),
        })
      );
    });
  });

  describe('list workflow', () => {
    it('calls listJoinedTeams when list_action is listJoinedTeams', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'list'),
        inputs: { list_action: 'listJoinedTeams' },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'listJoinedTeams',
          }),
        })
      );
    });

    it('calls listChannels with team_id when list_action is listChannels', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'list'),
        inputs: { list_action: 'listChannels', team_id: 'team-abc' },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'listChannels',
            subActionParams: expect.objectContaining({
              teamId: 'team-abc',
            }),
          }),
        })
      );
    });

    it('calls listChannelMessages with team_id and channel_id', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'list'),
        inputs: { list_action: 'listChannelMessages', team_id: 'team-abc', channel_id: 'chan-xyz' },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'listChannelMessages',
            subActionParams: expect.objectContaining({
              teamId: 'team-abc',
              channelId: 'chan-xyz',
            }),
          }),
        })
      );
    });

    it('calls listChats when list_action is listChats', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'list'),
        inputs: { list_action: 'listChats' },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'listChats',
          }),
        })
      );
    });

    it('calls listChatMessages with chat_id when list_action is listChatMessages', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'list'),
        inputs: { list_action: 'listChatMessages', chat_id: 'chat-789' },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'listChatMessages',
            subActionParams: expect.objectContaining({
              chatId: 'chat-789',
            }),
          }),
        })
      );
    });
  });
});
