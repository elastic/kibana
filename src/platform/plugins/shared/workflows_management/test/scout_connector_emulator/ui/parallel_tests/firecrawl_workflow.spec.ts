/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EmulatorControl } from '@kbn/connector-emulate';
import { expect } from '@kbn/scout/ui';
import { spaceTest as test } from '../../../scout/ui/fixtures';
import { LONG_EXECUTION_TIMEOUT } from '../../../scout/ui/fixtures/constants';
import { connectToEmulator, crawlStatus, CRAWL_ID, VENDOR } from '../fixtures/emulator';
import { getFirecrawlWorkflowYaml } from '../fixtures/firecrawl_workflow';

const STEPS = ['scrape', 'search', 'map', 'crawl', 'get_crawl_status', 'crawl_and_wait'];

/**
 * Runs a workflow with a step per action of the Firecrawl connector from the Workflows app, with the
 * connector emulator standing in for the vendor, using only the `connector_emulator` server config
 * set:
 *
 *   node scripts/connector_emulate --connector firecrawl
 *   node scripts/scout start-server --arch stateful --domain classic --serverConfigSet connector_emulator
 *   node scripts/playwright test --config <this folder>/parallel.playwright.config.ts --project local --headed
 *
 * The tests share the emulator's calls and runtime fixtures, so they run one at a time (one worker).
 */
test.describe(
  'a Firecrawl workflow through the Workflows app against the connector emulator',
  // Local only: the connector emulator isn't reachable from Elastic Cloud.
  { tag: ['@local-stateful-classic'] },
  () => {
    let control: EmulatorControl;
    let connectorId: string;

    test.beforeAll(async ({ kbnClient, scoutSpace }) => {
      control = await connectToEmulator();
      const { data } = await kbnClient.request<{ id: string }>({
        method: 'POST',
        path: `/s/${scoutSpace.id}/api/actions/connector`,
        body: {
          connector_type_id: '.firecrawl',
          name: 'Firecrawl against the emulator',
          config: {},
          // The emulator accepts any credential.
          secrets: { authType: 'bearer', token: 'a-token-the-emulator-accepts' },
        },
      });
      connectorId = data.id;
    });

    test.afterAll(async ({ kbnClient, scoutSpace, apiServices }) => {
      await apiServices.workflows.deleteAll();
      await kbnClient.request({
        method: 'DELETE',
        path: `/s/${scoutSpace.id}/api/actions/connector/${connectorId}`,
      });
    });

    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsPrivilegedUser();
    });

    test('runs a step per action, and the emulator answers each request', async ({
      pageObjects,
    }) => {
      await control.reset();
      // The crawl is still running for the first two requests for its status, and has completed
      // at the third: the status step takes the first, crawlAndWait polls for the others.
      await control.setFixtures([
        {
          operation: { source: 'v2', method: 'post', path: '/crawl' },
          response: {
            status: 200,
            body: { success: true, id: CRAWL_ID, url: `${VENDOR}/crawl/${CRAWL_ID}` },
          },
        },
        {
          operation: { source: 'v2', method: 'get', path: '/crawl/{id}' },
          responses: [
            { status: 200, body: crawlStatus('scraping') },
            { status: 200, body: crawlStatus('scraping') },
            { status: 200, body: crawlStatus('completed') },
          ],
        },
      ]);

      await pageObjects.workflowEditor.gotoNewWorkflow();
      await pageObjects.workflowEditor.setYamlEditorValue(getFirecrawlWorkflowYaml(connectorId));
      await pageObjects.workflowEditor.saveWorkflow();

      await pageObjects.workflowEditor.clickRunButton();
      await pageObjects.workflowExecution.waitForExecutionStatus(
        'completed',
        LONG_EXECUTION_TIMEOUT
      );
      await pageObjects.workflowExecution.expandStepsTree();

      for (const step of STEPS) {
        await expect(await pageObjects.workflowExecution.getStep(step)).toHaveCount(1);
      }

      // The id the crawl step returned is what the next step asked the status of.
      await (await pageObjects.workflowExecution.getStep('crawl')).click();
      expect(await pageObjects.workflowExecution.getStepResultJson('output')).toMatchObject({
        id: CRAWL_ID,
      });
      await (await pageObjects.workflowExecution.getStep('get_crawl_status')).click();
      expect(await pageObjects.workflowExecution.getStepResultJson('input')).toMatchObject({
        id: CRAWL_ID,
      });
      await (await pageObjects.workflowExecution.getStep('crawl_and_wait')).click();
      expect(await pageObjects.workflowExecution.getStepResultJson('output')).toMatchObject({
        status: 'completed',
      });

      // What the emulator saw: one request per vendor operation, all valid against the vendor's
      // spec, and the status of the crawl asked for three times.
      const { calls } = await control.calls();
      const countOf = (request: string) => calls.filter((call) => call.request === request).length;
      expect(countOf(`POST ${VENDOR}/scrape`)).toBe(1);
      expect(countOf(`POST ${VENDOR}/search`)).toBe(1);
      expect(countOf(`POST ${VENDOR}/map`)).toBe(1);
      expect(countOf(`POST ${VENDOR}/crawl`)).toBe(2);
      expect(countOf(`GET ${VENDOR}/crawl/${CRAWL_ID}`)).toBe(3);
      expect(calls.filter((call) => call.requestViolations.length > 0)).toEqual([]);
    });
  }
);
