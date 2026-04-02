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

const CONNECTOR_NAME = 'fake-pagerduty-connector';
const CONNECTOR_ID = 'fake-pagerduty-connector-uuid';

const mockResponse = (data: unknown) => (Array.isArray(data) ? data : [data]);

describe('pagerduty workflows', () => {
  let fixture: WorkflowRunFixture;
  let workflows: ProcessedWorkflow[];

  beforeAll(() => {
    workflows = loadWorkflowsFromConnectorSpec('.pagerduty_mcp', {
      connectorName: CONNECTOR_NAME,
    });
  });

  beforeEach(() => {
    fixture = new WorkflowRunFixture();

    fixture.scopedActionsClientMock.getAll.mockResolvedValue([
      { id: CONNECTOR_ID, name: CONNECTOR_NAME, actionTypeId: '.pagerduty_mcp' },
    ]);

    registerExtensionSteps(fixture);

    fixture.scopedActionsClientMock.returnMockedConnectorResult = async ({
      actionId,
    }: {
      actionId: string;
      params: Record<string, unknown>;
    }): Promise<ActionTypeExecutorResult<unknown>> => ({
      status: 'ok',
      actionId,
      data: mockResponse({ response: [] }),
    });
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
    it('calls getUserData with no arguments', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'who_am_i'),
        inputs: {},
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'getUserData',
            subActionParams: {},
          }),
        })
      );
    });
  });

  describe('search workflow', () => {
    it('searches users via listUsers action', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'search'),
        inputs: { item_type: 'users', limit: 5, query: 'john' },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'listUsers',
            subActionParams: {
              limit: 5,
              query: 'john',
            },
          }),
        })
      );
    });

    it('searches schedules via listSchedules action', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'search'),
        inputs: { item_type: 'schedules', limit: 10, query: 'primary' },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'listSchedules',
            subActionParams: {
              limit: 10,
              query: 'primary',
              include: [],
            },
          }),
        })
      );
    });
  });

  describe('get_incidents workflow', () => {
    it('calls listIncidents action with filter params', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'get_incidents'),
        inputs: { limit: 10, status: ['triggered', 'acknowledged'] },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'listIncidents',
            subActionParams: {
              limit: 10,
              status: ['triggered', 'acknowledged'],
              service_ids: [],
              user_ids: [],
              since: undefined,
              until: undefined,
              urgencies: [],
              request_scope: undefined,
              sort_by: [],
            },
          }),
        })
      );
    });
  });

  describe('get_by_id workflow', () => {
    it('retrieves an incident by ID', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'get_by_id'),
        inputs: { item_type: 'incident', id: 'P123ABC' },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'getIncident',
            subActionParams: {
              incident_id: 'P123ABC',
            },
          }),
        })
      );
    });

    it('retrieves a schedule by ID', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'get_by_id'),
        inputs: { item_type: 'schedule', id: 'PSCHED1' },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'getSchedule',
            subActionParams: {
              schedule_id: 'PSCHED1',
            },
          }),
        })
      );
    });
  });

  describe('get_oncalls workflow', () => {
    it('calls listOncalls action', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'get_oncalls'),
        inputs: { limit: 5 },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'listOncalls',
            subActionParams: {
              limit: 5,
              schedule_ids: [],
              user_ids: [],
              escalation_policy_ids: [],
              since: undefined,
              until: undefined,
              time_zone: undefined,
              earliest: undefined,
            },
          }),
        })
      );
    });
  });

  describe('get_escalation_policies workflow', () => {
    it('calls listEscalationPolicies action', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'get_escalation_policies'),
        inputs: { query: 'production', limit: 10 },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'listEscalationPolicies',
            subActionParams: {
              query: 'production',
              limit: 10,
              user_ids: [],
              team_ids: [],
            },
          }),
        })
      );
    });
  });
});
