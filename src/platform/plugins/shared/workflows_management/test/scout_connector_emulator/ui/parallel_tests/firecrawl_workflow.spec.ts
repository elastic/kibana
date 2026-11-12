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
import { PAUSE_SECONDS, runWorkflow } from '../fixtures/connector_workflow';
import {
  connectToEmulator,
  crawlIdOf,
  createConnectorInSpace,
  deleteConnectorInSpace,
  loadScenario,
  setFixtures,
  VENDOR,
} from '../fixtures/emulator';
import { FIRECRAWL_STEP_NAMES, getFirecrawlWorkflowYaml } from '../fixtures/firecrawl_workflow';

/**
 * Runs a workflow with a step per action of the Firecrawl connector from the Workflows app, with the
 * connector emulator standing in for the vendor, using only the `connector_emulator` server config
 * set:
 *
 *   node scripts/connector_emulate --connector .firecrawl,.brave-search,.shodan,.censys,.jina
 *   node scripts/scout start-server --arch stateful --domain classic --serverConfigSet connector_emulator
 *   node scripts/playwright test --config <this folder>/parallel.playwright.config.ts --project local --headed
 *
 * To watch it with time to read each step's result, start the emulator with --log-responses to see
 * what it answers, and run the test with CONNECTOR_EMULATOR_DEMO_PAUSE_SECONDS=4. The tests of the
 * other connectors in this folder work the same way.
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
      control = await connectToEmulator('firecrawl');
      connectorId = await createConnectorInSpace(kbnClient, scoutSpace.id, {
        connectorTypeId: '.firecrawl',
        name: 'Firecrawl against the emulator',
        secrets: { authType: 'bearer', token: 'a-token-the-emulator-accepts' },
      });
    });

    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsPrivilegedUser();
    });

    test.afterAll(async ({ kbnClient, scoutSpace, apiServices }) => {
      await apiServices.workflows.deleteAll();
      await deleteConnectorInSpace(kbnClient, scoutSpace.id, connectorId);
    });

    test('runs a step per action, and the emulator answers each request', async ({
      page,
      pageObjects,
    }) => {
      await control.reset();
      const scenario = await loadScenario('firecrawl');
      const crawlId = crawlIdOf(scenario);
      await setFixtures(control, scenario);

      const resultOf = await runWorkflow(
        { page, pageObjects },
        {
          yaml: getFirecrawlWorkflowYaml(connectorId, { pauseSeconds: PAUSE_SECONDS }),
          stepNames: FIRECRAWL_STEP_NAMES,
        }
      );

      for (const step of FIRECRAWL_STEP_NAMES) {
        await expect(await pageObjects.workflowExecution.getStep(step)).toHaveCount(1);
      }

      const scraped = await resultOf<{ data: { markdown: string; metadata: { title: string } } }>(
        'scrape'
      );
      expect(scraped.data.metadata.title).toBe('Example Domain');
      expect(scraped.data.markdown).toContain('illustrative examples');

      const searched = await resultOf<{ data: { web: Array<{ title: string; url: string }> } }>(
        'search'
      );
      expect(searched.data.web.map(({ url }) => url)).toStrictEqual([
        'https://www.elastic.co/kibana',
        'https://www.elastic.co/guide/en/kibana/current/index.html',
        'https://github.com/elastic/kibana',
      ]);

      const mapped = await resultOf<{ links: Array<{ url: string }> }>('map');
      expect(mapped.links.map(({ url }) => url)).toContain('https://example.com/docs/api');

      // The id the crawl step returned is what the next step asked the status of.
      expect(await resultOf('crawl')).toMatchObject({ id: crawlId });
      expect(await resultOf('get_crawl_status', 'input')).toMatchObject({ id: crawlId });

      // The crawl had finished two pages when crawlAndWait polled for the last time.
      expect(await resultOf('crawl_and_wait')).toMatchObject({
        status: 'completed',
        total: 2,
        data: [
          { url: 'https://example.com', title: 'Example Domain' },
          { url: 'https://example.com/docs', title: 'Documentation' },
        ],
      });

      // What the emulator saw: one request per vendor operation, all valid against the vendor's
      // spec, and the status of the crawl asked for three times.
      const { calls } = await control.calls();
      const countOf = (request: string) => calls.filter((call) => call.request === request).length;
      expect(countOf(`POST ${VENDOR}/scrape`)).toBe(1);
      expect(countOf(`POST ${VENDOR}/search`)).toBe(1);
      expect(countOf(`POST ${VENDOR}/map`)).toBe(1);
      expect(countOf(`POST ${VENDOR}/crawl`)).toBe(2);
      expect(countOf(`GET ${VENDOR}/crawl/${crawlId}`)).toBe(3);
      expect(calls.filter((call) => call.requestViolations.length > 0)).toStrictEqual([]);
    });
  }
);
