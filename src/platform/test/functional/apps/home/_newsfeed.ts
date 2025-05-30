/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const globalNav = getService('globalNav');
  const PageObjects = getPageObjects(['newsfeed', 'common']);

  describe('Newsfeed', () => {
    before(async () => {
      await PageObjects.newsfeed.resetPage();
    });

    it('has red icon which is a sign of not checked news', async () => {
      const hasCheckedNews = await PageObjects.newsfeed.getRedButtonSign();
      expect(hasCheckedNews).to.be(true);
    });

    it('clicking on newsfeed icon should open you newsfeed', async () => {
      await globalNav.clickNewsfeed();
      const isOpen = await PageObjects.newsfeed.openNewsfeedPanel();
      expect(isOpen).to.be(true);
    });

    it('no red icon, because all news is checked', async () => {
      const hasCheckedNews = await PageObjects.newsfeed.getRedButtonSign();
      expect(hasCheckedNews).to.be(false);
    });

    it('shows all news from newsfeed', async () => {
      const objects = await PageObjects.newsfeed.getNewsfeedList();

      // can't shim the API in cloud so going to check that at least something is rendered
      // to test that the API was called and returned something that could be rendered
      expect(objects.length).to.be.above(0);
    });

    it('clicking on newsfeed icon should close opened newsfeed', async () => {
      await globalNav.clickNewsfeed();
      const isOpen = await PageObjects.newsfeed.openNewsfeedPanel();
      expect(isOpen).to.be(false);
    });
  });
}
