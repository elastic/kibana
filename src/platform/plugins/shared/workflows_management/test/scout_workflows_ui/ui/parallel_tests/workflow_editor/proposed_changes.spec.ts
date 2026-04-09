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

/** Matches ProposalManager: always Ctrl in scout tests */
const CHORD_MODIFIER = 'Control';

const INITIAL_YAML = `name: Proposed Changes Test
description: A test workflow for proposed changes
enabled: true
triggers:
  - type: manual
steps:
  - name: step_one
    type: console
    with:
      message: "Hello from step one"
  - name: step_two
    type: console
    with:
      message: "Hello from step two"
  - name: step_three
    type: console
    with:
      message: "Hello from step three"
`;

const normalizeYaml = (yaml: string) => `${yaml.trimEnd()}\n`;

const SINGLE_HUNK_CASES = [
  {
    type: 'replace',
    afterYaml: INITIAL_YAML.replace(
      'message: "Hello from step two"',
      'message: "Modified step two"'
    ),
  },
  {
    type: 'insert',
    afterYaml: INITIAL_YAML.replace(
      `  - name: step_three
    type: console
    with:
      message: "Hello from step three"`,
      `  - name: step_three
    type: console
    with:
      message: "Hello from step three"
  - name: step_four
    type: console
    with:
      message: "New step four"`
    ),
  },
  {
    type: 'delete',
    afterYaml: INITIAL_YAML.replace(
      `  - name: step_two
    type: console
    with:
      message: "Hello from step two"\n`,
      ''
    ),
  },
];

const ALL_STEPS_MODIFIED = INITIAL_YAML.replace(
  'message: "Hello from step one"',
  'message: "Modified one"'
)
  .replace('message: "Hello from step two"', 'message: "Modified two"')
  .replace('message: "Hello from step three"', 'message: "Modified three"');

test.describe('Proposed changes accept and reject', { tag: [...tags.stateful.classic] }, () => {
  test.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.set({
      'agentBuilder:experimentalFeatures': true,
    });
  });

  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.workflowEditor.gotoNewWorkflow();
    await pageObjects.workflowEditor.setYamlEditorValue(INITIAL_YAML);
    await pageObjects.workflowEditor.waitForTestBridge();
  });

  test.afterAll(async ({ scoutSpace, apiServices }) => {
    await scoutSpace.uiSettings.unset('agentBuilder:experimentalFeatures');
    await cleanupWorkflowsAndRules({ scoutSpace, apiServices });
  });

  for (const { type, afterYaml } of SINGLE_HUNK_CASES) {
    test(`accept ${type} hunk applies the change`, async ({ pageObjects }) => {
      await pageObjects.workflowEditor.simulateProposedChanges(afterYaml);
      await pageObjects.workflowEditor.acceptCurrentProposal();

      const value = await pageObjects.workflowEditor.getYamlEditorValue();
      expect(normalizeYaml(value)).toBe(normalizeYaml(afterYaml));
    });

    test(`reject ${type} hunk restores original`, async ({ pageObjects }) => {
      await pageObjects.workflowEditor.simulateProposedChanges(afterYaml);
      await pageObjects.workflowEditor.declineCurrentProposal();

      const value = await pageObjects.workflowEditor.getYamlEditorValue();
      expect(normalizeYaml(value)).toBe(normalizeYaml(INITIAL_YAML));
    });
  }

  test('accept all with multiple hunks produces full afterYaml', async ({ pageObjects }) => {
    await pageObjects.workflowEditor.simulateProposedChanges(ALL_STEPS_MODIFIED);
    await pageObjects.workflowEditor.acceptAllProposals();

    const value = await pageObjects.workflowEditor.getYamlEditorValue();
    expect(normalizeYaml(value)).toBe(normalizeYaml(ALL_STEPS_MODIFIED));
  });

  test('reject all with multiple hunks restores original', async ({ pageObjects }) => {
    await pageObjects.workflowEditor.simulateProposedChanges(ALL_STEPS_MODIFIED);
    await pageObjects.workflowEditor.declineAllProposals();

    const value = await pageObjects.workflowEditor.getYamlEditorValue();
    expect(normalizeYaml(value)).toBe(normalizeYaml(INITIAL_YAML));
  });

  test('accept first hunk then decline rest produces partial result', async ({ pageObjects }) => {
    const expected = INITIAL_YAML.replace(
      'message: "Hello from step one"',
      'message: "Modified one"'
    );

    await pageObjects.workflowEditor.simulateProposedChanges(ALL_STEPS_MODIFIED);

    await test.step('accept the first hunk', async () => {
      await pageObjects.workflowEditor.revealNextProposal();
      await pageObjects.workflowEditor.acceptCurrentProposal();
    });

    await test.step('decline the remaining hunks', async () => {
      await pageObjects.workflowEditor.revealNextProposal();
      await pageObjects.workflowEditor.declineAllProposals();
    });

    const value = await pageObjects.workflowEditor.getYamlEditorValue();
    expect(normalizeYaml(value)).toBe(normalizeYaml(expected));
  });

  test('Modifier+Shift+A accepts pending proposals when pointer is over editor', async ({
    pageObjects,
    page,
  }) => {
    const afterYaml = INITIAL_YAML.replace(
      'message: "Hello from step one"',
      'message: "Modified step one"'
    );

    await pageObjects.workflowEditor.simulateProposedChanges(afterYaml);
    await pageObjects.workflowEditor.revealNextProposal();
    await pageObjects.workflowEditor.focusYamlEditor();
    await pageObjects.workflowEditor.hoverYamlEditorSurface();
    await page.keyboard.press(`${CHORD_MODIFIER}+Shift+A`);

    const value = await pageObjects.workflowEditor.getYamlEditorValue();
    expect(normalizeYaml(value)).toBe(normalizeYaml(afterYaml));
  });

  test('Modifier+Backspace rejects pending proposals when pointer is over editor', async ({
    pageObjects,
    page,
  }) => {
    const afterYaml = INITIAL_YAML.replace(
      'message: "Hello from step one"',
      'message: "Modified step one"'
    );

    await pageObjects.workflowEditor.simulateProposedChanges(afterYaml);
    await pageObjects.workflowEditor.revealNextProposal();
    await pageObjects.workflowEditor.focusYamlEditor();
    await pageObjects.workflowEditor.hoverYamlEditorSurface();
    await page.keyboard.press(`${CHORD_MODIFIER}+Backspace`);

    const value = await pageObjects.workflowEditor.getYamlEditorValue();
    expect(normalizeYaml(value)).toBe(normalizeYaml(INITIAL_YAML));
  });

  test('undo dismisses all pending proposals', async ({ pageObjects }) => {
    const afterYaml = INITIAL_YAML.replace(
      'message: "Hello from step one"',
      'message: "Modified step one"'
    );

    await pageObjects.workflowEditor.simulateProposedChanges(afterYaml);
    await expect(pageObjects.workflowEditor.bulkBar).toBeVisible();

    await pageObjects.workflowEditor.triggerUndoInYamlEditor();
    await expect(pageObjects.workflowEditor.bulkBar).toBeHidden();
  });

  test('new proposals work after resolving a previous batch', async ({ pageObjects }) => {
    const firstAfter = INITIAL_YAML.replace(
      'message: "Hello from step one"',
      'message: "Modified step one"'
    );

    await test.step('resolve first batch', async () => {
      await pageObjects.workflowEditor.simulateProposedChanges(firstAfter);
      await pageObjects.workflowEditor.acceptAllProposals();
      await expect(pageObjects.workflowEditor.bulkBar).toBeHidden();
    });

    const secondAfter = firstAfter.replace(
      'message: "Hello from step two"',
      'message: "Modified step two"'
    );

    await test.step('inject and resolve second batch', async () => {
      await pageObjects.workflowEditor.simulateProposedChanges(secondAfter);
      await expect(pageObjects.workflowEditor.bulkBar).toBeVisible();
      await pageObjects.workflowEditor.acceptAllProposals();
    });

    const value = await pageObjects.workflowEditor.getYamlEditorValue();
    expect(normalizeYaml(value)).toBe(normalizeYaml(secondAfter));
  });

  test('bulk bar disappears after all proposals are resolved', async ({ pageObjects }) => {
    const afterYaml = INITIAL_YAML.replace(
      'message: "Hello from step one"',
      'message: "Modified step one"'
    );

    await pageObjects.workflowEditor.simulateProposedChanges(afterYaml);
    await expect(pageObjects.workflowEditor.bulkBar).toBeVisible();

    await pageObjects.workflowEditor.acceptCurrentProposal();
    await expect(pageObjects.workflowEditor.bulkBar).toBeHidden();
  });

  test('accept hunk then undo restores proposal and bulk bar', async ({ pageObjects }) => {
    const afterYaml = INITIAL_YAML.replace(
      'message: "Hello from step one"',
      'message: "Modified step one"'
    );

    await pageObjects.workflowEditor.simulateProposedChanges(afterYaml);
    await expect(pageObjects.workflowEditor.bulkBar).toBeVisible();

    await pageObjects.workflowEditor.acceptCurrentProposal();
    await expect(pageObjects.workflowEditor.bulkBar).toBeHidden();

    await pageObjects.workflowEditor.triggerUndoInYamlEditor();
    await expect(pageObjects.workflowEditor.bulkBar).toBeVisible();

    const value = await pageObjects.workflowEditor.getYamlEditorValue();
    expect(normalizeYaml(value)).toBe(normalizeYaml(afterYaml));
  });

  test('reject hunk then undo restores AI content and bulk bar', async ({ pageObjects }) => {
    const afterYaml = INITIAL_YAML.replace(
      'message: "Hello from step one"',
      'message: "Modified step one"'
    );

    await pageObjects.workflowEditor.simulateProposedChanges(afterYaml);
    await expect(pageObjects.workflowEditor.bulkBar).toBeVisible();

    await pageObjects.workflowEditor.declineCurrentProposal();
    await expect(pageObjects.workflowEditor.bulkBar).toBeHidden();

    const rejectedValue = await pageObjects.workflowEditor.getYamlEditorValue();
    expect(normalizeYaml(rejectedValue)).toBe(normalizeYaml(INITIAL_YAML));

    await pageObjects.workflowEditor.triggerUndoInYamlEditor();
    await expect(pageObjects.workflowEditor.bulkBar).toBeVisible();

    const restoredValue = await pageObjects.workflowEditor.getYamlEditorValue();
    expect(normalizeYaml(restoredValue)).toBe(normalizeYaml(afterYaml));
  });

  test('accept all then undo step-by-step restores hunks individually', async ({ pageObjects }) => {
    await pageObjects.workflowEditor.simulateProposedChanges(ALL_STEPS_MODIFIED);
    await expect(pageObjects.workflowEditor.bulkBar).toBeVisible();

    await pageObjects.workflowEditor.acceptAllProposals();
    await expect(pageObjects.workflowEditor.bulkBar).toBeHidden();

    await pageObjects.workflowEditor.triggerUndoInYamlEditor();
    await expect(pageObjects.workflowEditor.bulkBar).toBeVisible();

    await pageObjects.workflowEditor.triggerUndoInYamlEditor();
    await expect(pageObjects.workflowEditor.bulkBar).toBeVisible();

    await pageObjects.workflowEditor.triggerUndoInYamlEditor();
    await expect(pageObjects.workflowEditor.bulkBar).toBeVisible();

    const value = await pageObjects.workflowEditor.getYamlEditorValue();
    expect(normalizeYaml(value)).toBe(normalizeYaml(ALL_STEPS_MODIFIED));
  });
});
