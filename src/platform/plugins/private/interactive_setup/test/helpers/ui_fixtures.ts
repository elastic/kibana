/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaUrl, PageObjects, ScoutPage, ScoutWorkerFixtures } from '@kbn/scout';
import { apiClientFixture, test as baseTest, createLazyPageObject, mergeTests } from '@kbn/scout';

import { InteractiveSetupPage } from './interactive_setup_page';

/**
 * Shared UI fixtures for every `scout_interactive_setup_*` root. They all drive the same wizard
 * against differently-configured clusters, so the page object and fixture wiring live here and
 * each root's `ui/fixtures/index.ts` re-exports them.
 *
 * `apiClient` is merged in because the wizard needs the verification code Kibana generated for
 * this boot, which is only reachable over HTTP (see `helpers/setup_state.ts`). Note that no
 * interactive-setup spec uses `browserAuth`: Kibana is in the `preboot` stage with no security, so
 * there is nobody to log in as. Scout's `page` fixture is independent of `browserAuth`, so an
 * unauthenticated page is simply what you get by not calling it.
 */
export interface InteractiveSetupPageObjects extends PageObjects {
  interactiveSetup: InteractiveSetupPage;
}

export interface InteractiveSetupTestFixtures {
  pageObjects: InteractiveSetupPageObjects;
}

export function extendPageObjects(
  pageObjects: PageObjects,
  page: ScoutPage,
  kbnUrl: KibanaUrl
): InteractiveSetupPageObjects {
  return {
    ...pageObjects,
    interactiveSetup: createLazyPageObject(InteractiveSetupPage, page, kbnUrl),
  };
}

export const test = mergeTests(baseTest, apiClientFixture).extend<
  InteractiveSetupTestFixtures,
  ScoutWorkerFixtures
>({
  pageObjects: async ({ pageObjects, page, kbnUrl }, use) => {
    await use(extendPageObjects(pageObjects, page, kbnUrl));
  },
});
