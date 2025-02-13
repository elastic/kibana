/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PageObjects, createCorePageObjects } from '../../../page_objects';
import { scoutPageFixture } from '../scout_page';

/**
 * The "pageObjects" fixture provides a centralized and consistent way to access and
 * interact with reusable Page Objects in tests. This fixture automatically
 * initializes core Page Objects and makes them available to tests, promoting
 * modularity and reducing redundant setup.
 *
 * Note: Page Objects are lazily instantiated on first access.
 */
export const pageObjectsFixture = scoutPageFixture.extend<{
  pageObjects: PageObjects;
}>({
  pageObjects: async ({ page, log }, use) => {
    const corePageObjects = createCorePageObjects(page);
    log.serviceLoaded('pageObjects');
    await use(corePageObjects);
  },
});
