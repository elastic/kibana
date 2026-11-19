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
import { getMultiStepGraphWorkflowYaml } from '../../fixtures/workflows';

const EXPERIMENTAL_FEATURES_SETTING = 'workflows:experimentalFeatures';
// The YAML layer is always mounted; the editor marks it `inert` while the graph is shown.
const INERT_ANCESTOR = 'xpath=ancestor::*[@inert]';
const FIRST_WORKFLOW_NAME = 'View Switch First';
const SECOND_WORKFLOW_NAME = 'View Switch Second';

test.describe(
  'Workflow editor view toggle across workflows',
  {
    tag: [
      ...tags.stateful.classic,
      ...tags.serverless.observability.complete,
      ...tags.serverless.security.complete,
    ],
  },
  () => {
    test.beforeAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.set({ [EXPERIMENTAL_FEATURES_SETTING]: true });
    });

    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsPrivilegedUser();
    });

    test.afterAll(async ({ scoutSpace, apiServices }) => {
      await scoutSpace.uiSettings.unset(EXPERIMENTAL_FEATURES_SETTING);
      await cleanupWorkflowsAndRules({ scoutSpace, apiServices });
    });

    test('switches to the graph in a new workflow after another one was left in YAML mode', async ({
      page,
      pageObjects,
      apiServices,
    }) => {
      const { created } = await apiServices.workflows.bulkCreate([
        getMultiStepGraphWorkflowYaml(FIRST_WORKFLOW_NAME),
        getMultiStepGraphWorkflowYaml(SECOND_WORKFLOW_NAME),
      ]);
      const editor = pageObjects.workflowEditor;
      const expectYamlMode = async () => {
        await expect(editor.yamlEditor.locator(INERT_ANCESTOR)).toHaveCount(0);
      };
      const expectGraphMode = async () => {
        await expect(editor.yamlEditor.locator(INERT_ANCESTOR)).toHaveCount(1);
        await expect(editor.graphCanvas).toBeVisible();
      };

      await test.step('leave the first workflow in YAML mode', async () => {
        await editor.gotoWorkflow(created[0].id);
        await editor.switchToYamlView();
        await expectYamlMode();
      });

      await test.step('open the second workflow from the list: it opens in YAML mode', async () => {
        await pageObjects.workflowList.navigate();
        await page.testSubj
          .locator('workflowListTable > workflowNameLink')
          .filter({ hasText: SECOND_WORKFLOW_NAME })
          .click();
        await editor.waitForEditorToLoad();
        await expectYamlMode();
      });

      await test.step('one click on the graph icon shows the graph', async () => {
        await editor.switchToGraphView();
        await expectGraphMode();
      });

      await test.step('the toggle keeps working in both directions', async () => {
        await editor.switchToYamlView();
        await expectYamlMode();
        await editor.switchToGraphView();
        await expectGraphMode();
      });
    });
  }
);
