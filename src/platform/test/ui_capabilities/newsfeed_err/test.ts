/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../functional/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function uiCapabilitiesTests({ getService, getPageObjects }: FtrProviderContext) {
  const globalNav = getService('globalNav');
  const PageObjects = getPageObjects(['common', 'newsfeed']);

  describe('Newsfeed icon button handle errors', function () {
    before(async () => {
      await PageObjects.newsfeed.resetPage();
    });

    it('clicking on newsfeed icon should open you empty newsfeed', async () => {
      await globalNav.clickNewsfeed();
      const isOpen = await PageObjects.newsfeed.openNewsfeedPanel();
      expect(isOpen).to.be(true);

      const hasNewsfeedEmptyPanel = await PageObjects.newsfeed.openNewsfeedEmptyPanel();
      expect(hasNewsfeedEmptyPanel).to.be(true);
    });

    it('no red icon', async () => {
      const hasCheckedNews = await PageObjects.newsfeed.getRedButtonSign();
      expect(hasCheckedNews).to.be(false);
    });

    it('shows empty panel due to error response', async () => {
      const objects = await PageObjects.newsfeed.getNewsfeedList();
      expect(objects).to.eql([]);
    });

    it('clicking on newsfeed icon should close opened newsfeed', async () => {
      await globalNav.clickNewsfeed();
      const isOpen = await PageObjects.newsfeed.openNewsfeedPanel();
      expect(isOpen).to.be(false);
    });
  });
}
