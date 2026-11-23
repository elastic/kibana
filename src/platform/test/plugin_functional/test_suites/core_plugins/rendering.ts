/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';

import '@kbn/core-provider-plugin/types';
import type { WebElementWrapper } from '@kbn/ftr-common-functional-ui-services';
import type { PluginFunctionalProviderContext } from '../../services';

declare global {
  interface Window {
    /**
     * We use this global variable to track page history changes to ensure that
     * navigation is done without causing a full page reload.
     */
    __RENDERING_SESSION__?: string[];
  }
}

export default function ({ getService }: PluginFunctionalProviderContext) {
  const appsMenu = getService('appsMenu');
  const browser = getService('browser');
  const deployment = getService('deployment');
  const find = getService('find');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');

  const navigateTo = async (path: string) =>
    await browser.navigateTo(`${deployment.getHostPort()}${path}`);
  const navigateToApp = async (title: string) => {
    await appsMenu.clickLink(title);
    return browser.execute(() => {
      if (!('__RENDERING_SESSION__' in window)) {
        window.__RENDERING_SESSION__ = [];
      }

      window.__RENDERING_SESSION__!.push(window.location.pathname);
    });
  };

  const getInjectedMetadata = () =>
    browser.execute(() => {
      const injectedMetadata = document.querySelector('kbn-injected-metadata');
      // null/hasAttribute check and explicit error for better future troublehsooting
      // (see https://github.com/elastic/kibana/issues/167142)
      // The 'kbn-injected-metadata' tag that we're relying on here gets removed
      // some time after navigation (e.g. to /render/core). It appears that
      // occasionally this test fails to read the tag before it is removed.
      if (!injectedMetadata?.hasAttribute('data')) {
        throw new Error(`'kbn-injected-metadata.data' not found.`);
      }
      return JSON.parse(injectedMetadata.getAttribute('data')!);
    });
  const exists = (selector: string) => testSubjects.exists(selector);
  const findLoadingMessage = () => testSubjects.find('kbnLoadingMessage', 5000);
  const getRenderingSession = () =>
    browser.execute(() => {
      return window.__RENDERING_SESSION__;
    });

  // Failing: See https://github.com/elastic/kibana/issues/240348
  describe.skip('rendering service', () => {
    it('renders "core" application', async () => {
      // This retry loop to get the injectedMetadata is to overcome flakiness
      // (see comment in getInjectedMetadata)
      let injectedMetadata: Partial<{ legacyMetadata: any }> = { legacyMetadata: undefined };
      let loadingMessage: WebElementWrapper | null = null;
      await navigateTo('/render/core');
      await retry.tryWithRetries(
        'injectedMetadata',
        async () => {
          await browser.refresh();
          [injectedMetadata, loadingMessage] = await Promise.all([
            getInjectedMetadata(),
            findLoadingMessage(),
          ]);
          expect(injectedMetadata).to.not.be.empty();
        },
        { retryCount: 5 }
      );
      const userSettings = injectedMetadata!.legacyMetadata?.uiSettings?.user;

      expect(userSettings).to.not.be.empty();
      expect(loadingMessage).to.not.be.empty();

      await find.waitForElementStale(loadingMessage!);

      expect(await exists('renderingHeader')).to.be(true);
    });

    it('renders "core" application without user settings', async () => {
      // This retry loop to get the injectedMetadata is to overcome flakiness
      // (see comment in getInjectedMetadata)
      let injectedMetadata: Partial<{ legacyMetadata: any }> = { legacyMetadata: undefined };
      let loadingMessage: WebElementWrapper | null = null;
      await navigateTo('/render/core?isAnonymousPage=true');
      await retry.tryWithRetries(
        'injectedMetadata',
        async () => {
          await browser.refresh();
          [injectedMetadata, loadingMessage] = await Promise.all([
            getInjectedMetadata(),
            findLoadingMessage(),
          ]);
          expect(injectedMetadata).to.not.be.empty();
        },
        { retryCount: 5 }
      );
      const userSettings = injectedMetadata!.legacyMetadata?.uiSettings?.user;

      expect(userSettings).to.be.empty();
      expect(loadingMessage).to.not.be.empty();

      expect(userSettings).to.be.empty();

      await find.waitForElementStale(loadingMessage!);

      expect(await exists('renderingHeader')).to.be(true);
    });

    it('navigates between standard application and one with custom appRoute', async () => {
      await navigateTo('/');
      await find.waitForElementStale(await findLoadingMessage());
      await testSubjects.click('skipWelcomeScreen');

      await navigateToApp('App Status Start Page');
      expect(await exists('appStatusApp')).to.be(true);
      expect(await exists('renderingHeader')).to.be(false);

      await navigateToApp('Rendering');
      expect(await exists('appStatusApp')).to.be(false);
      expect(await exists('renderingHeader')).to.be(true);

      await navigateToApp('App Status Start Page');
      expect(await exists('appStatusApp')).to.be(true);
      expect(await exists('renderingHeader')).to.be(false);

      expect(await getRenderingSession()).to.eql([
        '/app/app_status_start',
        '/render/core',
        '/app/app_status_start',
      ]);
    });

    it('navigates between applications with custom appRoutes', async () => {
      await navigateTo('/');
      await find.waitForElementStale(await findLoadingMessage());

      await navigateToApp('Rendering');
      expect(await exists('renderingHeader')).to.be(true);
      expect(await exists('customAppRouteHeader')).to.be(false);

      await navigateToApp('Custom App Route');
      expect(await exists('customAppRouteHeader')).to.be(true);
      expect(await exists('renderingHeader')).to.be(false);

      await navigateToApp('Rendering');
      expect(await exists('renderingHeader')).to.be(true);
      expect(await exists('customAppRouteHeader')).to.be(false);

      expect(await getRenderingSession()).to.eql([
        '/render/core',
        '/custom/appRoute',
        '/render/core',
      ]);
    });
  });
}
