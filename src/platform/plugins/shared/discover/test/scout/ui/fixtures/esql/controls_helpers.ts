/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Minimal helpers for reading/driving dashboard "Options list" controls from
 * Discover/Dashboard ES|QL-controls specs. Kept plugin-local and function
 * based (no page-object class) since only a couple of specs need them; see
 * the dashboard plugin's own `controls_migration_smoke.spec.ts` for the
 * sibling pattern this mirrors.
 */

import type { ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

export const getAllControlIds = async (page: ScoutPage): Promise<string[]> => {
  const controls = await page.locator('[data-control-id]').all();
  return Promise.all(
    controls.map(async (control) => (await control.getAttribute('data-control-id')) ?? '')
  );
};

export const getControlsCount = async (page: ScoutPage): Promise<number> => {
  return (await getAllControlIds(page)).length;
};

export const expectOptionsListSelection = async (
  page: ScoutPage,
  controlId: string,
  expectedText: string
): Promise<void> => {
  const controlButton = page.testSubj.locator(`optionsList-control-${controlId}`);
  const selections = controlButton.locator('[data-test-subj="optionsListSelections"]');
  await expect(selections.or(controlButton)).toContainText(expectedText);
};

export const optionsListOpenPopover = async (page: ScoutPage, controlId: string): Promise<void> => {
  await page.testSubj.click(`optionsList-control-${controlId}`);
  await expect(page.testSubj.locator('optionsList-control-popover')).toBeVisible();
};

export const optionsListEnsurePopoverIsClosed = async (
  page: ScoutPage,
  controlId: string
): Promise<void> => {
  const popover = page.testSubj.locator('optionsList-control-popover');
  if (await popover.isVisible()) {
    await page.testSubj.click(`optionsList-control-${controlId}`);
    await expect(popover).toBeHidden();
  }
};

export const optionsListPopoverSelectOption = async (
  page: ScoutPage,
  option: string
): Promise<void> => {
  const availableOptions = page.testSubj.locator('optionsList-control-available-options');
  await expect(availableOptions).toBeVisible();

  await page.testSubj.fill('optionsList-control-search-input', option);
  const optionLocator = page.testSubj.locator(`optionsList-control-selection-${option}`);
  await expect(optionLocator).toBeVisible();
  await optionLocator.click();
  await page.testSubj.clearInput('optionsList-control-search-input');
};
