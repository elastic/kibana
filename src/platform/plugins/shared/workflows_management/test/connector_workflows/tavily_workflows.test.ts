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

const CONNECTOR_NAME = 'fake-tavily-connector';
const CONNECTOR_ID = 'fake-tavily-connector-uuid';

describe('tavily workflows', () => {
  let fixture: WorkflowRunFixture;
  let workflows: ProcessedWorkflow[];

  beforeAll(() => {
    workflows = loadWorkflowsFromConnectorSpec('.tavily_mcp', {
      connectorName: CONNECTOR_NAME,
    });
  });

  beforeEach(() => {
    fixture = new WorkflowRunFixture();

    fixture.scopedActionsClientMock.getAll.mockResolvedValue([
      { id: CONNECTOR_ID, name: CONNECTOR_NAME, actionTypeId: '.tavily_mcp' },
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
      data: [
        {
          query: 'test',
          answer: 'answer',
          response_time: 0.5,
          results: [
            {
              title: 'Result',
              url: 'https://example.com',
              content: 'content',
              score: 0.9,
              published_date: '2024-01-01',
            },
          ],
        },
      ],
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

  describe('search workflow', () => {
    it('forwards search parameters to the connector', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'search'),
        inputs: { query: 'kibana dashboards', max_results: 5, search_depth: 'advanced' },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'tavilySearch',
            subActionParams: {
              query: 'kibana dashboards',
              max_results: 5,
              search_depth: 'advanced',
              include_raw_content: false,
            },
          }),
        })
      );
    });
  });

  describe('extract workflow', () => {
    it('forwards extract parameters to the connector', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'extract'),
        inputs: { urls: ['https://example.com', 'https://example.org'] },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'tavilyExtract',
            subActionParams: {
              urls: ['https://example.com', 'https://example.org'],
              extract_depth: 'basic',
              include_images: false,
            },
          }),
        })
      );
    });
  });

  describe('map workflow', () => {
    it('forwards map parameters to the connector', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'map'),
        inputs: { url: 'https://example.com', instructions: 'find docs' },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'tavilyMap',
            subActionParams: {
              url: 'https://example.com',
              max_depth: 1,
              max_breadth: 20,
              limit: 50,
              instructions: 'find docs',
            },
          }),
        })
      );
    });
  });

  describe('crawl workflow', () => {
    it('forwards crawl parameters to the connector', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'crawl'),
        inputs: { url: 'https://example.com', limit: 10, extract_depth: 'advanced' },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'tavilyCrawl',
            subActionParams: {
              url: 'https://example.com',
              max_depth: 1,
              max_breadth: 20,
              limit: 10,
              instructions: undefined,
              extract_depth: 'advanced',
            },
          }),
        })
      );
    });
  });
});
