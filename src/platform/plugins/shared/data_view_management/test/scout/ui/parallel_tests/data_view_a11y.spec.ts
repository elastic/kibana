/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../fixtures';

const indexName = (spaceId: string) => `dvm-a11y-${spaceId}`;

const APP_WRAPPER = '.kbnAppWrapper';
const FIELD_EDITOR = '[data-test-subj="fieldEditor"]';
const CREATE_FLYOUT = '[data-test-subj="indexPatternEditorFlyout"]';

spaceTest.describe(
  'Data views management - Accessibility',
  { tag: tags.deploymentAgnostic },
  () => {
    let dataViewId: string;

    spaceTest.beforeAll(async ({ apiServices, esClient, scoutSpace }) => {
      await esClient.index({
        index: indexName(scoutSpace.id),
        id: '1',
        document: { extension: 'css', message: 'hello world' },
        refresh: true,
      });
      const { data } = await apiServices.dataViews.create({
        title: indexName(scoutSpace.id),
        spaceId: scoutSpace.id,
      });
      dataViewId = data.id;
    });

    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    spaceTest.afterAll(async ({ apiServices, esClient, scoutSpace }) => {
      await apiServices.dataViews.delete(dataViewId, scoutSpace.id);
      await esClient.indices.delete({ index: indexName(scoutSpace.id), ignore_unavailable: true });
    });

    spaceTest(
      'list page and create data view flyout have no violations',
      async ({ page, pageObjects }) => {
        const { dataViewsManagement, dataViewEditorFlyout } = pageObjects;

        await spaceTest.step('data views list page', async () => {
          await dataViewsManagement.goto();
          await expect(dataViewsManagement.table).toBeVisible();
          const { violations } = await page.checkA11y({ include: [APP_WRAPPER] });
          expect(violations).toStrictEqual([]);
        });

        await spaceTest.step('create data view flyout', async () => {
          await dataViewsManagement.openCreateWizard();
          await expect(dataViewEditorFlyout.flyout).toBeVisible();
          const { violations } = await page.checkA11y({ include: [CREATE_FLYOUT] });
          expect(violations).toStrictEqual([]);
        });
      }
    );

    spaceTest('data view detail page has no violations', async ({ page, pageObjects }) => {
      const { dataViewDetail } = pageObjects;

      await dataViewDetail.goto(dataViewId);
      // The fields table must be rendered, otherwise the scan could pass vacuously.
      await expect(dataViewDetail.fieldRow('extension')).toBeVisible();

      const { violations } = await page.checkA11y({ include: [APP_WRAPPER] });
      expect(violations).toStrictEqual([]);
    });

    spaceTest('field editor flyout has no violations', async ({ page, pageObjects }) => {
      const { dataViewDetail } = pageObjects;

      await dataViewDetail.goto(dataViewId);

      await spaceTest.step('initial view of a new field', async () => {
        await dataViewDetail.openAddFieldFlyout();
        const { violations } = await page.checkA11y({ include: [FIELD_EDITOR] });
        expect(violations).toStrictEqual([]);
      });

      await spaceTest.step('all options shown', async () => {
        await dataViewDetail.setFieldName('test');
        await dataViewDetail.setFieldType('Keyword');
        await dataViewDetail.setFieldScript("emit('hello world')");
        await dataViewDetail.enableFormatAndSelect('string');
        await dataViewDetail.enableCustomLabel();
        await dataViewDetail.fieldEditorAdvancedToggle.click();
        // The preview must be rendered before scanning.
        await expect(dataViewDetail.fieldPreviewItem).not.toHaveCount(0);

        const { violations } = await page.checkA11y({ include: [FIELD_EDITOR] });
        expect(violations).toStrictEqual([]);
      });
    });

    spaceTest(
      'format editor of an existing field has no violations',
      async ({ page, pageObjects }) => {
        const { dataViewDetail } = pageObjects;

        await dataViewDetail.goto(dataViewId);
        await dataViewDetail.openFieldEditorForField('extension');
        await dataViewDetail.enableFormatAndSelect('string');
        await expect(dataViewDetail.formatSelect).toHaveValue('string');

        const { violations } = await page.checkA11y({ include: [FIELD_EDITOR] });
        expect(violations).toStrictEqual([]);
      }
    );
  }
);
