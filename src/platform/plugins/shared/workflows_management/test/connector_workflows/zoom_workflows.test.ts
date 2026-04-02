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

const CONNECTOR_NAME = 'fake-zoom-connector';
const CONNECTOR_ID = 'fake-zoom-connector-uuid';

describe('zoom workflows', () => {
  let fixture: WorkflowRunFixture;
  let workflows: ProcessedWorkflow[];

  beforeAll(() => {
    workflows = loadWorkflowsFromConnectorSpec('.zoom', {
      connectorName: CONNECTOR_NAME,
    });
  });

  beforeEach(() => {
    fixture = new WorkflowRunFixture();

    fixture.scopedActionsClientMock.getAll.mockResolvedValue([
      { id: CONNECTOR_ID, name: CONNECTOR_NAME, actionTypeId: '.zoom' },
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
        case 'whoAmI':
          return {
            status: 'ok',
            actionId,
            data: {
              id: 'user-1',
              first_name: 'Test',
              last_name: 'User',
              email: 'test@example.com',
            },
          };
        case 'listMeetings':
          return {
            status: 'ok',
            actionId,
            data: {
              meetings: [{ id: 123, topic: 'Standup', start_time: '2024-01-01T10:00:00Z' }],
            },
          };
        case 'listUserRecordings':
          return {
            status: 'ok',
            actionId,
            data: {
              meetings: [
                {
                  id: 456,
                  topic: 'Recorded Meeting',
                  recording_files: [{ id: 'rec-1', recording_type: 'audio_transcript' }],
                },
              ],
            },
          };
        case 'getMeetingDetails':
          return {
            status: 'ok',
            actionId,
            data: { id: 123, topic: 'Standup', agenda: 'Daily sync', duration: 30 },
          };
        case 'getPastMeetingDetails':
          return {
            status: 'ok',
            actionId,
            data: { id: 123, total_minutes: 28, participants_count: 5 },
          };
        case 'getMeetingRecordings':
          return {
            status: 'ok',
            actionId,
            data: {
              recording_files: [{ id: 'rec-1', recording_type: 'shared_screen_with_speaker_view' }],
            },
          };
        case 'getMeetingParticipants':
          return {
            status: 'ok',
            actionId,
            data: {
              participants: [{ id: 'p1', name: 'Test User', join_time: '2024-01-01T10:00:00Z' }],
            },
          };
        case 'getMeetingRegistrants':
          return {
            status: 'ok',
            actionId,
            data: {
              registrants: [{ id: 'r1', first_name: 'Test', email: 'test@example.com' }],
            },
          };
        case 'downloadRecordingFile':
          return {
            status: 'ok',
            actionId,
            data: { content: 'WEBVTT\n\n00:00:01.000 --> 00:00:05.000\nHello world' },
          };
        default:
          throw new Error(`Unexpected Zoom subAction: ${subAction}`);
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

  describe('who_am_i workflow', () => {
    it('calls whoAmI with no parameters', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'who_am_i'),
        inputs: {},
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'whoAmI',
            subActionParams: {},
          }),
        })
      );
    });
  });

  describe('list workflow', () => {
    it('lists upcoming meetings', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'list'),
        inputs: { list_action: 'listUpcomingMeetings' },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'listMeetings',
            subActionParams: {
              userId: 'me',
              type: 'upcoming',
              pageSize: 20,
              nextPageToken: undefined,
            },
          }),
        })
      );
    });

    it('lists user recordings', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'list'),
        inputs: {
          list_action: 'listUserRecordings',
          from: '2024-01-01',
          to: '2024-01-31',
        },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'listUserRecordings',
            subActionParams: {
              userId: 'me',
              from: '2024-01-01',
              to: '2024-01-31',
              pageSize: 20,
              nextPageToken: undefined,
            },
          }),
        })
      );
    });
  });

  describe('get_meeting workflow', () => {
    it('gets meeting details', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'get_meeting'),
        inputs: { get_action: 'getMeetingDetails', meeting_id: '123' },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'getMeetingDetails',
            subActionParams: {
              meetingId: '123',
            },
          }),
        })
      );
    });

    it('gets meeting recordings', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'get_meeting'),
        inputs: { get_action: 'getMeetingRecordings', meeting_id: '456' },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'getMeetingRecordings',
            subActionParams: {
              meetingId: '456',
            },
          }),
        })
      );
    });

    it('gets meeting participants', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'get_meeting'),
        inputs: { get_action: 'getMeetingParticipants', meeting_id: '123' },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'getMeetingParticipants',
            subActionParams: {
              meetingId: '123',
              pageSize: 20,
              nextPageToken: undefined,
            },
          }),
        })
      );
    });
  });

  describe('download_recording_file workflow', () => {
    it('downloads a recording file by URL', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'download_recording_file'),
        inputs: { download_url: 'https://zoom.us/rec/download/abc123' },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'downloadRecordingFile',
            subActionParams: {
              downloadUrl: 'https://zoom.us/rec/download/abc123',
              maxChars: undefined,
            },
          }),
        })
      );
    });
  });
});
