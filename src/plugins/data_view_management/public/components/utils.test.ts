/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataViewsContract } from 'src/plugins/data_views/public';
import { getIndexPatterns } from './utils';

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
      },
    ])
  ),
  get: jest.fn().mockReturnValue(Promise.resolve({})),
} as unknown as jest.Mocked<DataViewsContract>;

test('getting index patterns', async () => {
  const indexPatterns = await getIndexPatterns('test', indexPatternContractMock);
  expect(indexPatterns).toMatchSnapshot();
});
