/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getDefaultSort } from './get_default_sort';
import {
  stubIndexPattern,
  stubIndexPatternWithoutTimeField,
} from '../../../../../../../../data/common/stubs';

describe('getDefaultSort function', function () {
  test('should be a function', function () {
    expect(typeof getDefaultSort === 'function').toBeTruthy();
  });

  test('should return default sort for an index pattern with timeFieldName', function () {
    expect(getDefaultSort(stubIndexPattern, 'desc')).toEqual([['@timestamp', 'desc']]);
    expect(getDefaultSort(stubIndexPattern, 'asc')).toEqual([['@timestamp', 'asc']]);
  });

  test('should return default sort for an index pattern without timeFieldName', function () {
    expect(getDefaultSort(stubIndexPatternWithoutTimeField, 'desc')).toEqual([]);
    expect(getDefaultSort(stubIndexPatternWithoutTimeField, 'asc')).toEqual([]);
  });
});
