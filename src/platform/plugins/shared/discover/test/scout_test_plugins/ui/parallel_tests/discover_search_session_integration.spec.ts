/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { randomUUID } from 'crypto';
import { expect } from '@kbn/scout/ui';
import type { SessionObserver } from '@kbn/data-plugin/test/scout_test_plugins/ui/fixtures';
import { spaceTest } from '@kbn/data-plugin/test/scout_test_plugins/ui/fixtures';

// Returns the most recently started session ID, then clears the recorded IDs.
const clearAfterCurrentSession = async (sessionObserver: SessionObserver): Promise<string> => {
  await expect.poll(async () => (await sessionObserver.getSessionIds()).length).toBeGreaterThan(0);
  const sessionId = (await sessionObserver.getSessionIds()).at(-1);
  if (!sessionId) {
    throw new Error('No search session was started before the action');
  }
  await sessionObserver.clear();
  return sessionId;
};

const expectSingleNewSession = async (
  sessionObserver: SessionObserver,
  initialSessionId: string
): Promise<void> => {
  await expect.poll(() => sessionObserver.getSessionIds()).toHaveLength(1);
  const [sessionId] = await sessionObserver.getSessionIds();
  expect(sessionId).not.toBe(initialSessionId);
};

spaceTest.describe('Discover search session lifecycle', { tag: '@local-stateful-classic' }, () => {
  const sourceDataViewName = `Session source ${randomUUID()}`;

  spaceTest.beforeAll(async ({ apiServices, scoutSpace }) => {
    const { data: shakespeare } = await apiServices.dataViews.create({
      title: 'shakespeare',
      spaceId: scoutSpace.id,
    });
    await apiServices.dataViews.create({
      title: 'shakes*',
      name: sourceDataViewName,
      spaceId: scoutSpace.id,
    });
    await scoutSpace.uiSettings.set({
      defaultIndex: shakespeare.id,
      hideAnnouncements: true,
      'timepicker:refreshIntervalDefaults': JSON.stringify({ pause: true, value: 0 }),
    });
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects, sessionObserver }) => {
    await browserAuth.loginAsViewer();
    await pageObjects.discover.goto({ queryMode: 'classic' });
    await pageObjects.discover.selectDataView('shakespeare', { createAdHocIfMissing: false });
    await pageObjects.discover.waitUntilTabIsLoaded();
    await expect.poll(() => sessionObserver.isAvailable()).toBe(true);
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset(
      'defaultIndex',
      'hideAnnouncements',
      'timepicker:refreshIntervalDefaults'
    );
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest('Starts on data view select', async ({ pageObjects, sessionObserver }) => {
    await pageObjects.discover.selectDataView(sourceDataViewName, { createAdHocIfMissing: false });
    await pageObjects.discover.waitUntilTabIsLoaded();
    const initialSessionId = await clearAfterCurrentSession(sessionObserver);

    await pageObjects.discover.selectDataView('shakespeare', { createAdHocIfMissing: false });
    await pageObjects.discover.waitUntilTabIsLoaded();
    await expectSingleNewSession(sessionObserver, initialSessionId);
  });

  spaceTest('Starts on a refresh', async ({ pageObjects, sessionObserver }) => {
    const initialSessionId = await clearAfterCurrentSession(sessionObserver);

    await pageObjects.discover.submitQueryAndWait();
    await expectSingleNewSession(sessionObserver, initialSessionId);
  });

  spaceTest('Starts a new session on sort', async ({ pageObjects, sessionObserver }) => {
    const initialSessionId = await clearAfterCurrentSession(sessionObserver);

    // Observe the entire add-column and sort sequence as one session.
    await pageObjects.dataGrid.addFieldFromSidebar('speaker');
    await pageObjects.dataGrid.sortColumn('speaker', 'Sort A-Z');
    await pageObjects.discover.waitUntilTabIsLoaded();
    await expectSingleNewSession(sessionObserver, initialSessionId);
  });

  spaceTest('Starts a new session on filter change', async ({ pageObjects, sessionObserver }) => {
    await pageObjects.dataGrid.addFieldFromSidebar('speaker');
    await pageObjects.dataGrid.sortColumn('speaker', 'Sort A-Z');
    await pageObjects.discover.waitUntilTabIsLoaded();
    const initialSessionId = await clearAfterCurrentSession(sessionObserver);

    await pageObjects.filterBar.addFilter({
      field: 'line_number',
      operator: 'is',
      value: '4.3.108',
    });
    await pageObjects.discover.waitUntilTabIsLoaded();
    await expectSingleNewSession(sessionObserver, initialSessionId);
  });
});
