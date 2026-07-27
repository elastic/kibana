/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

/**
 * Selects the named request from the inspector's chooser combo box, clicks
 * the "Request" tab to show the raw HTTP command, and returns the first line
 * of the code viewer (i.e. the HTTP method + path, before the JSON body).
 */
export const getInspectorRequestCommand = async (
  page: ScoutPage,
  requestName: string
): Promise<string> => {
  const chooser = page.testSubj.locator('inspectorRequestChooser');
  await expect(chooser).toBeVisible();
  await chooser.click();
  await page.testSubj.click(`inspectorRequestChooser${requestName}`);
  await page.testSubj.click('inspectorRequestDetailRequest');
  const codeViewer = page.testSubj.locator('inspectorRequestCodeViewerContainer');
  await expect(codeViewer).toBeVisible();
  const text = await codeViewer.innerText();
  return text.split('\n')[0].trim();
};

export const normalizeInspectorCommand = (value: string): string => {
  return value
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, '')
    .replace(/\u00a0/g, ' ')
    .trim();
};

/**
 * Reads the "Request total time" stat of the currently selected request in
 * milliseconds (mirrors the FTR `inspector.getRequestTotalTime()` service
 * method).
 */
export const getInspectorRequestTotalTime = async (page: ScoutPage): Promise<number> => {
  const totalTime = page.testSubj.locator('inspectorRequestTotalTime');
  await expect(totalTime).toBeVisible();
  const [ms] = (await totalTime.innerText()).split('ms');
  return parseFloat(ms);
};

/**
 * Switches the inspector to the "Requests" view if it isn't already showing
 * it (the view chooser is only rendered when more than one view exists).
 */
export const switchToRequestsView = async (page: ScoutPage): Promise<void> => {
  const viewChooser = page.testSubj.locator('inspectorViewChooser');
  if (!(await viewChooser.isVisible())) {
    return;
  }
  await viewChooser.click();
  await page.testSubj.click('inspectorViewChooserRequests');
};

/**
 * Checks whether the inspector's request chooser combo box has a request
 * named `name`, identified by its own `inspectorRequestChooser<Name>` test
 * subject rendered in the dropdown (see `RequestSelector.renderRequestCombobox`).
 */
export const hasInspectorRequest = async (page: ScoutPage, name: string): Promise<boolean> => {
  const chooser = page.testSubj.locator('inspectorRequestChooser');
  await expect(chooser).toBeVisible();
  await chooser.click();
  const option = page.testSubj.locator(`inspectorRequestChooser${name}`);
  // Wait briefly for the combo-box dropdown to render before probing the option.
  const found = await option
    .waitFor({ state: 'visible', timeout: 3_000 })
    .then(() => true)
    .catch(() => false);
  return found;
};
