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
import type { ConnectorStep } from '../fixtures/connector_workflow';
import {
  getConnectorWorkflowYaml,
  PAUSE_SECONDS,
  runWorkflow,
} from '../fixtures/connector_workflow';
import {
  connectToEmulator,
  createConnectorInSpace,
  deleteConnectorInSpace,
  loadScenario,
  setFixtures,
} from '../fixtures/emulator';

const SEARCH = 'GET https://api.search.brave.com/res/v1/web/search';

const STEPS: readonly ConnectorStep[] = [
  ['web_search', 'brave-search.webSearch', { q: 'kibana', count: 3 }],
  // The next page of the same search.
  ['web_search_next_page', 'brave-search.webSearch', { q: 'kibana', count: 3, offset: 1 }],
];
const STEP_NAMES = STEPS.map(([name]) => name);

/**
 * Runs a workflow with a step per action of the Brave Search connector from the Workflows app, with the
 * connector emulator standing in for the vendor. See firecrawl_workflow.spec.ts for how to start the
 * emulator and the Scout servers (the emulator must also serve `.brave-search`), and for the demo pauses.
 */
test.describe(
  'a Brave Search workflow through the Workflows app against the connector emulator',
  // Local only: the connector emulator isn't reachable from Elastic Cloud.
  { tag: ['@local-stateful-classic'] },
  () => {
    let control: EmulatorControl;
    let connectorId: string;

    test.beforeAll(async ({ kbnClient, scoutSpace }) => {
      control = await connectToEmulator('brave-search');
      connectorId = await createConnectorInSpace(kbnClient, scoutSpace.id, {
        connectorTypeId: '.brave-search',
        name: 'Brave Search against the emulator',

        secrets: {
          authType: 'api_key_header',
          'X-Subscription-Token': 'a-token-the-emulator-accepts',
        },
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
      await setFixtures(control, await loadScenario('brave_search'));

      const resultOf = await runWorkflow(
        { page, pageObjects },
        {
          yaml: getConnectorWorkflowYaml({
            title: 'Brave Search',
            connectorId,
            steps: STEPS,
            pauseSeconds: PAUSE_SECONDS,
          }),
          stepNames: STEP_NAMES,
        }
      );

      for (const step of STEP_NAMES) {
        await expect(await pageObjects.workflowExecution.getStep(step)).toHaveCount(1);
      }

      const searched = await resultOf<{
        type: string;
        results: Array<{ title: string; url: string }>;
      }>('web_search');
      expect(searched.type).toBe('search');
      expect(searched.results.map(({ url }) => url)).toStrictEqual([
        'https://www.elastic.co/kibana',
        'https://www.elastic.co/guide/en/kibana/current/index.html',
        'https://github.com/elastic/kibana',
      ]);

      // The second page asked for the offset, and the emulator answered it like the first.
      expect(await resultOf('web_search_next_page', 'input')).toMatchObject({ offset: 1 });

      const { calls } = await control.calls();
      const searches = calls.filter((call) => call.request === SEARCH);
      expect(searches.map(({ captured }) => captured?.request.query)).toMatchObject([
        { q: 'kibana', count: '3' },
        { q: 'kibana', count: '3', offset: '1' },
      ]);
      expect(calls.filter((call) => call.requestViolations.length > 0)).toStrictEqual([]);
    });
  }
);
