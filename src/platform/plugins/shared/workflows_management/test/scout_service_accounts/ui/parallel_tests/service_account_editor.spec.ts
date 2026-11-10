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
  'Service account editor with the feature flag enabled',
  { tag: tags.stateful.classic },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    for (const format of ['block', 'inline'] as const) {
      test(`selects, saves, and resolves an account with ${format} settings after reload`, async ({
        pageObjects,
        workflowId,
        serviceAccount,
        apiServices,
      }) => {
        const editor = pageObjects.workflowEditor;
        await editor.gotoWorkflow(workflowId);
        await editor.openServiceAccountPicker(workflowYaml, format);
        await editor.selectServiceAccount(`${serviceAccount.name} viewer`);
        await expect
          .poll(async () => parse(await editor.getYamlEditorValue()).settings.run_as)
          .toBe(serviceAccount.id);
        await editor.saveWorkflow();
        const saved = await apiServices.workflows.getWorkflow(workflowId);
        expect(parse(saved.yaml).settings).toStrictEqual(
          format === 'inline'
            ? { run_as: serviceAccount.id, timezone: 'UTC' }
            : { run_as: serviceAccount.id }
        );
        expect(saved.yaml).toContain(
          format === 'inline'
            ? `settings: { run_as: "${serviceAccount.id}", timezone: UTC }`
            : `settings:\n  run_as: "${serviceAccount.id}"`
        );

        await editor.gotoWorkflow(workflowId);
        await expect
          .poll(() => editor.getServiceAccountBadgeText())
          .toBe(`✓ ${serviceAccount.name}`);
        await editor.hoverServiceAccountBadge();
        await expect(editor.serviceAccountPopup).toContainText(serviceAccount.name);
        await expect(editor.serviceAccountPopup).toContainText(`ID: ${serviceAccount.id}`);
        await expect(editor.serviceAccountPopup).toContainText('viewer');
        await expect(editor.serviceAccountPopup).toContainText('This deployment');
        await expect(editor.serviceAccountPopup).toContainText('Enabled');
      });
    }

    for (const input of ['keyboard', 'mouse'] as const) {
      test(`loads the next directory page with the ${input} without changing YAML`, async ({
        pageObjects,
        workflowId,
        serviceAccount,
        paginatedDirectory,
      }) => {
        const editor = pageObjects.workflowEditor;
        await editor.gotoWorkflow(workflowId);
        await editor.openServiceAccountPicker(workflowYaml);
        const before = await editor.getYamlEditorValue();
        const more = editor.serviceAccountOption('Load more service accounts');
        await expect(more).toBeVisible();
        await editor.highlightNextServiceAccount();
        await expect(more).toHaveAttribute('aria-selected', 'true');
        await expect(editor.serviceAccountPopup.getByRole('status')).toHaveText(
          'Load more service accounts'
        );
        if (input === 'keyboard') await editor.acceptSelectedServiceAccount();
        else await editor.selectServiceAccount('Load more service accounts');

        await expect(editor.serviceAccountOption(`${serviceAccount.name} viewer`)).toBeVisible();
        expect(paginatedDirectory.requestedCursors).toStrictEqual([null, 'second-page']);
        expect(await editor.getYamlEditorValue()).toBe(before);
        await expect(more).toBeHidden();
        await editor.selectServiceAccount(`${serviceAccount.name} viewer`);
        await expect
          .poll(async () => parse(await editor.getYamlEditorValue()).settings.run_as)
          .toBe(serviceAccount.id);
      });
    }
  }
);
