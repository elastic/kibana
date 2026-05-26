/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Discover sidebar virtualization behavior with a very large field list.
 */

import { spaceTest } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { testData } from '../../fixtures/common';

const HUGE_FIELDS_DATA_VIEW = 'testhuge*';
const HUGE_FIELDS_TIME_DEFAULTS = '{ "from": "2016-10-05T00:00:00", "to": "2016-10-06T00:00:00"}';

spaceTest.describe(
  'Discover huge field list virtualization',
  { tag: testData.DISCOVER_CORE_TAGS },
  () => {
    let hugeFieldsDataViewId: string | undefined;

    spaceTest.beforeAll(async ({ scoutSpace, apiServices }) => {
      const { data } = await apiServices.dataViews.create({
        title: HUGE_FIELDS_DATA_VIEW,
        name: HUGE_FIELDS_DATA_VIEW,
        timeFieldName: 'date',
        override: true,
        spaceId: scoutSpace.id,
      });

      hugeFieldsDataViewId = data.id;

      await scoutSpace.uiSettings.set({
        defaultIndex: hugeFieldsDataViewId,
        'timepicker:timeDefaults': HUGE_FIELDS_TIME_DEFAULTS,
      });
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      await pageObjects.discover.setQueryMode('classic');
      await pageObjects.discover.goto();
      await pageObjects.discover.waitUntilSearchingHasFinished();
    });

    spaceTest.afterAll(async ({ scoutSpace, apiServices }) => {
      await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');

      if (hugeFieldsDataViewId) {
        await apiServices.dataViews.delete(hugeFieldsDataViewId, scoutSpace.id);
      }

      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest('loads a huge field list for the data view', async ({ page, pageObjects }) => {
      await expect(pageObjects.discover.getSelectedDataView()).toContainText(HUGE_FIELDS_DATA_VIEW);

      await expect(
        page.testSubj.locator('fieldListGroupedAvailableFields-countLoading')
      ).toBeHidden({
        timeout: 30_000,
      });

      const availableFieldCount = Number(
        (await page.testSubj.innerText('fieldListGroupedAvailableFields-count')).replace(/,/g, '')
      );

      expect(availableFieldCount).toBeGreaterThan(5_000);
    });
  }
);
