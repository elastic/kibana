/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutPage } from '@kbn/scout';

export const navigateToDataViewsManagement = async (page: ScoutPage): Promise<void> => {
  await page.gotoApp('management/kibana/dataViews');
  await page.waitForURL(/\/app\/management\/kibana\/dataViews/);
};

export const detailLinkSubj = (title: string): string => `detail-link-${title}`;

export const createDataViewErrorLocator = (
  page: ScoutPage
): ReturnType<ScoutPage['testSubj']['locator']> =>
  page.testSubj.locator('createIndexPatternStatusMessage');
