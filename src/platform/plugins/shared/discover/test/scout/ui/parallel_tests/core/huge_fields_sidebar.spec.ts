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

import { errors } from '@elastic/elasticsearch';
import { spaceTest } from '@kbn/scout';
import type { EsClient } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { testData } from '../../fixtures/common';

const HUGE_FIELDS_INDEX = 'testhuge';
const HUGE_FIELDS_DATA_VIEW = `${HUGE_FIELDS_INDEX}*`;
const HUGE_FIELDS_DOC_ID = '1';
const MAX_HUGE_FIELD_INDEX = 11_000;
const HUGE_FIELDS_TIME_DEFAULTS = '{ "from": "2016-10-05T00:00:00", "to": "2016-10-06T00:00:00"}';

const ensureHugeFieldsData = async (esClient: EsClient) => {
  try {
    await esClient.indices.create({
      index: HUGE_FIELDS_INDEX,
      settings: {
        index: {
          mapping: {
            total_fields: {
              limit: 50_000,
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
  } catch (error) {
    if (
      !(error instanceof errors.ResponseError) ||
      error.body?.error?.type !== 'resource_already_exists_exception'
    ) {
      throw error;
    }
  }

  const document: Record<string, number | string> = {
    date: '2016-10-05T14:00:00',
  };

  for (let i = 0; i <= MAX_HUGE_FIELD_INDEX; i++) {
    document[`myvar${i}`] = i;
  }

  try {
    await esClient.create({
      index: HUGE_FIELDS_INDEX,
      id: HUGE_FIELDS_DOC_ID,
      document,
      refresh: 'wait_for',
    });
  } catch (error) {
    if (
      !(error instanceof errors.ResponseError) ||
      error.body?.error?.type !== 'version_conflict_engine_exception'
    ) {
      throw error;
    }
  }
};

spaceTest.describe(
  'Discover huge field list virtualization',
  { tag: testData.DISCOVER_CORE_TAGS },
  () => {
    let hugeFieldsDataViewId: string | undefined;

    spaceTest.beforeAll(async ({ scoutSpace, apiServices, esClient }) => {
      await ensureHugeFieldsData(esClient);

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

      let discoverLoaded = false;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          await pageObjects.discover.goto();
          discoverLoaded = true;
          break;
        } catch (error) {
          if (attempt === 1) {
            throw error;
          }
        }
      }

      if (!discoverLoaded) {
        throw new Error('Unable to load Discover page after retrying navigation');
      }

      await pageObjects.discover.waitUntilSearchingHasFinished();
    });

    spaceTest.afterAll(async ({ scoutSpace, apiServices }) => {
      await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');

      if (hugeFieldsDataViewId) {
        await apiServices.dataViews.delete(hugeFieldsDataViewId, scoutSpace.id);
      }

      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest(
      'test_huge data should have expected number of fields',
      async ({ page, pageObjects }) => {
        await expect(pageObjects.discover.getSelectedDataView()).toContainText(
          HUGE_FIELDS_DATA_VIEW
        );

        await expect(
          page.testSubj.locator('fieldListGroupedAvailableFields-countLoading')
        ).toBeHidden({
          timeout: 30_000,
        });

        const availableFieldCount = Number(
          (await page.testSubj.innerText('fieldListGroupedAvailableFields-count')).replace(/,/g, '')
        );
        expect(availableFieldCount).toBeGreaterThan(5_000);

        const virtualizedField = page.testSubj.locator('field-myvar1050');

        // Initially this field should not be rendered in the virtualized list.
        await expect(virtualizedField).toBeHidden();

        // Scrolling down should render this field.
        const availableFieldsGroup = page.testSubj.locator('fieldListGroupedAvailableFields');
        await availableFieldsGroup.hover();

        for (let i = 0; i < 25; i++) {
          await page.mouse.wheel(0, 1_200);
        }

        await expect(virtualizedField).toBeVisible();
      }
    );
  }
);
