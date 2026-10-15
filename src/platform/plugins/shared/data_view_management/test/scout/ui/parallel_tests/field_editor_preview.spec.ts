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

const indexName = (spaceId: string) => `dvm-edit-field-${spaceId}`;

spaceTest.describe('Data view field editor preview', { tag: tags.deploymentAgnostic }, () => {
  let dataViewId: string;

  spaceTest.beforeAll(async ({ apiServices, esClient, scoutSpace }) => {
    await esClient.index({
      index: indexName(scoutSpace.id),
      id: '1',
      document: { extension: 'css' },
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

  spaceTest('shows the preview for a field in _source', async ({ pageObjects }) => {
    const { dataViewDetail } = pageObjects;

    await dataViewDetail.goto(dataViewId);
    await dataViewDetail.openFieldEditorForField('extension');

    await expect(dataViewDetail.fieldEditorTitle).toHaveText("Edit field 'extension'");
    await expect(dataViewDetail.previewField('extension').getByTestId('value')).toHaveText('css');
  });

  // Keyword sub-fields are not stored in _source, so their preview is read from doc values.
  spaceTest('shows the preview for a field not in _source', async ({ pageObjects }) => {
    const { dataViewDetail } = pageObjects;

    await dataViewDetail.goto(dataViewId);
    await dataViewDetail.openFieldEditorForField('extension.keyword');

    await expect(dataViewDetail.fieldEditorTitle).toHaveText("Edit field 'extension.keyword'");
    await expect(dataViewDetail.previewField('extension.keyword').getByTestId('value')).toHaveText(
      'css'
    );
  });
});
