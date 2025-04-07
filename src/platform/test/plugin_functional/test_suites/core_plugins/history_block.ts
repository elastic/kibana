/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import { PluginFunctionalProviderContext } from '../../services';

export default function ({ getService, getPageObjects }: PluginFunctionalProviderContext) {
  const PageObjects = getPageObjects(['common']);
  const browser = getService('browser');
  const testSubjects = getService('testSubjects');

  describe('application using `ScopedHistory.block`', () => {
    beforeEach(async () => {
      await PageObjects.common.navigateToApp('core_history_block');
    });

    describe('when navigating to another app', () => {
      it('prevents navigation if user click cancel on the confirmation dialog', async () => {
        await testSubjects.click('applink-external-test');

        await testSubjects.existOrFail('navigationBlockConfirmModal');
        await PageObjects.common.clickCancelOnModal(false);
        expect(await browser.getCurrentUrl()).to.contain('/app/core_history_block');
      });
      it('allows navigation if user click confirm on the confirmation dialog', async () => {
        await testSubjects.click('applink-external-test');

        await testSubjects.existOrFail('navigationBlockConfirmModal');
        await PageObjects.common.clickConfirmOnModal();
        expect(await browser.getCurrentUrl()).to.contain('/app/home');
      });
    });

    describe('when navigating to the same app', () => {
      it('prevents navigation if user click cancel on the confirmation dialog', async () => {
        await testSubjects.click('applink-intra-test');

        await testSubjects.existOrFail('navigationBlockConfirmModal');
        await PageObjects.common.clickCancelOnModal(false);
        expect(await browser.getCurrentUrl()).to.contain('/app/core_history_block');
        expect(await browser.getCurrentUrl()).not.to.contain('/foo');
      });
      it('allows navigation if user click confirm on the confirmation dialog', async () => {
        await testSubjects.click('applink-intra-test');

        await testSubjects.existOrFail('navigationBlockConfirmModal');
        await PageObjects.common.clickConfirmOnModal();
        expect(await browser.getCurrentUrl()).to.contain('/app/core_history_block/foo');
      });
      it('allows navigating back without prompt once the block handler has been disposed', async () => {
        await testSubjects.click('applink-intra-test');
        await PageObjects.common.clickConfirmOnModal();
        expect(await browser.getCurrentUrl()).to.contain('/app/core_history_block/foo');

        await testSubjects.click('applink-intra-test');
        expect(await browser.getCurrentUrl()).to.contain('/app/core_history_block');
        expect(await browser.getCurrentUrl()).not.to.contain('/foo');
      });
    });
  });
}
