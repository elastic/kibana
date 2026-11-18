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

const aliasName = (alias: 1 | 2, spaceId: string) => `dvm-alias${alias}-${spaceId}`;
const sourceIndex = (n: number, spaceId: string) => `dvm-alias-source${n}-${spaceId}`;

// alias1 groups two indices with one document each and no time field; alias2 groups two
// indices with one dated document each.
const ALIAS1_INDICES = [1, 2];
const ALIAS2_INDICES = [3, 4];

spaceTest.describe('Data views on index aliases', { tag: tags.deploymentAgnostic }, () => {
  spaceTest.beforeAll(async ({ esClient, scoutSpace }) => {
    const { id: spaceId } = scoutSpace;

    const setUpIndicesAndDocs = async () => {
      // Creating the indices together with their alias saves a separate updateAliases call.
      await Promise.all([
        ...ALIAS1_INDICES.map((n) =>
          esClient.indices.create({
            index: sourceIndex(n, spaceId),
            aliases: { [aliasName(1, spaceId)]: {} },
          })
        ),
        ...ALIAS2_INDICES.map((n) =>
          esClient.indices.create({
            index: sourceIndex(n, spaceId),
            aliases: { [aliasName(2, spaceId)]: {} },
          })
        ),
      ]);
      await esClient.bulk({
        refresh: true,
        operations: [
          ...ALIAS1_INDICES.flatMap((n) => [
            { index: { _index: sourceIndex(n, spaceId) } },
            { message: 'woza' },
          ]),
          ...ALIAS2_INDICES.flatMap((n, i) => [
            { index: { _index: sourceIndex(n, spaceId) } },
            { date: `2016-11-${String(13 + i)}` },
          ]),
        ],
      });
    };

    await Promise.all([
      setUpIndicesAndDocs(),
      scoutSpace.uiSettings.setDefaultTime({
        from: 'Nov 12, 2016 @ 05:00:00.000',
        to: 'Nov 19, 2016 @ 05:00:00.000',
      }),
    ]);
  });

  // Can read the aliases but not their backing indices.
  spaceTest.beforeEach(async ({ browserAuth, scoutSpace }) => {
    await browserAuth.loginWithCustomRole({
      elasticsearch: {
        cluster: [],
        indices: [
          {
            names: [aliasName(1, scoutSpace.id), aliasName(2, scoutSpace.id)],
            privileges: ['read', 'view_index_metadata'],
          },
        ],
      },
      kibana: [{ base: ['all'], feature: {}, spaces: [scoutSpace.id] }],
    });
  });

  spaceTest.afterAll(async ({ esClient, scoutSpace }) => {
    // Deleting the indices also removes the aliases.
    await esClient.indices.delete({
      index: [...ALIAS1_INDICES, ...ALIAS2_INDICES].map((n) => sourceIndex(n, scoutSpace.id)),
      ignore_unavailable: true,
    });
    await scoutSpace.uiSettings.unset('timepicker:timeDefaults');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest(
    'creates a data view without a time field on an alias and discovers its documents',
    async ({ pageObjects, scoutSpace }) => {
      const title = `${aliasName(1, scoutSpace.id)}*`;

      await spaceTest.step('create the data view', async () => {
        await pageObjects.dataViewsManagement.goto();
        await pageObjects.dataViewsManagement.openCreateWizard();
        // No source has a date field, so the timestamp selector stays disabled.
        await pageObjects.dataViewEditorFlyout.setTitle(title);
        await pageObjects.dataViewEditorFlyout.save();
      });

      await spaceTest.step('verify the hit count in Discover', async () => {
        await pageObjects.discover.goto({ queryMode: 'classic' });
        await pageObjects.discover.selectDataView(title, { createAdHocIfMissing: false });
        await pageObjects.discover.waitUntilSearchingHasFinished();

        await expect(pageObjects.discover.getHitCountLocator()).toHaveText('2');
      });
    }
  );

  spaceTest(
    'creates a data view with a time field on an alias and discovers its documents',
    async ({ pageObjects, scoutSpace }) => {
      const title = `${aliasName(2, scoutSpace.id)}*`;

      await spaceTest.step('create the data view', async () => {
        await pageObjects.dataViewsManagement.goto();
        await pageObjects.dataViewsManagement.openCreateWizard();
        await pageObjects.dataViewEditorFlyout.setTitle(title);
        await pageObjects.dataViewEditorFlyout.selectTimestampField('date');
        await pageObjects.dataViewEditorFlyout.save();
      });

      await spaceTest.step('verify the hit count in Discover', async () => {
        await pageObjects.discover.goto({ queryMode: 'classic' });
        await pageObjects.discover.selectDataView(title, { createAdHocIfMissing: false });
        await pageObjects.discover.waitUntilSearchingHasFinished();

        await expect(pageObjects.discover.getHitCountLocator()).toHaveText('2');
      });
    }
  );
});
