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
  getAlertTriggerEventAutocompleteYaml,
  getManualTriggerEventAutocompleteYaml,
} from '../fixtures/workflows';

test.describe(
  'Event autocomplete should be dynamic based on triggers',
  {
    tag: [...tags.stateful.classic],
  },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsPrivilegedUser();
    });

    test.afterAll(async ({ scoutSpace, apiServices }) => {
      await cleanupWorkflowsAndRules({ scoutSpace, apiServices });
    });

    test('manual trigger: event.* should only suggest spaceId', async ({ pageObjects }) => {
      await pageObjects.workflowEditor.gotoNewWorkflow();
      const yaml = getManualTriggerEventAutocompleteYaml('Manual Event Autocomplete');

      // Position cursor right after "event." and trigger autocomplete
      await pageObjects.workflowEditor.triggerAutocompleteAfter(yaml, 'event.');

      const suggestWidget = pageObjects.workflowEditor.getYamlEditorSuggestWidget();
      await expect(suggestWidget).toBeVisible();

      // spaceId should be present
      await expect(suggestWidget.getByRole('option', { name: 'spaceId' })).toBeVisible();

      // Alert-specific properties should NOT be present
      await expect(suggestWidget.getByRole('option', { name: 'alerts' })).not.toBeVisible();
      await expect(suggestWidget.getByRole('option', { name: 'rule' })).not.toBeVisible();
      await expect(suggestWidget.getByRole('option', { name: 'params' })).not.toBeVisible();
    });

    test('alert trigger: event.* should suggest alerts, rule, params, and spaceId', async ({
      pageObjects,
    }) => {
      await pageObjects.workflowEditor.gotoNewWorkflow();
      const yaml = getAlertTriggerEventAutocompleteYaml('Alert Event Autocomplete');

      // Position cursor right after "event." and trigger autocomplete
      await pageObjects.workflowEditor.triggerAutocompleteAfter(yaml, 'event.');

      const suggestWidget = pageObjects.workflowEditor.getYamlEditorSuggestWidget();
      await expect(suggestWidget).toBeVisible();

      // All event properties should be present for alert trigger
      await expect(suggestWidget.getByRole('option', { name: 'spaceId' })).toBeVisible();
      await expect(suggestWidget.getByRole('option', { name: 'alerts' })).toBeVisible();
      await expect(suggestWidget.getByRole('option', { name: 'rule' })).toBeVisible();
      await expect(suggestWidget.getByRole('option', { name: 'params' })).toBeVisible();
    });
  }
);
