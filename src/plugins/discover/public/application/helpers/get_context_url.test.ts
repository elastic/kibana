/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
      timeRange: { from: 'now-7d', to: 'now', mode: 'relative' },
      routing: undefined,
    });
    expect(url).toMatchInlineSnapshot(
      `"#/context/ipId/docId?_g=(filters:!(),time:(from:now-7d,mode:relative,to:now))&_a=(columns:!(test1,test2),filters:!())"`
    );
  });

  test('returning a valid context url with routing info', async () => {
    const url = await getContextUrl({
      documentId: 'docId',
      indexPatternId: 'ipId',
      columns: ['test1', 'test2'],
      filterManager,
      timeRange: { from: 'now-7d', to: 'now', mode: 'relative' },
      routing: 'shard1',
    });
    expect(url).toMatchInlineSnapshot(
      `"#/context/ipId/docId?_g=(filters:!(),time:(from:now-7d,mode:relative,to:now))&_a=(columns:!(test1,test2),filters:!(),routing:shard1)"`
    );
  });

  test('returning a valid context url when docId contains whitespace', async () => {
    const url = await getContextUrl({
      documentId: 'doc Id',
      indexPatternId: 'ipId',
      columns: ['test1', 'test2'],
      filterManager,
      timeRange: { from: 'now-7d', to: 'now', mode: 'relative' },
      routing: undefined,
    });
    expect(url).toMatchInlineSnapshot(
      `"#/context/ipId/doc%20Id?_g=(filters:!(),time:(from:now-7d,mode:relative,to:now))&_a=(columns:!(test1,test2),filters:!())"`
    );
  });
});
