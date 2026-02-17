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
import { spaceTest as test } from '../fixtures';
import { cleanupWorkflowsAndRules } from '../fixtures/cleanup';
import {
  getWorkflowWithInputsAndConstsYaml,
  getWorkflowWithOnlyConstsYaml,
  getWorkflowWithOnlyInputsYaml,
  getWorkflowWithoutInputsOrConstsYaml,
} from '../fixtures/workflows';

test.describe(
  'Inputs and consts autocomplete should only appear when defined',
  {
    tag: [
      ...tags.stateful.classic,
      ...tags.serverless.observability.complete,
      ...tags.serverless.security.complete,
    ],
  },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsPrivilegedUser();
    });

    test.afterAll(async ({ scoutSpace, apiServices }) => {
      await cleanupWorkflowsAndRules({ scoutSpace, apiServices });
    });

    test('should NOT suggest inputs or consts when neither is defined', async ({ pageObjects }) => {
      await pageObjects.workflowEditor.gotoNewWorkflow();

      // Use triggerAutocompleteAfter to reliably position cursor inside {{ }}
      await pageObjects.workflowEditor.triggerAutocompleteAfter(
        getWorkflowWithoutInputsOrConstsYaml('No Inputs No Consts'),
        '{{ '
      );

      const suggestWidget = pageObjects.workflowEditor.getYamlEditorSuggestWidget();
      await expect(suggestWidget).toBeVisible();

      // inputs and consts should NOT be in the suggestions
      await expect(suggestWidget.getByRole('option', { name: 'inputs' })).toBeHidden();
      await expect(suggestWidget.getByRole('option', { name: 'consts' })).toBeHidden();

      // But other context variables should still be available
      await expect(suggestWidget.getByRole('option', { name: 'event' })).toBeVisible();
      await expect(suggestWidget.getByRole('option', { name: 'execution' })).toBeVisible();
    });

    test('should suggest both inputs and consts when both are defined', async ({ pageObjects }) => {
      await pageObjects.workflowEditor.gotoNewWorkflow();

      await pageObjects.workflowEditor.triggerAutocompleteAfter(
        getWorkflowWithInputsAndConstsYaml('With Inputs And Consts'),
        '{{ '
      );

      const suggestWidget = pageObjects.workflowEditor.getYamlEditorSuggestWidget();
      await expect(suggestWidget).toBeVisible();

      // Both inputs and consts should be suggested
      await expect(suggestWidget.getByRole('option', { name: 'inputs' })).toBeVisible();
      await expect(suggestWidget.getByRole('option', { name: 'consts' })).toBeVisible();
    });

    test('should suggest inputs but NOT consts when only inputs are defined', async ({
      pageObjects,
    }) => {
      await pageObjects.workflowEditor.gotoNewWorkflow();

      await pageObjects.workflowEditor.triggerAutocompleteAfter(
        getWorkflowWithOnlyInputsYaml('Only Inputs'),
        '{{ '
      );

      const suggestWidget = pageObjects.workflowEditor.getYamlEditorSuggestWidget();
      await expect(suggestWidget).toBeVisible();

      // inputs should be suggested
      await expect(suggestWidget.getByRole('option', { name: 'inputs' })).toBeVisible();
      // consts should NOT be suggested
      await expect(suggestWidget.getByRole('option', { name: 'consts' })).toBeHidden();
    });

    test('should suggest consts but NOT inputs when only consts are defined', async ({
      pageObjects,
    }) => {
      await pageObjects.workflowEditor.gotoNewWorkflow();

      await pageObjects.workflowEditor.triggerAutocompleteAfter(
        getWorkflowWithOnlyConstsYaml('Only Consts'),
        '{{ '
      );

      const suggestWidget = pageObjects.workflowEditor.getYamlEditorSuggestWidget();
      await expect(suggestWidget).toBeVisible();

      // consts should be suggested
      await expect(suggestWidget.getByRole('option', { name: 'consts' })).toBeVisible();
      // inputs should NOT be suggested
      await expect(suggestWidget.getByRole('option', { name: 'inputs' })).toBeHidden();
    });
  }
);
