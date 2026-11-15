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

const STEPS: readonly ConnectorStep[] = [
  ['browse', 'jina.browse', { url: 'https://example.com' }],
  ['search', 'jina.search', { query: 'kibana' }],
];
const STEP_NAMES = STEPS.map(([name]) => name);

/**
 * Runs a workflow with a step per action of the Jina Reader connector from the Workflows app, with the
 * connector emulator standing in for the vendor. See firecrawl_workflow.spec.ts for how to start the
 * emulator and the Scout servers (the emulator must also serve `.jina`), and for the demo pauses.
 */
test.describe(
  'a Jina Reader workflow through the Workflows app against the connector emulator',
  // Local only: the connector emulator isn't reachable from Elastic Cloud.
  { tag: ['@local-stateful-classic'] },
  () => {
    let control: EmulatorControl;
    let connectorId: string;

    test.beforeAll(async ({ kbnClient, scoutSpace }) => {
      control = await connectToEmulator('jina');
      connectorId = await createConnectorInSpace(kbnClient, scoutSpace.id, {
        connectorTypeId: '.jina',
        name: 'Jina Reader against the emulator',

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
      await setFixtures(control, await loadScenario('jina'));

      const resultOf = await runWorkflow(
        { page, pageObjects },
        {
          yaml: getConnectorWorkflowYaml({
            title: 'Jina Reader',
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

      const browsed = await resultOf<{ ok: boolean; title: string; content: string }>('browse');
      expect(browsed).toMatchObject({ ok: true, title: 'Example Domain' });
      expect(browsed.content).toContain('illustrative examples');

      const searched = await resultOf<{ ok: boolean; results: Array<{ url: string }> }>('search');
      expect(searched.ok).toBe(true);
      expect(searched.results.map(({ url }) => url)).toStrictEqual([
        'https://www.elastic.co/kibana',
        'https://github.com/elastic/kibana',
      ]);

      // Browsing and searching are answered from different hosts, one request each.
      const { calls } = await control.calls();
      expect(calls.map(({ request }) => request)).toStrictEqual([
        'POST https://r.jina.ai/',
        'POST https://s.jina.ai/',
      ]);
      expect(calls.filter((call) => call.requestViolations.length > 0)).toStrictEqual([]);
    });
  }
);
