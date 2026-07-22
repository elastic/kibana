/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../../fixtures/common';

const navigateAwayAndBackToDiscover = async (pageObjects: {
  collapsibleNav: { clickItem: (itemName: 'Discover' | 'Dashboards') => Promise<void> };
  discover: { waitUntilTabIsLoaded: () => Promise<void> };
}) => {
  await pageObjects.collapsibleNav.clickItem('Dashboards');
  await pageObjects.collapsibleNav.clickItem('Discover');
  await pageObjects.discover.waitUntilTabIsLoaded();
};

spaceTest.describe('Discover side nav link', { tag: '@local-stateful-classic' }, () => {
  spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.setupDiscoverDefaults();
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.discover.goto({ queryMode: 'classic' });
  });

  spaceTest.afterAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.teardownDiscoverDefaults();
  });

  spaceTest('saves the last URL when in data view mode', async ({ pageObjects }) => {
    const { discover, queryBar } = pageObjects;

    await discover.writeAndSubmitKqlQuery('response:200');

    await navigateAwayAndBackToDiscover(pageObjects);

    expect(await queryBar.getQuery()).toBe('response:200');
    expect(await discover.getHitCount()).toBe('12,891');
  });

  spaceTest('saves the last URL when in ES|QL mode', async ({ pageObjects }) => {
    const { discover } = pageObjects;
    const esqlQuery = 'FROM logstash-* | LIMIT 30';

    await discover.writeAndSubmitEsqlQuery(esqlQuery);

    await navigateAwayAndBackToDiscover(pageObjects);

    expect(await discover.getEsqlQueryValue()).toBe(esqlQuery);
    expect(await discover.getHitCount()).toBe('30');
  });

  spaceTest('does not save the last URL if it was an ad-hoc data view', async ({ pageObjects }) => {
    const { discover, queryBar } = pageObjects;

    await discover.writeAndSubmitKqlQuery('response:200');
    await discover.createDataViewFromSearchBar({ name: 'logs', adHoc: true });
    await discover.writeAndSubmitKqlQuery('response:503');

    await navigateAwayAndBackToDiscover(pageObjects);

    expect(await queryBar.getQuery()).toBe('response:200');
    expect(await discover.getHitCount()).toBe('12,891');
  });

  spaceTest('saves the last URL if the session was saved', async ({ pageObjects, scoutSpace }) => {
    const { discover, queryBar } = pageObjects;
    const savedSession = `side-nav-session-${scoutSpace.id}-${Date.now()}`;

    await discover.createDataViewFromSearchBar({ name: 'logs', adHoc: true });
    await discover.writeAndSubmitKqlQuery('response:404');
    await discover.saveSearch(savedSession);

    await navigateAwayAndBackToDiscover(pageObjects);

    expect(await queryBar.getQuery()).toBe('response:404');
    expect(await discover.getHitCount()).toBe('696');
    expect(await discover.getCurrentQueryName()).toBe(savedSession);
  });
});
