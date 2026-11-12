/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EmulatorControl } from '@kbn/connector-emulate';
import { getShodanFixtures } from '@kbn/connector-specs/src/specs/shodan/vendor_api/emulator_responses';
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
  setFixtures,
} from '../fixtures/emulator';

const VENDOR = 'https://api.shodan.io/shodan';

const STEPS: readonly ConnectorStep[] = [
  ['search_hosts', 'shodan.searchHosts', { query: 'apache country:DE' }],
  ['count_results', 'shodan.countResults', { query: 'apache', facets: 'country' }],
  ['get_host_info', 'shodan.getHostInfo', { ip: '8.8.8.8' }],
];
const STEP_NAMES = STEPS.map(([name]) => name);

/**
 * Runs a workflow with a step per action of the Shodan connector from the Workflows app, with the
 * connector emulator standing in for the vendor. See firecrawl_workflow.spec.ts for how to start the
 * emulator and the Scout servers (the emulator must also serve `.shodan`), and for the demo pauses.
 */
test.describe(
  'a Shodan workflow through the Workflows app against the connector emulator',
  // Local only: the connector emulator isn't reachable from Elastic Cloud.
  { tag: ['@local-stateful-classic'] },
  () => {
    let control: EmulatorControl;
    let connectorId: string;

    test.beforeAll(async ({ kbnClient, scoutSpace }) => {
      control = await connectToEmulator('shodan');
      connectorId = await createConnectorInSpace(kbnClient, scoutSpace.id, {
        connectorTypeId: '.shodan',
        name: 'Shodan against the emulator',

        secrets: { authType: 'api_key_header', 'X-Api-Key': 'a-key-the-emulator-accepts' },
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
      await setFixtures(control, [...getShodanFixtures()]);

      const resultOf = await runWorkflow(
        { page, pageObjects },
        {
          yaml: getConnectorWorkflowYaml({
            title: 'Shodan',
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

      const searched = await resultOf<{ total: number; matches: Array<{ ip_str: string }> }>(
        'search_hosts'
      );
      expect(searched.total).toBe(2);
      expect(searched.matches.map(({ ip_str: ip }) => ip)).toStrictEqual([
        '203.0.113.10',
        '203.0.113.24',
      ]);

      const counted = await resultOf<{
        total: number;
        facets: { country: Array<{ value: string }> };
      }>('count_results');
      expect(counted.total).toBe(4812);
      expect(counted.facets.country.map(({ value }) => value)).toStrictEqual(['US', 'DE', 'NL']);

      expect(await resultOf('get_host_info')).toMatchObject({
        ip: '8.8.8.8',
        org: 'Google LLC',
        hostnames: ['dns.google'],
        ports: [53, 443],
      });

      // What the emulator saw: one request per operation, all valid against Shodan's spec.
      const { calls } = await control.calls();
      expect(calls.map(({ request }) => request)).toStrictEqual([
        `GET ${VENDOR}/host/search`,
        `GET ${VENDOR}/host/count`,
        `GET ${VENDOR}/host/8.8.8.8`,
      ]);
      expect(calls.filter((call) => call.requestViolations.length > 0)).toStrictEqual([]);
    });
  }
);
