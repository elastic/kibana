/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../fixtures';

const scriptedField = (name: string, type: string, script: string) => ({
  name,
  type,
  script,
  lang: 'painless',
  scripted: true,
  searchable: true,
  aggregatable: true,
  readFromDocValues: false,
  count: 0,
});

const SCRIPTED_FIELDS = {
  ramPain1: scriptedField(
    'ramPain1',
    'number',
    `if (doc['machine.ram'].size() == 0) return -1;
          else return doc['machine.ram'].value / (1024 * 1024 * 1024);
        `
  ),
  painString: scriptedField(
    'painString',
    'string',
    "if (doc['response.raw'].value == '200') { return 'good'} else { return 'bad'}"
  ),
  painBool: scriptedField('painBool', 'boolean', "doc['response.raw'].value == '200'"),
  painDate: scriptedField(
    'painDate',
    'date',
    "doc['utc_time'].value.toEpochMilli() + (1000) * 60 * 60"
  ),
};

const TIME_RANGE = { from: '2015-09-17T06:31:44.000Z', to: '2015-09-18T18:31:44.000Z' };
const DATE_FIELD_TIME_RANGE = { from: '2015-09-17T19:22:00.000Z', to: '2015-09-18T07:00:00.000Z' };

spaceTest.describe('Using scripted fields in Discover', { tag: '@local-stateful-classic' }, () => {
  let dataViewId: string;

  spaceTest.beforeAll(async ({ apiServices, kbnClient, scoutSpace }) => {
    // Only the makelogs indices: the scripts read fields that logstash_functional does not map.
    const { data } = await apiServices.dataViews.create({
      title: 'logstash-2015.09.1*',
      timeFieldName: '@timestamp',
      override: true,
      spaceId: scoutSpace.id,
    });
    dataViewId = data.id;

    // The scripted fields are added to the saved object because the data views API drops their
    // `lang`, which Discover needs to build script filters. The management form is covered by
    // scripted_fields.spec.ts. painDate carries its own date format, which Discover must apply.
    const { attributes } = await kbnClient.savedObjects.get<{ fields: string }>({
      type: 'index-pattern',
      id: dataViewId,
      space: scoutSpace.id,
    });
    await kbnClient.savedObjects.update({
      type: 'index-pattern',
      id: dataViewId,
      space: scoutSpace.id,
      overwrite: true,
      attributes: {
        fields: JSON.stringify([
          ...JSON.parse(attributes.fields),
          ...Object.values(SCRIPTED_FIELDS),
        ]),
        fieldFormatMap: JSON.stringify({
          painDate: { id: 'date', params: { pattern: 'YYYY-MM-DD HH:00' } },
        }),
      },
    });

    await scoutSpace.uiSettings.set({ defaultIndex: dataViewId, 'dateFormat:tz': 'UTC' });
  });

  spaceTest.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset('defaultIndex', 'dateFormat:tz', 'timepicker:timeDefaults');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest(
    'numeric field: value, sort, filter and Lens hand-off',
    async ({ scoutSpace, page, pageObjects }) => {
      const { discover, dataGrid, filterBar } = pageObjects;
      const field = 'ramPain1';
      const selectedField = page.testSubj
        .locator('fieldListGroupedSelectedFields')
        .locator(`[data-test-subj="field-${field}"]`);
      await scoutSpace.uiSettings.setDefaultTime(TIME_RANGE);

      await spaceTest.step('shows the value Elasticsearch computes for the column', async () => {
        await discover.goto({ queryMode: 'classic' });
        await discover.waitUntilTabIsLoaded();
        await dataGrid.addFieldFromSidebar(field);

        await expect(dataGrid.getCellValue(0, field)).toHaveText('18');
      });

      await spaceTest.step('sorts through a _script sort', async () => {
        // Only the scripted field sorts, so ties on the time field cannot affect the first row.
        await page.gotoApp('discover', {
          hash: `/?_a=(columns:!(${field}),sort:!(!(${field},asc)))`,
        });
        await discover.waitUntilTabIsLoaded();
        await expect(dataGrid.getCellValue(0, field)).toHaveText('-1');

        await dataGrid.sortColumn(field, 'Sort High-Low');
        await discover.waitUntilSearchingHasFinished();
        await expect(dataGrid.getCellValue(0, field)).toHaveText('30');
      });

      await spaceTest.step('filters from the field popover', async () => {
        await selectedField.click();
        await page.testSubj.click(`plus-${field}-14`);
        await discover.waitUntilSearchingHasFinished();

        await expect(discover.getHitCountLocator()).toHaveText('31');
      });

      await spaceTest.step('hands the field over to Lens', async () => {
        await filterBar.removeAllFilters();
        await discover.waitUntilSearchingHasFinished();
        await selectedField.click();
        await page.testSubj.click(`fieldVisualize-${field}`);

        await expect(page.testSubj.locator('lns-dimensionTrigger')).toHaveText([
          '@timestamp',
          `Median of ${field}`,
        ]);
      });
    }
  );

  spaceTest('string field: value, sort and filter', async ({ scoutSpace, page, pageObjects }) => {
    const { discover, dataGrid } = pageObjects;
    const field = 'painString';
    await scoutSpace.uiSettings.setDefaultTime(TIME_RANGE);

    await spaceTest.step('shows the computed string', async () => {
      await discover.goto({ queryMode: 'classic' });
      await discover.waitUntilTabIsLoaded();
      await dataGrid.addFieldFromSidebar(field);

      await expect(dataGrid.getCellValue(0, field)).toHaveText('good');
    });

    await spaceTest.step('sorts through a _script sort of type string', async () => {
      await page.gotoApp('discover', {
        hash: `/?_a=(columns:!(${field}),sort:!(!(${field},asc)))`,
      });
      await discover.waitUntilTabIsLoaded();
      await expect(dataGrid.getCellValue(0, field)).toHaveText('bad');

      await dataGrid.sortColumn(field, 'Sort Z-A');
      await discover.waitUntilSearchingHasFinished();
      await expect(dataGrid.getCellValue(0, field)).toHaveText('good');
    });

    await spaceTest.step('filters on a string script value', async () => {
      await page.testSubj
        .locator('fieldListGroupedSelectedFields')
        .locator(`[data-test-subj="field-${field}"]`)
        .click();
      await page.testSubj.click(`plus-${field}-bad`);
      await discover.waitUntilSearchingHasFinished();

      await expect(discover.getHitCountLocator()).toHaveText('27');
    });
  });

  spaceTest('boolean field: value and filter', async ({ scoutSpace, page, pageObjects }) => {
    const { discover, dataGrid } = pageObjects;
    const field = 'painBool';
    await scoutSpace.uiSettings.setDefaultTime(TIME_RANGE);

    await spaceTest.step('shows the computed boolean', async () => {
      await discover.goto({ queryMode: 'classic' });
      await discover.waitUntilTabIsLoaded();
      await dataGrid.addFieldFromSidebar(field);

      await expect(dataGrid.getCellValue(0, field)).toHaveText('true');
    });

    await spaceTest.step('filters on a boolean script value', async () => {
      await page.testSubj
        .locator('fieldListGroupedSelectedFields')
        .locator(`[data-test-subj="field-${field}"]`)
        .click();
      await page.testSubj.click(`plus-${field}-true`);
      await discover.waitUntilSearchingHasFinished();

      await expect(discover.getHitCountLocator()).toHaveText('359');
    });
  });

  spaceTest(
    'date field: formatted value and filter from a cell',
    async ({ scoutSpace, pageObjects }) => {
      const { discover, dataGrid } = pageObjects;
      const field = 'painDate';
      await scoutSpace.uiSettings.setDefaultTime(DATE_FIELD_TIME_RANGE);

      await spaceTest.step('applies the format of the scripted field', async () => {
        await discover.goto({ queryMode: 'classic' });
        await discover.waitUntilTabIsLoaded();
        await dataGrid.addFieldFromSidebar(field);

        await expect(dataGrid.getCellValue(0, field)).toHaveText('2015-09-18 07:00');
      });

      await spaceTest.step('filters from the data grid cell action', async () => {
        await dataGrid.filterCell({ rowIndex: 0, columnId: field, mode: 'for' });
        await discover.waitUntilSearchingHasFinished();

        await expect(discover.getHitCountLocator()).toHaveText('1');
      });
    }
  );
});
