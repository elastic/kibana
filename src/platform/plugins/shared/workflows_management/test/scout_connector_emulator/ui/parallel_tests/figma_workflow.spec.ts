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
  authorizeConnector,
  connectToEmulator,
  createConnectorInSpace,
  deleteConnectorInSpace,
  loadScenario,
  setFixtures,
} from '../fixtures/emulator';

const API = 'https://api.figma.com/v1';

const STEPS: readonly ConnectorStep[] = [
  ['who_am_i', 'figma.whoAmI', {}],
  ['list_team_projects', 'figma.listTeamProjects', { teamId: '4821' }],
  // What each step finds goes to the next: a project, then its files, then a file and its pages.
  [
    'list_project_files',
    'figma.listProjectFiles',
    { projectId: '{{ steps.list_team_projects.output.projects[0].id }}' },
  ],
  [
    'get_file',
    'figma.getFile',
    { fileKey: '{{ steps.list_project_files.output.files[0].key }}', depth: 2 },
  ],
  [
    'render_nodes',
    'figma.renderNodes',
    {
      fileKey: '{{ steps.list_project_files.output.files[0].key }}',
      nodeIds: '{{ steps.get_file.output.document.children[0].id }}',
      format: 'png',
    },
  ],
];
const STEP_NAMES = STEPS.map(([name]) => name);

/**
 * Runs a workflow with a step per action of the Figma connector from the Workflows app, with the
 * connector emulator standing in for Figma. Figma connects with OAuth, so the test first authorizes
 * the connector through Kibana's OAuth flow, as its user would at Figma (see figma_oauth_actions
 * .spec.ts in the connector's API suite), and the steps then call Figma with the access token.
 * See firecrawl_workflow.spec.ts for how to start the emulator and the Scout servers; the
 * emulator must also serve `.figma`.
 */
test.describe(
  'a Figma workflow through the Workflows app against the connector emulator',
  // Local only: the connector emulator isn't reachable from Elastic Cloud.
  { tag: ['@local-stateful-classic'] },
  () => {
    let control: EmulatorControl;
    let connectorId: string;

    test.beforeAll(async ({ config, kbnClient, samlAuth, scoutSpace }) => {
      control = await connectToEmulator('figma');
      connectorId = await createConnectorInSpace(kbnClient, scoutSpace.id, {
        connectorTypeId: '.figma',
        name: 'Figma against the emulator',
        secrets: {
          authType: 'oauth_authorization_code',
          // The emulator finds the connector a request is for by the client id.
          clientId: 'emulate-figma',
          clientSecret: 'a-secret-the-emulator-accepts',
          authorizationUrl: 'https://www.figma.com/oauth',
          tokenUrl: `${API}/oauth/token`,
          scope: 'current_user:read file_content:read projects:read',
        },
      });

      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      await authorizeConnector({
        kibanaUrl: config.hosts.kibana.replace(/\/$/, ''),
        spaceId: scoutSpace.id,
        connectorId,
        cookieHeader,
      });
    });

    // An OAuth connector's tokens belong to the user who authorized it, and a workflow runs as the
    // user who started it, so the browser signs in as the user the connector was authorized as.
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test.afterAll(async ({ kbnClient, scoutSpace, apiServices }) => {
      await apiServices.workflows.deleteAll();
      await deleteConnectorInSpace(kbnClient, scoutSpace.id, connectorId);
    });

    test('runs a step per action with the access token, and the emulator answers each request', async ({
      page,
      pageObjects,
    }) => {
      await control.reset();
      await setFixtures(control, await loadScenario('figma'));

      const resultOf = await runWorkflow(
        { page, pageObjects },
        {
          yaml: getConnectorWorkflowYaml({
            title: 'Figma',
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

      expect(await resultOf('who_am_i')).toMatchObject({
        handle: 'Ada Lovelace',
        email: 'ada@example.com',
      });

      const projects = await resultOf<{ teamId: string; projects: Array<{ id: string }> }>(
        'list_team_projects'
      );
      expect(projects.teamId).toBe('4821');

      const files = await resultOf<{ files: Array<{ key: string; name: string }> }>(
        'list_project_files'
      );
      expect(files.files.map(({ name }) => name)).toStrictEqual(['Onboarding flow', 'Settings']);
      const [{ key: fileKey }] = files.files;

      const file = await resultOf<{ name: string; document: { children: Array<{ id: string }> } }>(
        'get_file'
      );
      expect(file.name).toBe('Onboarding flow');
      const [{ id: pageId }] = file.document.children;

      // The page found in the file is the node the last step rendered.
      expect(await resultOf('render_nodes')).toMatchObject({
        images: { [pageId]: expect.stringContaining('welcome.png') },
      });

      // What the emulator saw: one request per step, each with the access token its authorization
      // got, and all valid against Figma's spec.
      const { calls } = await control.calls();
      expect(calls.map(({ request }) => request)).toStrictEqual([
        `GET ${API}/me`,
        `GET ${API}/teams/4821/projects`,
        `GET ${API}/projects/${projects.projects[0].id}/files`,
        `GET ${API}/files/${fileKey}`,
        `GET ${API}/images/${fileKey}`,
      ]);
      expect(calls.map(({ captured }) => captured?.request.headers.authorization)).toStrictEqual(
        calls.map(() => 'Bearer [redacted]')
      );
      expect(calls.filter((call) => call.requestViolations.length > 0)).toStrictEqual([]);
    });
  }
);
