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
import {
  getAssignAfterUseCrossLine,
  getAssignAfterUseSameLine,
  getAssignBeforeUseCrossLine,
  getAssignBeforeUseSameLine,
  getCaptureAfterUseCrossLine,
  getCaptureAfterUseSameLine,
  getCaptureBeforeUseCrossLine,
  getCaptureBeforeUseSameLine,
  getCaptureUsedBeforeAndAfter,
  getMixedAssignAndCaptureSameLine,
  getMultipleAssignsInterleaved,
} from '../fixtures/workflows';

test.describe(
  'Variable scope validation: use-before-declaration',
  {
    tag: [
      ...tags.stateful.classic,
      ...tags.serverless.observability.complete,
      ...tags.serverless.security.complete,
    ],
  },
  () => {
    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsPrivilegedUser();
      await pageObjects.workflowEditor.gotoNewWorkflow();
    });

    test('assign: same-line quoted scalar — use before declaration is flagged, valid after fix', async ({
      pageObjects,
    }) => {
      const accordion = pageObjects.workflowEditor.validationErrorsAccordion;

      await pageObjects.workflowEditor.setYamlEditorValue(getAssignAfterUseSameLine());
      await expect(accordion.getByText('Variable x is invalid')).toBeVisible();

      await pageObjects.workflowEditor.setYamlEditorValue(getAssignBeforeUseSameLine());
      await expect(accordion).toContainText('No validation errors');
    });

    test('capture: same-line quoted scalar — use before declaration is flagged, valid after fix', async ({
      pageObjects,
    }) => {
      const accordion = pageObjects.workflowEditor.validationErrorsAccordion;

      await pageObjects.workflowEditor.setYamlEditorValue(getCaptureAfterUseSameLine());
      await expect(accordion.getByText('Variable cap is invalid')).toBeVisible();

      await pageObjects.workflowEditor.setYamlEditorValue(getCaptureBeforeUseSameLine());
      await expect(accordion).toContainText('No validation errors');
    });

    test('assign: cross-line block scalar — use before declaration is flagged, valid after fix', async ({
      pageObjects,
    }) => {
      const accordion = pageObjects.workflowEditor.validationErrorsAccordion;

      await pageObjects.workflowEditor.setYamlEditorValue(getAssignAfterUseCrossLine());
      await expect(accordion.getByText('Variable x is invalid')).toBeVisible();

      await pageObjects.workflowEditor.setYamlEditorValue(getAssignBeforeUseCrossLine());
      await expect(accordion).toContainText('No validation errors');
    });

    test('capture: cross-line block scalar — use before declaration is flagged, valid after fix', async ({
      pageObjects,
    }) => {
      const accordion = pageObjects.workflowEditor.validationErrorsAccordion;

      await pageObjects.workflowEditor.setYamlEditorValue(getCaptureAfterUseCrossLine());
      await expect(accordion.getByText('Variable cap is invalid')).toBeVisible();

      await pageObjects.workflowEditor.setYamlEditorValue(getCaptureBeforeUseCrossLine());
      await expect(accordion).toContainText('No validation errors');
    });

    test('mixed: assign in scope + capture out of scope on same line', async ({ pageObjects }) => {
      const accordion = pageObjects.workflowEditor.validationErrorsAccordion;

      await pageObjects.workflowEditor.setYamlEditorValue(getMixedAssignAndCaptureSameLine());

      await expect(accordion.getByText('Variable cap is invalid')).toBeVisible();
      await expect(accordion).not.toContainText('Variable a is invalid');
    });

    test('multiple assigns interleaved across lines — only out-of-scope reference is flagged', async ({
      pageObjects,
    }) => {
      const accordion = pageObjects.workflowEditor.validationErrorsAccordion;

      await pageObjects.workflowEditor.setYamlEditorValue(getMultipleAssignsInterleaved());

      // 'b' is used on line 2, before its assign on line 3 → flagged
      await expect(accordion.getByText('Variable b is invalid')).toBeVisible();
      // 'a' is assigned on line 1 and used on lines 2+4 → always in scope
      await expect(accordion).not.toContainText('Variable a is invalid');
    });

    test('capture: first reference before block is flagged, second reference after block is valid', async ({
      pageObjects,
    }) => {
      const accordion = pageObjects.workflowEditor.validationErrorsAccordion;

      await pageObjects.workflowEditor.setYamlEditorValue(getCaptureUsedBeforeAndAfter());

      // First {{ cap }} (line 1) is before {% capture %} → error
      await expect(accordion.getByText('Variable cap is invalid')).toBeVisible();

      // The second {{ cap }} (line 3, after endcapture) should NOT produce a
      // second "Variable cap is invalid" entry. There should be exactly one.
      const errorItems = accordion.getByText('Variable cap is invalid');
      await expect(errorItems).toHaveCount(1);
    });
  }
);
