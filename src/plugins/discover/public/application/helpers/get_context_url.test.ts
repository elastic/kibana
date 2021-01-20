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
    const url = await getContextUrl('docId', 'ipId', ['test1', 'test2'], filterManager);
    expect(url).toMatchInlineSnapshot(
      `"#/context/ipId/docId?_g=(filters:!())&_a=(columns:!(test1,test2),filters:!())"`
    );
  });

  test('returning a valid context url when docId contains whitespace', async () => {
    const url = await getContextUrl('doc Id', 'ipId', ['test1', 'test2'], filterManager);
    expect(url).toMatchInlineSnapshot(
      `"#/context/ipId/doc%20Id?_g=(filters:!())&_a=(columns:!(test1,test2),filters:!())"`
    );
  });
});
