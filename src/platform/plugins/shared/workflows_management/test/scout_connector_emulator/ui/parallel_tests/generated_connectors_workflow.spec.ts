/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest as test } from '../../../scout/ui/fixtures';
import {
  getConnectorWorkflowYaml,
  PAUSE_SECONDS,
  runWorkflow,
} from '../fixtures/connector_workflow';
import {
  assertRequestsReachEmulator,
  connectToEmulator,
  createConnectorInSpace,
  deleteConnectorInSpace,
  loadScenario,
  setFixtures,
} from '../fixtures/emulator';
import { generateSteps } from '../fixtures/generated_steps';

interface GeneratedConnector {
  /** The connector's folder in `src/specs`. */
  readonly folder: string;
  readonly title: string;
  /** The connector's `metadata.id`. */
  readonly id: string;
  readonly config?: Record<string, unknown>;
}

/**
 * Connectors whose workflow is generated from their specs: one step per action the emulator
 * can answer, with inputs from the action's schema, and the emulator answers with the connector's
 * `vendor_api/emulator_responses.json` if it has one. A connector has to be enabled for Workflows
 * (its `supportedFeatureIds`) for the editor to accept its steps. To test another connector, add it
 * here, with the config it needs to be created and nothing else: the CI step serves every connector
 * with a vendor API manifest. Connectors that need
 * more, such as chaining a step's result into the next or checking what it returned, have a spec of
 * their own in this folder, as Firecrawl does.
 *
 * They all connect with a bearer token, which names the connector for the emulator
 * (`emulate-<name>`), so that connectors with the same relative server URL, such as self-hosted
 * products, are answered by their own specs.
 */
const CONNECTORS: readonly GeneratedConnector[] = [
  {
    folder: 'sentry',
    title: 'Sentry',
    id: '.sentry',
    config: { organizationSlug: 'elastic-demo' },
  },
  {
    folder: 'grafana',
    title: 'Grafana',
    id: '.grafana',
    config: { baseUrl: 'https://your-stack.grafana.net' },
  },
  {
    folder: 'sublime_security',
    title: 'Sublime Security',
    id: '.sublime_security',
    config: { baseUrl: 'https://platform.sublime.security' },
  },
];

/**
 * Runs a workflow generated from each connector's spec from the Workflows app, with the connector
 * emulator standing in for the vendor. See firecrawl_workflow.spec.ts for how to start the emulator
 * and the Scout servers, and for the demo pauses.
 */
test.describe(
  'workflows generated from the connectors specs through the Workflows app against the connector emulator',
  // Local only: the connector emulator isn't reachable from Elastic Cloud.
  { tag: ['@local-stateful-classic'] },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsPrivilegedUser();
    });

    test.afterEach(async ({ apiServices }) => {
      await apiServices.workflows.deleteAll();
    });

    for (const { folder, title, id, config } of CONNECTORS) {
      const name = id.replace(/^\./, '');

      test(`${title}: runs every action, and the emulator answers each request`, async ({
        kbnClient,
        scoutSpace,
        page,
        pageObjects,
      }) => {
        const { steps, probe } = await generateSteps(folder, id);
        const control = await connectToEmulator(name);
        const connectorId = await createConnectorInSpace(kbnClient, scoutSpace.id, {
          connectorTypeId: id,
          name: `${title} against the emulator`,
          config,
          secrets: { authType: 'bearer', token: `emulate-${name}` },
        });

        try {
          // Before any step that changes state at the vendor: the vendor is the emulator.
          await assertRequestsReachEmulator({
            kbnClient,
            spaceId: scoutSpace.id,
            connectorId,
            control,
            action: probe,
          });

          // The connector's realistic responses, when it has them; otherwise the spec's samples.
          await setFixtures(control, await loadScenario(folder, { optional: true }));

          await runWorkflow(
            { page, pageObjects },
            {
              yaml: getConnectorWorkflowYaml({
                title,
                connectorId,
                steps,
                pauseSeconds: PAUSE_SECONDS,
              }),
              stepNames: steps.map(([stepName]) => stepName),
            }
          );

          for (const [stepName] of steps) {
            await expect(await pageObjects.workflowExecution.getStep(stepName)).toHaveCount(1);
          }

          // At least one request per step, and none that breaks the vendor's spec.
          const { calls } = await control.calls();
          expect(calls.length).toBeGreaterThanOrEqual(steps.length);
          expect(calls.filter((call) => call.requestViolations.length > 0)).toStrictEqual([]);
        } finally {
          await deleteConnectorInSpace(kbnClient, scoutSpace.id, connectorId);
        }
      });
    }
  }
);
