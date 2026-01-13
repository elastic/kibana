/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import type { SessionNotificationsGlobalApi } from '@kbn/session-notifications-plugin/public';
import type { PluginFunctionalProviderContext } from '../../services';

export default function ({ getService, getPageObjects }: PluginFunctionalProviderContext) {
  const { common, dashboard, discover, unifiedFieldList } = getPageObjects([
    'common',
    'dashboard',
    'discover',
    'unifiedFieldList',
  ]);
  const filterBar = getService('filterBar');
  const testSubjects = getService('testSubjects');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const retry = getService('retry');
  const browser = getService('browser');

  // The __SESSION_NOTIFICATIONS_PLUGIN__ global variable is defined in
  // src/platform/test/plugin_functional/plugins/session_notifications/public/plugin.tsx
  // specifically to allow these tests to access the session IDs tracked by the plugin

  const getSessionIds = () =>
    browser.execute(() => {
      const windowWithGlobalApi = window as {
        __SESSION_NOTIFICATIONS_PLUGIN__?: SessionNotificationsGlobalApi;
      };

      return windowWithGlobalApi.__SESSION_NOTIFICATIONS_PLUGIN__?.getSessionIds() ?? [];
    });

  const clearSessionIds = () =>
    browser.execute(() => {
      const windowWithGlobalApi = window as {
        __SESSION_NOTIFICATIONS_PLUGIN__?: SessionNotificationsGlobalApi;
      };

      windowWithGlobalApi.__SESSION_NOTIFICATIONS_PLUGIN__?.clearSessionIds();
    });

  describe('Session management', function describeSessionManagementTests() {
    describe('Discover', () => {
      before(async () => {
        await common.navigateToApp('discover');
        await discover.waitUntilTabIsLoaded();
        await discover.selectIndexPattern('All logs');
        await discover.waitUntilTabIsLoaded();
        await clearSessionIds();
      });

      afterEach(async () => {
        await clearSessionIds();
      });

      it('Starts on index pattern select', async () => {
        await discover.selectIndexPattern('shakespeare');
        await discover.waitUntilTabIsLoaded();
        const sessionIds = await getSessionIds();

        expect(sessionIds.length).to.be(1);
      });

      it('Starts on a refresh', async () => {
        await testSubjects.click('querySubmitButton');
        await discover.waitUntilTabIsLoaded();
        const sessionIds = await getSessionIds();
        expect(sessionIds.length).to.be(1);
      });

      it('Starts a new session on sort', async () => {
        await unifiedFieldList.clickFieldListItemAdd('speaker');
        await discover.clickFieldSort('speaker', 'Sort A-Z');
        await discover.waitUntilTabIsLoaded();
        const sessionIds = await getSessionIds();
        expect(sessionIds.length).to.be(1);
      });

      it('Starts a new session on filter change', async () => {
        await filterBar.addFilter({ field: 'line_number', operation: 'is', value: '4.3.108' });
        await discover.waitUntilTabIsLoaded();
        const sessionIds = await getSessionIds();
        expect(sessionIds.length).to.be(1);
      });
    });

    describe('Dashboard', () => {
      before(async () => {
        await esArchiver.loadIfNeeded(
          'src/platform/test/functional/fixtures/es_archiver/dashboard/current/data'
        );
        await kibanaServer.savedObjects.cleanStandardList();
        await kibanaServer.importExport.load(
          'src/platform/test/functional/fixtures/kbn_archiver/dashboard/current/kibana'
        );
        await common.navigateToApp('dashboard');
        await dashboard.loadSavedDashboard('dashboard with filter');
      });

      afterEach(async () => {
        await clearSessionIds();
      });

      after(async () => {
        await esArchiver.unload(
          'src/platform/test/functional/fixtures/es_archiver/dashboard/current/data'
        );
        await kibanaServer.savedObjects.cleanStandardList();
      });

      it('on load there is a single session', async () => {
        const sessionIds = await getSessionIds();
        expect(sessionIds.length).to.be(1);
      });

      it('starts a session on refresh', async () => {
        await testSubjects.click('querySubmitButton');
        await discover.waitUntilTabIsLoaded();
        const sessionIds = await getSessionIds();
        expect(sessionIds.length).to.be(1);
      });

      it('starts a session on filter change', async () => {
        // For some reason, when loading the dashboard, sometimes the filter doesn't show up, so we
        // refresh until it shows up
        await retry.try(
          async () => {
            const hasFilter = await filterBar.hasFilter('animal', 'dog');
            if (!hasFilter) throw new Error('filter not found');
          },
          async () => {
            await browser.refresh();
            await discover.waitUntilTabIsLoaded();
            await clearSessionIds();
          }
        );
        await filterBar.removeFilter('animal');
        const sessionIds = await getSessionIds();
        expect(sessionIds.length).to.be(1);
      });
    });
  });
}
