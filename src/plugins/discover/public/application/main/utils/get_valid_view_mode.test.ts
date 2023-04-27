/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { VIEW_MODE } from '@kbn/saved-search-plugin/common';
import { getValidViewMode } from './get_valid_view_mode';

describe('getValidViewMode', () => {
  test('should work correctly for regular mode', () => {
    expect(
      getValidViewMode({
        viewMode: undefined,
        isTextBasedQueryMode: false,
      })
    ).toBeUndefined();

    expect(
      getValidViewMode({
        viewMode: VIEW_MODE.DOCUMENT_LEVEL,
        isTextBasedQueryMode: false,
      })
    ).toBe(VIEW_MODE.DOCUMENT_LEVEL);

    expect(
      getValidViewMode({
        viewMode: VIEW_MODE.AGGREGATED_LEVEL,
        isTextBasedQueryMode: false,
      })
    ).toBe(VIEW_MODE.AGGREGATED_LEVEL);
  });

  test('should work correctly for text-based mode', () => {
    expect(
      getValidViewMode({
        viewMode: undefined,
        isTextBasedQueryMode: true,
      })
    ).toBeUndefined();

    expect(
      getValidViewMode({
        viewMode: VIEW_MODE.DOCUMENT_LEVEL,
        isTextBasedQueryMode: true,
      })
    ).toBe(VIEW_MODE.DOCUMENT_LEVEL);

    expect(
      getValidViewMode({
        viewMode: VIEW_MODE.AGGREGATED_LEVEL,
        isTextBasedQueryMode: true,
      })
    ).toBe(VIEW_MODE.DOCUMENT_LEVEL);
  });
});
