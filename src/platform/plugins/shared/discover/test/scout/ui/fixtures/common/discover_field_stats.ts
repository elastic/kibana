/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Locator, ScoutPage } from '@kbn/scout';

export const openFieldStatsPopover = async (page: ScoutPage, fieldName: string): Promise<void> => {
  const field = page.testSubj.locator(`field-${fieldName}`);
  await field.waitFor({ state: 'visible' });
  await field.hover();
  await field.click();
  await page.locator('[data-popover-open="true"]').waitFor({ state: 'visible' });
  await page.locator('[data-test-subj*="-statsLoading"]').waitFor({ state: 'hidden' });
};

export const closeFieldStatsPopover = async (page: ScoutPage): Promise<void> => {
  await page.keyboard.press('Escape');
  await page.testSubj.locator('fieldPopoverHeader_fieldDisplayName').waitFor({ state: 'hidden' });
};

export const fieldStatsBucketRows = (page: ScoutPage): Locator =>
  page.testSubj.locator('dscFieldStats-topValues-bucket');

export const fieldStatsTitle = (page: ScoutPage): Locator =>
  page.testSubj.locator('dscFieldStats-title');

export const fieldStatsFooter = (page: ScoutPage): Locator =>
  page.testSubj.locator('dscFieldStats-statsFooter');
