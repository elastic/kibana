/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FilterManager } from '@kbn/data-plugin/public';
import { DataView } from '@kbn/data-views-plugin/common';
import { getApplicableFilters } from './get_applicable_filters';

describe('getApplicableFilters', () => {
  it("should filter out scripted fields that don't match the current data view", () => {
    const dataView = {
      id: '123',
    } as DataView;
    const filterManager = {
      getFilters: jest.fn(() => [
        {
          meta: {
            alias: 'foo',
            index: '123',
          },
          query: {
            script: {},
          },
        },
        {
          meta: {
            alias: 'bar',
            index: '321',
          },
          query: {
            script: {},
          },
        },
        {
          meta: {
            alias: 'test',
            index: '321',
          },
        },
      ]),
    } as unknown as FilterManager;
    const filters = getApplicableFilters(dataView, filterManager);
    expect(filters.length).toBe(2);
    expect(filters[0].meta.alias).toBe('foo');
  });
});
