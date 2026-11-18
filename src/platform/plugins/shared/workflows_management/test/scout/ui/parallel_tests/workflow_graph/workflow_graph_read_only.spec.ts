/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { BrowserAuthFixture, ScoutPage } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { WORKFLOWS_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/workflows';
import type { WorkflowsApiServicesFixture } from '../../fixtures';
import { spaceTest as test } from '../../fixtures';
import { cleanupWorkflowsAndRules } from '../../fixtures/cleanup';
import type { WorkflowsPageObjects } from '../../fixtures/page_objects';
import { graphNodeId } from '../../fixtures/page_objects/workflow_graph_authoring_page';
import { getMultiStepGraphWorkflowYaml } from '../../fixtures/workflows';

const STEP_NAMES = ['step_1', 'step_2', 'step_3', 'step_4', 'step_5'];

/** Sharing the workflow through the UI first makes these cases slower than a plain editor test. */
const SHARED_WORKFLOW_TEST_TIMEOUT_MS = 180_000;
const EXECUTION_TEST_TIMEOUT_MS = 120_000;

/** Every "+" insertion control on the canvas: mid-wire (`wire`) and dangling-exit (`terminal`). */
const wireControls = (page: ScoutPage) =>
  page.testSubj
    .locator('workflowGraphWireControl-wire')
    .or(page.testSubj.locator('workflowGraphWireControl-terminal'));

/**
 * The graph editor is read-only when the user cannot edit the workflow (here: a private
 * workflow shared with them as `viewer`) or when a run's snapshot is on screen (executions tab).
 * A positive control (same workflow, user allowed to edit) proves each assertion can fail.
 */
test.describe('Workflow graph read-only mode', { tag: [...tags.stateful.classic] }, () => {
  let privilegedUser: { username: string; displayName: string };

  test.beforeAll(async ({ scoutSpace, samlAuth }) => {
    await scoutSpace.uiSettings.set({ [WORKFLOWS_EXPERIMENTAL_FEATURES_SETTING_ID]: true });
    const { username, full_name: fullName, email } = await samlAuth.session.getUserData('editor');
    privilegedUser = { username, displayName: fullName || email || username };
  });

  test.afterAll(async ({ scoutSpace, apiServices }) => {
    await scoutSpace.uiSettings.unset(WORKFLOWS_EXPERIMENTAL_FEATURES_SETTING_ID);
    await cleanupWorkflowsAndRules({ scoutSpace, apiServices });
  });

  /** Creates the workflow as admin, then shares it privately with the privileged user as `viewer`. */
  const createWorkflowSharedAsViewer = async ({
    name,
    apiServices,
    browserAuth,
    pageObjects,
  }: {
    name: string;
    apiServices: WorkflowsApiServicesFixture;
    browserAuth: BrowserAuthFixture;
    pageObjects: WorkflowsPageObjects;
  }): Promise<string> => {
    const { created } = await apiServices.workflows.bulkCreate([
      getMultiStepGraphWorkflowYaml(name),
    ]);
    const workflowId = created[0].id;
    const editor = pageObjects.workflowEditor;
    await browserAuth.loginAsAdmin();
    await editor.gotoWorkflow(workflowId);
    await editor.openAccessDialog();
    await editor.setAccessMode('private');
    await editor.addAccessUser(privilegedUser.displayName);
    await editor.setAccessRole(privilegedUser.username, 'viewer');
    await editor.saveAccess();
    await browserAuth.loginAsPrivilegedUser();
    return workflowId;
  };

  test('a viewer gets a canvas without insertion controls, and clicking a node never opens the step form', async ({
    page,
    apiServices,
    browserAuth,
    pageObjects,
  }) => {
    test.setTimeout(SHARED_WORKFLOW_TEST_TIMEOUT_MS);
    const workflowId = await createWorkflowSharedAsViewer({
      name: 'Graph read-only viewer',
      apiServices,
      browserAuth,
      pageObjects,
    });
    const editor = pageObjects.workflowEditor;
    await editor.gotoWorkflow(workflowId);
    await editor.switchToGraphView();

    const node = page.testSubj.locator(`workflowGraphNode-${graphNodeId('step_3')}`);

    await test.step('the canvas renders every step but offers no way to insert one', async () => {
      for (const stepName of STEP_NAMES) {
        await expect(
          page.testSubj.locator(`workflowGraphNode-${graphNodeId(stepName)}`)
        ).toBeVisible();
      }
      await expect(wireControls(page)).toHaveCount(0);
      await expect(page.testSubj.locator('workflowGraphWireAddStep')).toHaveCount(0);
      await expect(page.testSubj.locator('workflowGraphEmptyAddTrigger')).toHaveCount(0);
    });

    await test.step('clicking a step opens the step form read-only, with nothing to add, remove or reset', async () => {
      await node.click();
      await expect(page.testSubj.locator('workflowStepConfigPanel')).toBeVisible();
      await expect(page.testSubj.locator('workflowVisualEditorFlyout')).toHaveCount(0);
      await expect(page.testSubj.locator('workflowStepConfigPanelTitle')).toBeVisible();
      await expect(page.testSubj.locator('workflowStepConfigAddOptionalField')).toHaveCount(0);
      await expect(page.testSubj.locator('workflowStepConfigPanelEditName')).toHaveCount(0);
      await expect(page.testSubj.locator('workflowStepConfigPanelRemoveNode')).toHaveCount(0);
      await expect(page.testSubj.locator('workflowStepConfigPanelResetNode')).toHaveCount(0);
      await expect(page.testSubj.locator('workflowStepConfigPanelOpenInYaml')).toBeVisible();
      // Running a step needs execute and edit access to this workflow, which a viewer lacks.
      await expect(page.testSubj.locator('workflowStepConfigPanelRunStep')).toHaveCount(0);
    });

    await test.step('a text field stays a preview when clicked', async () => {
      const messageField = page.testSubj.locator('workflowStepConfigField-with.message');
      await messageField.click();
      await expect(messageField).toHaveAttribute('data-mode', 'read');
    });

    await test.step('the YAML tab is read-only', async () => {
      await page.testSubj.click('workflowStepConfigPanelView-yaml');
      await expect(page.testSubj.locator('workflowStepConfigPanelYaml')).toBeVisible();
      const isReadOnly = await page.evaluate(() => {
        const editors = window.MonacoEnvironment?.monaco?.editor.getEditors() ?? [];
        const stepEditor = editors.find((e) =>
          e.getDomNode()?.closest('[data-test-subj="workflowStepConfigPanelYaml"]')
        );
        return stepEditor?.getRawOptions().readOnly;
      });
      expect(isReadOnly).toBe(true);
    });

    await test.step('clicking the trigger opens its panel read-only', async () => {
      await page.testSubj.click('workflowStepConfigPanelClose');
      // The trigger sits at the top of the canvas, under the page breadcrumbs, until it is fitted.
      await page.testSubj.click('workflowCanvas-fit-view');
      await page.testSubj.locator('workflowGraphNode-manual').click();
      await expect(page.testSubj.locator('workflowTriggerConfigPanel')).toBeVisible();
      await expect(page.testSubj.locator('workflowTriggerConfigPanelSave')).toHaveCount(0);
      await expect(page.testSubj.locator('workflowTriggerConfigPanelResetTrigger')).toHaveCount(0);
      await expect(page.testSubj.locator('workflowTriggerConfigPanelRemoveTrigger')).toHaveCount(0);
      await expect(page.testSubj.locator('workflowTriggerConfigPanelOpenInYaml')).toBeVisible();
      await page.testSubj.click('workflowTriggerConfigPanelClose');
    });

    await test.step('Delete and Backspace leave the workflow untouched', async () => {
      await node.click();
      await page.keyboard.press('Delete');
      await page.keyboard.press('Backspace');
      await page.testSubj.click('workflowStepConfigPanelClose');
      await editor.switchToYamlView();
      const yaml = await editor.getYamlEditorValue();
      for (const stepName of STEP_NAMES) {
        expect(yaml).toContain(`name: ${stepName}`);
      }
    });
  });

  test('an editor (positive control) gets insertion controls and the step config panel', async ({
    page,
    apiServices,
    browserAuth,
    pageObjects,
  }) => {
    const { created } = await apiServices.workflows.bulkCreate([
      getMultiStepGraphWorkflowYaml('Graph read-only editor control'),
    ]);
    await browserAuth.loginAsPrivilegedUser();
    const editor = pageObjects.workflowEditor;
    await editor.gotoWorkflow(created[0].id);
    await editor.switchToGraphView();

    await expect(page.testSubj.locator(`workflowGraphNode-${graphNodeId('step_3')}`)).toBeVisible();
    await expect(wireControls(page)).not.toHaveCount(0);

    await page.testSubj.locator(`workflowGraphNode-${graphNodeId('step_3')}`).click();
    await expect(page.testSubj.locator('workflowStepConfigPanel')).toBeVisible();
    await expect(page.testSubj.locator('workflowVisualEditorFlyout')).toHaveCount(0);
    // The same panel is editable for an editor: these are the controls read-only mode removes.
    await expect(page.testSubj.locator('workflowStepConfigPanelEditName')).toBeVisible();
    await expect(page.testSubj.locator('workflowStepConfigPanelResetNode')).toBeVisible();
    await page.testSubj.click('workflowStepConfigPanelView-yaml');
    const isReadOnly = await page.evaluate(() => {
      const editors = window.MonacoEnvironment?.monaco?.editor.getEditors() ?? [];
      const stepEditor = editors.find((e) =>
        e.getDomNode()?.closest('[data-test-subj="workflowStepConfigPanelYaml"]')
      );
      return stepEditor?.getRawOptions().readOnly;
    });
    expect(isReadOnly).toBe(false);
  });

  test('the executions tab shows a run snapshot on a read-only canvas', async ({
    page,
    apiServices,
    browserAuth,
    pageObjects,
  }) => {
    test.setTimeout(EXECUTION_TEST_TIMEOUT_MS);
    // The fixture is created disabled, and a disabled workflow cannot be run.
    const { created } = await apiServices.workflows.bulkCreate([
      getMultiStepGraphWorkflowYaml('Graph read-only executions').replace(
        'enabled: false',
        'enabled: true'
      ),
    ]);
    const workflowId = created[0].id;
    const { workflowExecutionId } = await apiServices.workflows.run(workflowId, {});
    await apiServices.workflows.waitForTermination({ workflowExecutionId });

    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.workflowExecution.gotoOverview(workflowId, workflowExecutionId);

    // The executions tab already renders the graph (behind the run panels), so there is no view
    // toggle to click. Clicking a node here selects a step execution, so only assert the canvas.
    await expect(pageObjects.workflowEditor.graphCanvas).toBeVisible();
    await expect(
      page.testSubj.locator(`workflowGraphNode-${graphNodeId('step_1')}`)
    ).toBeAttached();
    await expect(wireControls(page)).toHaveCount(0);
    await expect(page.testSubj.locator('workflowGraphWireAddStep')).toHaveCount(0);
    await expect(page.testSubj.locator('workflowStepConfigPanel')).toHaveCount(0);
  });

  const openSettings = async (
    page: ScoutPage,
    pageObjects: WorkflowsPageObjects,
    workflowId: string
  ) => {
    await pageObjects.workflowEditor.gotoWorkflow(workflowId);
    await page.testSubj.click('workflowSettingsButton');
    await page.testSubj.locator('workflowSettingsFlyout').waitFor();
  };

  test('settings flyout is read-only for a viewer, even with the visual editor on', async ({
    page,
    apiServices,
    browserAuth,
    pageObjects,
  }) => {
    test.setTimeout(SHARED_WORKFLOW_TEST_TIMEOUT_MS);
    const workflowId = await createWorkflowSharedAsViewer({
      name: 'Settings read-only viewer',
      apiServices,
      browserAuth,
      pageObjects,
    });
    await openSettings(page, pageObjects, workflowId);

    await expect(page.testSubj.locator('workflowSettingsNameInput')).toBeDisabled();
    await expect(page.testSubj.locator('workflowSettingsDescriptionInput')).toBeDisabled();
    await expect(page.testSubj.locator('workflowSettingsFlyoutDone')).toHaveCount(0);
    await page.testSubj.click('workflowSettingsTab-constants');
    await expect(page.testSubj.locator('workflowSettingsConstAdd')).toHaveCount(0);
  });

  test('settings flyout is reachable but read-only for an editor when the visual editor is off', async ({
    page,
    apiServices,
    browserAuth,
    pageObjects,
    scoutSpace,
  }) => {
    const { created } = await apiServices.workflows.bulkCreate([
      getMultiStepGraphWorkflowYaml('Settings read-only flag off'),
    ]);
    await browserAuth.loginAsPrivilegedUser();
    await scoutSpace.uiSettings.set({ [WORKFLOWS_EXPERIMENTAL_FEATURES_SETTING_ID]: false });
    try {
      await openSettings(page, pageObjects, created[0].id);

      await expect(page.testSubj.locator('workflowSettingsNameInput')).toBeDisabled();
      await expect(page.testSubj.locator('workflowSettingsFlyoutDone')).toHaveCount(0);
      await page.testSubj.click('workflowSettingsTab-constants');
      await expect(page.testSubj.locator('workflowSettingsConstAdd')).toHaveCount(0);
    } finally {
      await scoutSpace.uiSettings.set({ [WORKFLOWS_EXPERIMENTAL_FEATURES_SETTING_ID]: true });
    }
  });

  test('settings flyout is editable for an editor with the visual editor on (positive control)', async ({
    page,
    apiServices,
    browserAuth,
    pageObjects,
  }) => {
    const { created } = await apiServices.workflows.bulkCreate([
      getMultiStepGraphWorkflowYaml('Settings editable control'),
    ]);
    await browserAuth.loginAsPrivilegedUser();
    await openSettings(page, pageObjects, created[0].id);

    await expect(page.testSubj.locator('workflowSettingsNameInput')).toBeEnabled();
    await expect(page.testSubj.locator('workflowSettingsFlyoutDone')).toBeVisible();
    await page.testSubj.click('workflowSettingsTab-constants');
    await expect(page.testSubj.locator('workflowSettingsConstAdd')).toBeVisible();
  });
});
