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
  const PageObjects = getPageObjects(['settings']);

  // Migration recommendation: MIGRATE TO SCOUT
  // Tests the field format editor preview for fields stored in _source and keyword fields not
  // directly stored in _source. No existing Scout coverage found. The test creates its own
  // lightweight ES index (data-view-edit-field) via the ES client in before/after hooks, making
  // it self-contained and independent of shared ES archives — this pattern translates well to Scout.
  // Both sub-tests exercise a real UI workflow (navigate → open field editor → assert preview value).
  // Serverless sibling: x-pack/platform/test/serverless/functional/test_suites/management/data_views/_edit_field.ts
  // runs the same two tests but uses a different navigation path (navigateToApp('management') +
  // clicking the app-card-dataViews tile instead of PageObjects.settings.navigateTo()). The Scout
  // migration should handle this via deployment-aware navigation helpers rather than duplicating the
  // test logic.
  describe('edit field', function () {
    before(async () => {
      const es = getService('es');
      await es.index({
        index: 'data-view-edit-field',
        id: '1',
        document: {
          extension: 'css',
        },
        refresh: true,
      });
    });

    after(async function () {
      // Delete the index after tests
      const es = getService('es');
      await es.indices.delete({
        index: 'data-view-edit-field',
        ignore_unavailable: true,
      });
    });

    describe('field preview', function fieldPreview() {
      before(async () => {
        await PageObjects.settings.navigateTo();
        await PageObjects.settings.clickKibanaIndexPatterns();
        await PageObjects.settings.createIndexPattern('data-view-edit-field', null);
      });
      after(async function () {
        // Delete the data view (index pattern) after the test
        await PageObjects.settings.clickKibanaIndexPatterns();
        await PageObjects.settings.clickIndexPatternByName('data-view-edit-field');
        await PageObjects.settings.removeIndexPattern();
      });

      it('should show preview for fields in _source', async function () {
        await PageObjects.settings.changeAndValidateFieldFormat({
          name: 'extension',
          fieldType: 'text',
          expectedPreviewText: 'css',
        });
      });

      it('should show preview for fields not in _source', async function () {
        await PageObjects.settings.changeAndValidateFieldFormat({
          name: 'extension.keyword',
          fieldType: 'keyword',
          expectedPreviewText: 'css',
        });
      });
    });
  });
}
