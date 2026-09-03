/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Histogram and sidebar resizable panels.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../../../common/ui/fixtures';

const RESIZE_DISTANCE = 100;

spaceTest.describe('resizable panels', { tag: tags.deploymentAgnostic }, () => {
  spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.setupDiscoverDefaults();
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsViewer();
    await pageObjects.discover.goto({ queryMode: 'classic' });
    await pageObjects.discover.waitUntilTabIsLoaded();
  });

  spaceTest.afterAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.teardownDiscoverDefaults();
  });

  spaceTest('resizes the histogram layout panels', async ({ pageObjects }) => {
    const { discover } = pageObjects;
    const topPanelSize = await discover.getHistogramHeight();

    await discover.resizeHistogramBy(RESIZE_DISTANCE);

    expect(await discover.getHistogramHeight()).toBe(topPanelSize + RESIZE_DISTANCE);
  });

  spaceTest('resizes the sidebar layout panels', async ({ pageObjects }) => {
    const { discover } = pageObjects;
    const leftPanelSize = await discover.getSidebarWidth();

    await discover.resizeSidebarBy(RESIZE_DISTANCE);

    expect(await discover.getSidebarWidth()).toBe(leftPanelSize + RESIZE_DISTANCE);
  });
});
