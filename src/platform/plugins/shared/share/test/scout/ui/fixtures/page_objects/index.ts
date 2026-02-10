/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaUrl, PageObjects, ScoutPage } from '@kbn/scout';
import { createLazyPageObject } from '@kbn/scout';
import { SharePageObjects } from './share';

export interface SharePluginPageObjects extends PageObjects {
  share: SharePageObjects;
}

export function extendPageObjects(
  pageObjects: PageObjects,
  page: ScoutPage,
  kbnUrl: KibanaUrl
): SharePluginPageObjects {
  return {
    ...pageObjects,
    share: createLazyPageObject(SharePageObjects, page, kbnUrl),
  };
}
