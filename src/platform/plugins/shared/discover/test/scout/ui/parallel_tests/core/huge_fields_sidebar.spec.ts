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

import { spaceTest, tags } from '@kbn/scout';
import type { EsClient } from '@kbn/scout';
import { expect, scrollContainerUntilTargetIsVisible } from '@kbn/scout/ui';

const HUGE_FIELDS_INDEX_PREFIX = 'testhuge_scout_virtualized';
const HUGE_FIELDS_DATA_VIEW_SUFFIX = '*';
const HUGE_FIELDS_DOC_ID = '1';
const HUGE_FIELDS_TARGET_INDEX = 1_050;
const HUGE_FIELDS_MAX_INDEX = 1_500;
const HUGE_FIELDS_TIME_DEFAULTS = '{ "from": "2016-10-05T00:00:00", "to": "2016-10-06T00:00:00"}';

const ensureHugeFieldsData = async ({
  esClient,
  indexName,
}: {
  esClient: EsClient;
  indexName: string;
}) => {
  const indexExists = await esClient.indices.exists({ index: indexName });

  if (!indexExists) {
    await esClient.indices.create({
      index: indexName,
      settings: {
        index: {
          mapping: {
            total_fields: {
              limit: 10_000,
            },
          },
          number_of_replicas: 0,
          number_of_shards: 1,
        },
      },
      mappings: {
        properties: {
          date: {
            type: 'date',
          },
        },
      },
    });
  }

  const document: Record<string, number | string> = {
    date: '2016-10-05T14:00:00',
  };

  for (let i = 0; i <= HUGE_FIELDS_MAX_INDEX; i++) {
    document[`myvar${i}`] = i;
  }

  await esClient.index({
    index: indexName,
    id: HUGE_FIELDS_DOC_ID,
    document,
    refresh: 'wait_for',
  });
};

spaceTest.describe('Discover huge field list virtualization', { tag: tags.stateful.all }, () => {
  let hugeFieldsDataViewId: string | undefined;
  let hugeFieldsDataViewTitle = '';
  let hugeFieldsIndexName = '';

  spaceTest.beforeAll(async ({ scoutSpace, apiServices, esClient }) => {
    hugeFieldsIndexName = `${HUGE_FIELDS_INDEX_PREFIX}_${scoutSpace.id}`;
    hugeFieldsDataViewTitle = `${hugeFieldsIndexName}${HUGE_FIELDS_DATA_VIEW_SUFFIX}`;

    await ensureHugeFieldsData({
      esClient,
      indexName: hugeFieldsIndexName,
    });

    const { data } = await apiServices.dataViews.create({
      title: hugeFieldsDataViewTitle,
      name: hugeFieldsDataViewTitle,
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
    await pageObjects.discover.goto({ queryMode: 'classic' });
    await pageObjects.discover.waitUntilSearchingHasFinished();
  });

  spaceTest.afterAll(async ({ scoutSpace, apiServices, esClient }) => {
    await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');

    if (hugeFieldsDataViewId) {
      await apiServices.dataViews.delete(hugeFieldsDataViewId, scoutSpace.id);
    }

    if (hugeFieldsIndexName) {
      await esClient.indices.delete({
        index: hugeFieldsIndexName,
        ignore_unavailable: true,
      });
    }

    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest(
    'renders offscreen sidebar fields after scroll in huge data view',
    async ({ page, pageObjects }) => {
      await expect(pageObjects.discover.getSelectedDataView()).toContainText(
        hugeFieldsDataViewTitle
      );

      await expect(
        page.testSubj.locator('fieldListGroupedAvailableFields-countLoading')
      ).toBeHidden({
        timeout: 30_000,
      });

      const availableFieldCount = Number(
        (await page.testSubj.innerText('fieldListGroupedAvailableFields-count')).replace(/,/g, '')
      );
      expect(availableFieldCount).toBeGreaterThan(HUGE_FIELDS_TARGET_INDEX);

      const virtualizedField = page.testSubj.locator(`field-myvar${HUGE_FIELDS_TARGET_INDEX}`);

      // Initially this field should not be rendered in the virtualized list.
      await expect(virtualizedField).toBeHidden();

      // Scrolling down should render this field.
      await scrollContainerUntilTargetIsVisible({
        scrollContainer: page.testSubj.locator('fieldListGroupedFieldGroups'),
        target: virtualizedField,
      });
      await expect(virtualizedField).toBeVisible();
    }
  );
});
