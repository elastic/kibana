/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { discover } = getPageObjects(['discover']);
  const retry = getService('retry');
  const queryBar = getService('queryBar');
  const testSubjects = getService('testSubjects');

  describe('reopen discover session', function () {
    it('should reopen discover sessions correctly', async () => {
      const firstSession = 'Session1';
      const secondSession = 'Session2';

      await retry.try(async () => {
        expect(await discover.getHitCount()).to.be('14,004');
      });

      await discover.saveSearch(firstSession);
      await discover.waitUntilTabIsLoaded();

      await retry.try(async () => {
        expect(await discover.getHitCount()).to.be('14,004');
        expect(await discover.getSavedSearchTitle()).to.be(firstSession);
        await testSubjects.missingOrFail('unsavedChangesBadge');
      });

      const query = 'machine.os: "ios"';
      await queryBar.setQuery(query);
      await queryBar.submitQuery();
      await discover.waitUntilTabIsLoaded();

      await retry.try(async () => {
        expect(await discover.getHitCount()).to.be('2,784');
        await testSubjects.existOrFail('unsavedChangesBadge');
      });

      await discover.saveSearch(secondSession, true);
      await discover.waitUntilTabIsLoaded();

      await retry.try(async () => {
        expect(await discover.getHitCount()).to.be('2,784');
        expect(await queryBar.getQueryString()).to.be(query);
        expect(await discover.getSavedSearchTitle()).to.be(secondSession);
        await testSubjects.missingOrFail('unsavedChangesBadge');
      });

      await discover.loadSavedSearch(firstSession);
      await discover.waitUntilTabIsLoaded();

      await retry.try(async () => {
        expect(await discover.getHitCount()).to.be('14,004');
        expect(await queryBar.getQueryString()).to.be('');
        expect(await discover.getSavedSearchTitle()).to.be(firstSession);
        await testSubjects.missingOrFail('unsavedChangesBadge');
      });

      await discover.loadSavedSearch(secondSession);
      await discover.waitUntilTabIsLoaded();

      await retry.try(async () => {
        expect(await discover.getHitCount()).to.be('2,784');
        expect(await queryBar.getQueryString()).to.be(query);
        expect(await discover.getSavedSearchTitle()).to.be(secondSession);
        await testSubjects.missingOrFail('unsavedChangesBadge');
      });
    });
  });
}
