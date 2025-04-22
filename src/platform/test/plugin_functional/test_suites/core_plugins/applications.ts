/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import type { PluginFunctionalProviderContext } from '../../services';

export default function ({ getService, getPageObject }: PluginFunctionalProviderContext) {
  const common = getPageObject('common');
  const browser = getService('browser');
  const appsMenu = getService('appsMenu');
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const deployment = getService('deployment');
  const esArchiver = getService('esArchiver');
  const log = getService('log');

  const clickAppLink = async (app: string) => {
    const appLink = `fooNav${app}`;
    if (!(await testSubjects.exists(appLink))) {
      log.debug(`App ${app} not found on side nav`);
    }
    await testSubjects.click(appLink);
  };

  const loadingScreenNotShown = async () =>
    expect(await testSubjects.exists('kbnLoadingMessage')).to.be(false);

  const checkAppVisible = async (app: string) => {
    const appContainer = `fooApp${app}`;
    await testSubjects.existOrFail(appContainer);
  };

  const getAppWrapperHeight = async () => {
    const wrapper = await find.byClassName('kbnAppWrapper');
    return (await wrapper.getSize()).height;
  };

  const navigateTo = async (path: string) =>
    await browser.navigateTo(`${deployment.getHostPort()}${path}`);

  describe('ui applications', function describeIndexTests() {
    before(async () => {
      await esArchiver.emptyKibanaIndex();
      await common.navigateToApp('foo');
      await common.dismissBanner();
    });

    it('starts on home page', async () => {
      await checkAppVisible('Home');
    });

    it('redirects and renders correctly regardless of trailing slash', async () => {
      await navigateTo(`/app/foo`);
      await browser.waitForUrlToBe('/app/foo/home');
      await checkAppVisible('Home');
      await navigateTo(`/app/foo/`);
      await browser.waitForUrlToBe('/app/foo/home');
      await checkAppVisible('Home');
    });

    it('navigates to its own pages', async () => {
      // Go to page A
      await clickAppLink('PageA');
      await browser.waitForUrlToBe('/app/foo/page-a');
      await loadingScreenNotShown();
      await checkAppVisible('PageA');

      // Go to home page
      await clickAppLink('Home');
      await browser.waitForUrlToBe('/app/foo/home');
      await loadingScreenNotShown();
      await checkAppVisible('Home');
    });

    it('can use the back button to navigate within an app', async () => {
      await browser.goBack();
      await browser.waitForUrlToBe('/app/foo/page-a');
      await loadingScreenNotShown();
      await checkAppVisible('PageA');
    });

    it('navigates to app root when navlink is clicked', async () => {
      await appsMenu.clickLink('Foo');
      await browser.waitForUrlToBe('/app/foo/home');
      await loadingScreenNotShown();
      await checkAppVisible('Home');
    });

    it('navigates to other apps', async () => {
      await clickAppLink('BarPageB');
      await loadingScreenNotShown();
      await testSubjects.existOrFail('barAppPageB');
      await browser.waitForUrlToBe('/app/bar/page-b?query=here');
    });

    it('preserves query parameters across apps', async () => {
      const querySpan = await testSubjects.find('barAppPageBQuery');
      expect(await querySpan.getVisibleText()).to.eql(`[["query","here"]]`);
    });

    it('can use the back button to navigate back to previous app', async () => {
      await browser.goBack();
      await browser.waitForUrlToBe('/app/foo/home');
      await loadingScreenNotShown();
      await checkAppVisible('Home');
    });

    it('chromeless applications are not visible in apps list', async () => {
      expect(await appsMenu.linkExists('Chromeless')).to.be(false);
    });

    it('navigating to chromeless application hides chrome', async () => {
      await common.navigateToApp('chromeless');
      await loadingScreenNotShown();
      expect(await testSubjects.exists('headerGlobalNav')).to.be(false);

      const wrapperHeight = await getAppWrapperHeight();
      const windowHeight = (await browser.getWindowInnerSize()).height;
      expect(wrapperHeight).to.eql(windowHeight);
    });

    it('navigating away from chromeless application shows chrome', async () => {
      await common.navigateToApp('foo');
      await loadingScreenNotShown();
      expect(await testSubjects.exists('headerGlobalNav')).to.be(true);

      const wrapperHeight = await getAppWrapperHeight();
      const windowHeight = (await browser.getWindowInnerSize()).height;
      expect(wrapperHeight).to.be.below(windowHeight);
    });
  });
}
