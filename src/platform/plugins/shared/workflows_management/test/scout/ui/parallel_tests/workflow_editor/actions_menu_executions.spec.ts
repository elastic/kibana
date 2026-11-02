/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { spaceTest as test } from '../../fixtures';
import { cleanupWorkflowsAndRules } from '../../fixtures/cleanup';
import { getListTestWorkflowYaml } from '../../fixtures/workflows';

const EXPERIMENTAL_FEATURES_SETTING = 'workflows:experimentalFeatures';
const WORKFLOW_NAME = 'Actions Menu Executions Tab';

test.describe(
  'Workflow editor actions menu on the executions tab',
  {
    tag: [
      ...tags.stateful.classic,
      ...tags.serverless.observability.complete,
      ...tags.serverless.security.complete,
    ],
  },
  () => {
    test.beforeAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.set({
        [EXPERIMENTAL_FEATURES_SETTING]: true,
      });
    });

    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsPrivilegedUser();
    });

    test.afterAll(async ({ scoutSpace, apiServices }) => {
      await scoutSpace.uiSettings.unset(EXPERIMENTAL_FEATURES_SETTING);
      await cleanupWorkflowsAndRules({ scoutSpace, apiServices });
    });

    test('shows the actions menu only while the workflow is editable', async ({
      pageObjects,
      apiServices,
    }) => {
      const { created } = await apiServices.workflows.bulkCreate([
        getListTestWorkflowYaml({
          name: WORKFLOW_NAME,
          description: 'Verify the actions menu is hidden in read-only mode',
          enabled: true,
        }),
      ]);
      const workflowId = created[0].id;

      await test.step('opens the actions menu on the editable workflow tab', async () => {
        await pageObjects.workflowEditor.gotoWorkflow(workflowId);
        await pageObjects.workflowEditor.openActionsMenu();
        await expect(pageObjects.workflowEditor.actionsMenuSearch).toBeVisible();
      });

      await test.step('hides the actions menu on the read-only executions tab', async () => {
        await pageObjects.workflowEditor.gotoWorkflowExecutions(workflowId);
        await expect(pageObjects.workflowEditor.readOnlyBadge).toBeVisible();

        await pageObjects.workflowEditor.expandBottomBar();
        await expect(pageObjects.workflowEditor.actionsMenuButton).toBeHidden();
      });
    });
  }
);
