/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const browser = getService('browser');
  const PageObjects = getPageObjects(['settings', 'common', 'header']);
  const kibanaServer = getService('kibanaServer');

  // Migration recommendation: MIGRATE TO SCOUT
  // Tests that the legacy `dataViews` URL path segment is redirected back to the canonical
  // `indexPatterns` path, both for the list page and for a specific data view detail page (where
  // `dataView` also replaces `patterns`). No existing Scout coverage found. Both tests are pure
  // navigation + URL assertion checks with no ES archive or special roles required. The `discover`
  // kbn_archiver fixture provides the logstash-* data view. URL manipulation and assertion
  // translate directly to Playwright `page.goto` + `page.url()`. Worth keeping: these are
  // important backward-compatibility regression checks for users who have bookmarked old URLs.
  describe('legacy urls redirect correctly', () => {
    before(async function () {
      await browser.setWindowSize(1200, 800);
      await kibanaServer.importExport.load(
        'src/platform/test/functional/fixtures/kbn_archiver/discover'
      );
      await kibanaServer.uiSettings.replace({});
    });

    after(async function afterAll() {
      await kibanaServer.importExport.unload(
        'src/platform/test/functional/fixtures/kbn_archiver/discover'
      );
    });

    it('redirects correctly to index pattern management', async () => {
      await PageObjects.settings.navigateTo();
      await PageObjects.settings.clickKibanaIndexPatterns();
      await PageObjects.settings.clickIndexPatternLogstash();

      const url = await (await browser.getCurrentUrl()).split('#')[0];
      const modifiedUrl = url.replace('indexPatterns', 'dataViews');
      await browser.navigateTo(modifiedUrl);
      await PageObjects.header.waitUntilLoadingHasFinished();
      const newUrl = (await browser.getCurrentUrl()).split('#')[0];
      expect(newUrl).to.equal(url);
    });

    it('redirects correctly to specific index pattern', async () => {
      await PageObjects.settings.clickKibanaIndexPatterns();
      await PageObjects.settings.clickIndexPatternLogstash();

      const url = await (await browser.getCurrentUrl()).split('#')[0];
      const modifiedUrl = url.replace('patterns', 'dataView').replace('indexPatterns', 'dataViews');
      await browser.navigateTo(modifiedUrl);
      await PageObjects.header.waitUntilLoadingHasFinished();
      const newUrl = (await browser.getCurrentUrl()).split('#')[0];
      expect(newUrl).to.equal(url);
    });
  });
}
