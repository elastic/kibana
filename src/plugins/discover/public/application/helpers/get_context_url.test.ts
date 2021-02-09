/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getContextUrl } from './get_context_url';
import { FilterManager } from '../../../../data/public/query/filter_manager';
const filterManager = ({
  getGlobalFilters: () => [],
  getAppFilters: () => [],
} as unknown) as FilterManager;

describe('Get context url', () => {
  test('returning a valid context url', async () => {
    const url = await getContextUrl({
      documentId: 'docId',
      indexPatternId: 'ipId',
      columns: ['test1', 'test2'],
      filterManager,
      documentTime: '2021-02-10T20:01:01.000Z',
      routing: undefined,
    });
    expect(url).toMatchInlineSnapshot(
      `"#/context/ipId/docId?_g=(filters:!())&_a=(columns:!(test1,test2),documentTime:'2021-02-10T20:01:01.000Z',filters:!())"`
    );
  });

  test('returning a valid context url with routing info', async () => {
    const url = await getContextUrl({
      documentId: 'docId',
      indexPatternId: 'ipId',
      columns: ['test1', 'test2'],
      filterManager,
      documentTime: '2021-02-10T20:01:01.000Z',
      routing: 'shard1',
    });
    expect(url).toMatchInlineSnapshot(
      `"#/context/ipId/docId?_g=(filters:!())&_a=(columns:!(test1,test2),documentTime:'2021-02-10T20:01:01.000Z',filters:!(),routing:shard1)"`
    );
  });

  test('returning a valid context url when docId contains whitespace', async () => {
    const url = await getContextUrl({
      documentId: 'doc Id',
      indexPatternId: 'ipId',
      columns: ['test1', 'test2'],
      filterManager,
      documentTime: '2021-02-10T20:01:01.000Z',
      routing: undefined,
    });
    expect(url).toMatchInlineSnapshot(
      `"#/context/ipId/doc%20Id?_g=(filters:!())&_a=(columns:!(test1,test2),documentTime:'2021-02-10T20:01:01.000Z',filters:!())"`
    );
  });
});
