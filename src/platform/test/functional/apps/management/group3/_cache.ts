/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['settings', 'common', 'header']);
  const testSubjects = getService('testSubjects');

  // Migration recommendation: MIGRATE TO SCOUT (borderline)
  // Single test: navigates to Advanced Settings and asserts the `data_views:cache_max_age` element
  // is present. This is the weakest Scout case in this group — it's essentially a DOM presence check
  // that could alternatively live as a Jest component test verifying the setting is registered and
  // rendered. The argument for keeping it as E2E is the serverless sibling:
  // x-pack/platform/test/serverless/functional/test_suites/management/data_views/_cache.ts
  // tests the OPPOSITE (setting absent on serverless), making the stateful/serverless pair a
  // meaningful feature-flag integration check that requires the full stack. Both variants must be
  // represented in the Scout migration.
  describe('Data view field caps cache advanced setting', function () {
    before(async () => {
      await PageObjects.settings.navigateTo();
      await PageObjects.settings.clickKibanaSettings();
    });
    it('should have cache setting', async () => {
      await testSubjects.existOrFail('management-settings-editField-data_views:cache_max_age', {
        timeout: 5000,
      });
    });
  });
}
