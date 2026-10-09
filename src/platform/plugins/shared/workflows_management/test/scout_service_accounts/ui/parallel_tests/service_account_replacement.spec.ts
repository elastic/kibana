/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test, workflowYaml } from '../fixtures';

test.describe(
  'Changing a saved workflow service account',
  { tag: tags.local.stateful.classic },
  () => {
    test('replaces an existing ID and supports searching by name', async ({
      browserAuth,
      pageObjects,
      boundWorkflowId,
      serviceAccount,
      replacementServiceAccount,
      apiServices,
    }) => {
      await browserAuth.loginAsAdmin();
      const editor = pageObjects.workflowEditor;
      await editor.gotoWorkflow(boundWorkflowId);
      await editor.openExistingServiceAccountPicker(serviceAccount.id);
      await editor.selectServiceAccount(`${replacementServiceAccount.name} viewer`);
      await editor.saveWorkflow();
      const replaced = await apiServices.workflows.getWorkflow(boundWorkflowId);
      expect(parse(replaced.yaml).settings.run_as).toBe(replacementServiceAccount.id);

      await editor.gotoWorkflow(boundWorkflowId);
      await expect
        .poll(() => editor.getServiceAccountBadgeText())
        .toBe(`✓ ${replacementServiceAccount.name}`);
      await editor.openServiceAccountPicker(workflowYaml);
      await editor.typeServiceAccountSearch(serviceAccount.name);
      await expect(editor.serviceAccountOption(`${serviceAccount.name} viewer`)).toBeVisible();
      await expect(
        editor.serviceAccountOption(`${replacementServiceAccount.name} viewer`)
      ).toBeHidden();
      await editor.selectServiceAccount(`${serviceAccount.name} viewer`);
      await editor.saveWorkflow();
      const restored = await apiServices.workflows.getWorkflow(boundWorkflowId);
      expect(parse(restored.yaml).settings.run_as).toBe(serviceAccount.id);
    });
  }
);
