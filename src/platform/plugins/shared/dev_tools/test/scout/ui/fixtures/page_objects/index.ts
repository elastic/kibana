/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PageObjects, ScoutPage } from '@kbn/scout';
import { createLazyPageObject } from '@kbn/scout';
import { DevToolsPage } from './dev_tools_page';

export interface DevToolsPageObjects extends PageObjects {
  devTools: DevToolsPage;
}

export const extendPageObjects = (
  pageObjects: PageObjects,
  page: ScoutPage
): DevToolsPageObjects => ({
  ...pageObjects,
  devTools: createLazyPageObject(DevToolsPage, page),
});
