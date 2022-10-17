/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataView } from '@kbn/data-views-plugin/common';
import { getValidFilters } from './get_valid_filters';

describe('getValidFilters', () => {
  const filter = (index: string, disabled: boolean, script: boolean) => ({
    meta: {
      index,
      disabled,
    },
    ...(script ? { query: { script: {} } } : {}),
  });
  const dataView = {
    id: '123',
  } as DataView;

  it("should only disable scripted fields that don't match the current data view", () => {
    const filters = getValidFilters(dataView, [
      filter('123', false, false),
      filter('123', true, false),
      filter('123', false, true),
      filter('123', true, true),
      filter('321', false, false),
      filter('321', true, false),
      filter('321', false, true),
      filter('321', true, true),
    ]);
    expect(filters.length).toBe(8);
    expect(filters[0].meta.disabled).toBe(false);
    expect(filters[1].meta.disabled).toBe(true);
    expect(filters[2].meta.disabled).toBe(false);
    expect(filters[3].meta.disabled).toBe(true);
    expect(filters[4].meta.disabled).toBe(false);
    expect(filters[5].meta.disabled).toBe(true);
    expect(filters[6].meta.disabled).toBe(true);
    expect(filters[7].meta.disabled).toBe(true);
  });
});
