/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutPage } from '@kbn/scout';

export const OVERVIEW_PAGE_TEST_SUBJ = 'kbnOverviewPage';

/** Navigates to the Kibana Overview app, gated on the page the overview commits once it has loaded. */
export const gotoOverviewApp = async (page: ScoutPage) => {
  await page.gotoApp('kibana_overview', {
    readyWhen: page.testSubj.locator(OVERVIEW_PAGE_TEST_SUBJ),
  });
};
