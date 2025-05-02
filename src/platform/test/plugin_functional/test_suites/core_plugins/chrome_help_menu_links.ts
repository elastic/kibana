/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import url from 'url';
import expect from '@kbn/expect';
import { PluginFunctionalProviderContext } from '../../services';

declare global {
  interface Window {
    _nonReloadedFlag?: boolean;
  }
}

const getPathWithHash = (absoluteUrl: string) => {
  const parsed = url.parse(absoluteUrl);
  return `${parsed.path}${parsed.hash ?? ''}`;
};

export default function ({ getService, getPageObjects }: PluginFunctionalProviderContext) {
  const PageObjects = getPageObjects(['common']);
  const browser = getService('browser');
  const testSubjects = getService('testSubjects');

  const setNonReloadedFlag = () => {
    return browser.executeAsync(async (cb) => {
      window._nonReloadedFlag = true;
      cb();
    });
  };
  const wasReloaded = () => {
    return browser.executeAsync<boolean>(async (cb) => {
      const reloaded = window._nonReloadedFlag !== true;
      cb(reloaded);
    });
  };

  describe('chrome helpMenu links', () => {
    beforeEach(async () => {
      await PageObjects.common.navigateToApp('core_help_menu');
      await setNonReloadedFlag();
    });

    it('navigates to internal custom links without performing a full page refresh', async () => {
      await testSubjects.click('helpMenuButton');
      await testSubjects.click('coreHelpMenuInternalLinkTest');

      expect(getPathWithHash(await browser.getCurrentUrl())).to.eql('/app/management');
      expect(await wasReloaded()).to.eql(false);
    });
  });
}
