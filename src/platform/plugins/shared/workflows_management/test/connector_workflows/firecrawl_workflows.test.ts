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

const CONNECTOR_NAME = 'fake-firecrawl-connector';
const CONNECTOR_ID = 'fake-firecrawl-connector-uuid';

describe('firecrawl workflows', () => {
  let fixture: WorkflowRunFixture;
  let workflows: ProcessedWorkflow[];

  beforeAll(() => {
    workflows = loadWorkflowsFromConnectorSpec('.firecrawl', {
      connectorName: CONNECTOR_NAME,
    });
  });

  beforeEach(() => {
    fixture = new WorkflowRunFixture();

    fixture.scopedActionsClientMock.getAll.mockResolvedValue([
      { id: CONNECTOR_ID, name: CONNECTOR_NAME, actionTypeId: '.firecrawl' },
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
        case 'scrape':
          return {
            status: 'ok',
            actionId,
            data: { markdown: '# Example\nContent here', metadata: { title: 'Example' } },
          };
        case 'search':
          return {
            status: 'ok',
            actionId,
            data: [{ url: 'https://example.com', markdown: '# Result', metadata: {} }],
          };
        case 'map':
          return {
            status: 'ok',
            actionId,
            data: { links: ['https://example.com/p1', 'https://example.com/p2'] },
          };
        case 'crawl':
          return { status: 'ok', actionId, data: { id: 'crawl-job-123', status: 'scraping' } };
        case 'getCrawlStatus':
          return {
            status: 'ok',
            actionId,
            data: { status: 'completed', total: 5, completed: 5, data: [] },
          };
        case 'crawlAndWait':
          return {
            status: 'ok',
            actionId,
            data: { status: 'completed', total: 3, completed: 3, data: [] },
          };
        default:
          throw new Error(`Unexpected Firecrawl subAction: ${subAction}`);
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

  describe('scrape workflow', () => {
    it('forwards scrape parameters to the connector', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'scrape'),
        inputs: { url: 'https://example.com' },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'scrape',
            subActionParams: {
              url: 'https://example.com',
              onlyMainContent: true,
              waitFor: 0,
              maxMarkdownLength: 100000,
            },
          }),
        })
      );
    });
  });

  describe('search workflow', () => {
    it('forwards search parameters to the connector', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'search'),
        inputs: { query: 'kibana plugins', limit: 3 },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'search',
            subActionParams: {
              query: 'kibana plugins',
              limit: 3,
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
        inputs: { url: 'https://example.com', search: 'docs' },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'map',
            subActionParams: {
              url: 'https://example.com',
              search: 'docs',
              limit: 5000,
              includeSubdomains: true,
            },
          }),
        })
      );
    });
  });

  describe('crawl workflow', () => {
    it('crawl action starts an async crawl job', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'crawl'),
        inputs: { crawl_action: 'crawl', url: 'https://example.com', limit: 10 },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'crawl',
            subActionParams: {
              url: 'https://example.com',
              limit: 10,
              maxDiscoveryDepth: undefined,
              allowExternalLinks: false,
            },
          }),
        })
      );
    });

    it('getCrawlStatus checks an existing crawl job', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'crawl'),
        inputs: { crawl_action: 'getCrawlStatus', id: 'crawl-job-123' },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'getCrawlStatus',
            subActionParams: {
              id: 'crawl-job-123',
            },
          }),
        })
      );
    });

    it('crawlAndWait runs a synchronous crawl', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'crawl'),
        inputs: { crawl_action: 'crawlAndWait', url: 'https://example.com' },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'crawlAndWait',
            subActionParams: {
              url: 'https://example.com',
              limit: 20,
              maxDiscoveryDepth: undefined,
              allowExternalLinks: false,
            },
          }),
        })
      );
    });
  });
});
