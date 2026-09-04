/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Mixed date and date_nanos documents render in nanos-precision order.
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest, testData } from '../../../common/ui/fixtures';

spaceTest.describe('date nanos mixed', { tag: '@local-stateful-classic' }, () => {
  spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.savedObjects.load(testData.DATE_NANOS_MIXED_KBN_ARCHIVE);
    await discoverScoutSpace.uiSettings.setDefaultIndex(testData.DATE_NANOS_MIXED_DATA_VIEW);
    await discoverScoutSpace.uiSettings.setDefaultTime({
      from: '2019-01-01T00:00:00.000Z',
      to: '2019-01-01T23:59:59.999Z',
    });
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsViewer();
    await pageObjects.discover.goto({ queryMode: 'classic' });
    await pageObjects.discover.waitUntilTabIsLoaded();
  });

  spaceTest.afterAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
    await discoverScoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest('shows date and date_nanos records in the right order', async ({ pageObjects }) => {
    const { discover } = pageObjects;

    expect(await discover.getDocTableIndex(1)).toContain('Jan 1, 2019 @ 12:10:30.124000000');
    expect(await discover.getDocTableIndex(2)).toContain('Jan 1, 2019 @ 12:10:30.123498765');
    expect(await discover.getDocTableIndex(3)).toContain('Jan 1, 2019 @ 12:10:30.123456789');
    expect(await discover.getDocTableIndex(4)).toContain('Jan 1, 2019 @ 12:10:30.123000000');
  });
});
