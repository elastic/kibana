/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { reverseSortDir, SortDirection } from './sorting';

describe('function reverseSortDir', function () {
  test('reverse a given sort direction', function () {
    expect(reverseSortDir(SortDirection.asc)).toBe(SortDirection.desc);
    expect(reverseSortDir(SortDirection.desc)).toBe(SortDirection.asc);
  });
});
