/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Locator, ScoutPage } from '@kbn/scout';

export const isTestSubjectVisible = async (
  page: ScoutPage,
  testSubject: string
): Promise<boolean> => page.testSubj.locator(testSubject).isVisible();

export const clickIfVisible = async (page: ScoutPage, testSubject: string): Promise<void> => {
  const locator = page.testSubj.locator(testSubject);
  if (await locator.isVisible()) {
    await locator.click();
  }
};

export const openSidebar = async (page: ScoutPage): Promise<void> => {
  await clickIfVisible(page, 'dscShowSidebarButton');
  await page.testSubj.locator('fieldList').waitFor({ state: 'visible' });
};

export const closeSidebar = async (page: ScoutPage): Promise<void> => {
  await clickIfVisible(page, 'dscHideSidebarButton');
  await page.testSubj.locator('fieldList').waitFor({ state: 'hidden' });
};

export const openTablePanel = async (page: ScoutPage): Promise<void> => {
  await clickIfVisible(page, 'dscShowTableButton');
  await page.testSubj.locator('discoverDocTable').waitFor({ state: 'visible' });
};

export const closeTablePanel = async (page: ScoutPage): Promise<void> => {
  await clickIfVisible(page, 'dscHideTableButton');
  await page.testSubj.locator('discoverDocTable').waitFor({ state: 'hidden' });
};

export const isButtonDisabled = async (page: ScoutPage, testSubject: string): Promise<boolean> => {
  return page.testSubj.locator(testSubject).isDisabled();
};

export const hitCount = (page: ScoutPage): Locator => page.testSubj.locator('discoverQueryHits');
