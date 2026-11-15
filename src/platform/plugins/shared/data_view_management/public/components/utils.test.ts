/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataViewListItem, DataViewsContract } from '@kbn/data-views-plugin/public';
import { DataViewType } from '@kbn/data-views-plugin/public';
import { getIndexPatterns, getTags } from './utils';

const indexPatternContractMock = {
  getIdsWithTitle: jest.fn().mockReturnValue(
    Promise.resolve([
      {
        id: 'test',
        title: 'test name',
      },
      {
        id: 'test1',
        title: 'test name 1',
        name: 'Test Name 1',
      },
    ])
  ),
  get: jest.fn().mockReturnValue(Promise.resolve({})),
  getRollupsEnabled: jest.fn().mockReturnValue(true),
} as unknown as jest.Mocked<DataViewsContract>;

test('getting index patterns', async () => {
  const indexPatterns = await getIndexPatterns('test', indexPatternContractMock);
  expect(indexPatterns).toMatchSnapshot();
});

describe('getTags', () => {
  const rollupDataView = {
    id: 'rollup',
    title: 'rollup',
    type: DataViewType.ROLLUP,
  } as DataViewListItem;

  test('adds the rollup tag when rollups are enabled', () => {
    expect(getTags(rollupDataView, false, true).map(({ key }) => key)).toContain(
      DataViewType.ROLLUP
    );
  });

  test('omits the rollup tag when rollups are disabled', () => {
    expect(getTags(rollupDataView, false, false).map(({ key }) => key)).not.toContain(
      DataViewType.ROLLUP
    );
  });
});
