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
import { test, workflowYaml } from '../fixtures';

test.describe(
  'Service account picker for a workflow-only user',
  { tag: tags.local.stateful.classic },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginWithCustomRole({
        elasticsearch: { cluster: [], indices: [] },
        kibana: [
          {
            base: [],
            feature: { workflowsManagement: ['all'], agentBuilder: ['read'] },
            spaces: ['*'],
          },
        ],
      });
    });

    test('explains missing security privileges without management actions', async ({
      pageObjects,
      workflowId,
    }) => {
      const editor = pageObjects.workflowEditor;
      await editor.gotoWorkflow(workflowId);
      await editor.focusServiceAccountSetting(workflowYaml);
      await expect(editor.serviceAccountPopup).toContainText('Ask your administrator for access.');
      await expect(editor.serviceAccountPopup.getByRole('link', { name: /Manage/ })).toBeHidden();
      await expect(
        editor.serviceAccountPopup.getByRole('button', { name: 'Create account' })
      ).toBeHidden();
      await expect(
        editor.serviceAccountPopup.getByRole('link', { name: /Learn more about permissions/ })
      ).toBeVisible();
    });
  }
);
