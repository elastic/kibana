/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutParallelWorkerFixtures } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../fixtures';
import { getFieldFormattersRole } from '../fixtures/services/privileges';

const ROUND_TRIP_INDEX_PREFIX = 'field_formats_round_trip';
const META_UNIT_INDEX_PREFIX = 'field_formats_meta_unit';

spaceTest.describe('Data view field formatters', { tag: '@local-stateful-classic' }, () => {
  const createdIndices: string[] = [];

  const createIndexWithDataView = async (
    { esClient, apiServices }: Pick<ScoutParallelWorkerFixtures, 'esClient' | 'apiServices'>,
    index: string,
    properties: Record<string, object>,
    document: Record<string, string | number>,
    spaceId: string
  ) => {
    if (await esClient.indices.exists({ index })) {
      await esClient.indices.delete({ index });
    }
    await esClient.indices.create({ index, mappings: { properties } });
    // Tracked right away so a later failure in this helper doesn't leak the index
    createdIndices.push(index);
    const { _id: documentId } = await esClient.index({ index, document, refresh: 'wait_for' });
    // The trailing wildcard sidesteps field caching when the data view is reused
    const { data } = await apiServices.dataViews.create({
      title: `${index}*`,
      override: true,
      spaceId,
    });
    return { dataViewId: data.id, documentId };
  };

  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.set({ 'data_views:cache_max_age': 0 });
  });

  spaceTest.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginWithCustomRole(getFieldFormattersRole());
  });

  spaceTest.afterAll(async ({ esClient, scoutSpace }) => {
    for (const index of createdIndices) {
      await esClient.indices.delete({ index }, { ignore: [404] });
    }
    await scoutSpace.uiSettings.unset('data_views:cache_max_age');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  // The converters are unit tested; this covers the three rendering paths only a browser proves:
  // text transform, link (`href`) and computed color styles, saved through the field flyout.
  spaceTest(
    'applies text, link and color formats from the field flyout',
    async ({ esClient, apiServices, scoutSpace, page, pageObjects }) => {
      const { dataViewDetail } = pageObjects;
      // Index names are unique per space so parallel workers don't share them
      const index = `${ROUND_TRIP_INDEX_PREFIX}_${scoutSpace.id}`.toLowerCase();
      const { dataViewId, documentId } = await createIndexWithDataView(
        { esClient, apiServices },
        index,
        {
          textField: { type: 'keyword' },
          linkField: { type: 'long' },
          colorField: { type: 'keyword' },
        },
        { textField: 'a keyword', linkField: 100, colorField: 'red' },
        scoutSpace.id
      );

      const editField = async (fieldName: string, format: string) => {
        await dataViewDetail.goto(dataViewId);
        await dataViewDetail.openFieldEditorForField(fieldName);
        await dataViewDetail.enableFormatAndSelect(format);
      };

      await spaceTest.step('upper-case the text field', async () => {
        await editField('textField', 'string');
        await dataViewDetail.setStringTransform('upper');
        await dataViewDetail.saveFieldEditor();
      });

      await spaceTest.step('turn the number field into a link', async () => {
        await editField('linkField', 'url');
        await dataViewDetail.setUrlTemplates({
          urlTemplate: 'https://elastic.co/?value={{value}}',
          labelTemplate: 'url label',
        });
        await dataViewDetail.saveFieldEditor();
      });

      await spaceTest.step('color the keyword field', async () => {
        await editField('colorField', 'color');
        await dataViewDetail.addColorRule({
          pattern: 'red',
          textColor: '#ffffff',
          backgroundColor: '#ff0000',
        });
        await dataViewDetail.saveFieldEditor();
      });

      await spaceTest.step('check the rendered values in the Discover doc viewer', async () => {
        await page.gotoApp('discover', {
          hash: `/doc/${dataViewId}/${index}?id=${documentId}`,
        });
        const row = (field: string) => page.testSubj.locator(`tableDocViewRow-${field}-value`);

        await expect(row('textField')).toHaveText('A KEYWORD');

        const link = row('linkField').getByRole('link');
        await expect(link).toHaveText('url label');
        await expect(link).toHaveAttribute('href', 'https://elastic.co/?value=100');

        const colored = row('colorField').locator('span').filter({ hasText: 'red' });
        await expect(colored).toHaveCSS('color', 'rgb(255, 255, 255)');
        await expect(colored).toHaveCSS('background-color', 'rgb(255, 0, 0)');
      });
    }
  );

  // A `meta.unit: 's'` mapping must reach Discover as a duration-formatted value. Nothing else
  // checks mapping -> metaUnitsToFormatter -> rendered value from start to end.
  spaceTest(
    'applies the default formatter from a field meta unit',
    async ({ esClient, apiServices, scoutSpace, page }) => {
      const index = `${META_UNIT_INDEX_PREFIX}_${scoutSpace.id}`.toLowerCase();
      const { dataViewId, documentId } = await createIndexWithDataView(
        { esClient, apiServices },
        index,
        { seconds: { type: 'long', meta: { unit: 's' } } },
        { seconds: 1234 },
        scoutSpace.id
      );

      await page.gotoApp('discover', {
        hash: `/doc/${dataViewId}/${index}?id=${documentId}`,
      });

      await expect(page.testSubj.locator('tableDocViewRow-seconds-value')).toHaveText('20.57 min');
    }
  );
});
