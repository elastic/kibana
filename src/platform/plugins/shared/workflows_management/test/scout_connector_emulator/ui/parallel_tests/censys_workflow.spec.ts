/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EmulatorControl } from '@kbn/connector-emulate';
import { getCensysFixtures } from '@kbn/connector-specs/src/specs/censys/vendor_api/emulator_responses';
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

const VENDOR = 'https://api.platform.censys.io/v3';
const ORGANIZATION_ID = '8f2c9a1e-4b7d-4e3a-9c5f-1d2e3f4a5b6c';

const STEPS: readonly ConnectorStep[] = [
  ['get_host', 'censys.getHost', { host: '8.8.8.8' }],
  ['get_host_enrichment', 'censys.getHostEnrichment', { host: '8.8.8.8' }],
];
const STEP_NAMES = STEPS.map(([name]) => name);

/**
 * Runs a workflow with a step per action of the Censys connector from the Workflows app, with the
 * connector emulator standing in for the vendor. See firecrawl_workflow.spec.ts for how to start the
 * emulator and the Scout servers (the emulator must also serve `.censys`), and for the demo pauses.
 */
test.describe(
  'a Censys workflow through the Workflows app against the connector emulator',
  // Local only: the connector emulator isn't reachable from Elastic Cloud.
  { tag: ['@local-stateful-classic'] },
  () => {
    let control: EmulatorControl;
    let connectorId: string;

    test.beforeAll(async ({ kbnClient, scoutSpace }) => {
      control = await connectToEmulator('censys');
      connectorId = await createConnectorInSpace(kbnClient, scoutSpace.id, {
        connectorTypeId: '.censys',
        name: 'Censys against the emulator',
        config: { organizationId: ORGANIZATION_ID },
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
      await setFixtures(control, [...getCensysFixtures()]);

      const resultOf = await runWorkflow(
        { page, pageObjects },
        {
          yaml: getConnectorWorkflowYaml({
            title: 'Censys',
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

      for (const step of ['get_host', 'get_host_enrichment']) {
        expect(await resultOf(step)).toMatchObject({
          result: {
            resource: {
              ip: '8.8.8.8',
              autonomous_system: { name: 'GOOGLE' },
              services: [{ port: 53 }, { port: 443 }],
            },
          },
        });
      }

      // What the emulator saw: both lookups in the connector's organization, all valid against
      // Censys's spec.
      const { calls } = await control.calls();
      expect(calls.map(({ request }) => request)).toStrictEqual([
        `GET ${VENDOR}/global/asset/host/8.8.8.8`,
        `GET ${VENDOR}/global/asset/enrichment/host/8.8.8.8`,
      ]);
      expect(calls.map(({ captured }) => captured?.request.query)).toMatchObject([
        { organization_id: ORGANIZATION_ID },
        { organization_id: ORGANIZATION_ID },
      ]);
      expect(calls.filter((call) => call.requestViolations.length > 0)).toStrictEqual([]);
    });
  }
);
