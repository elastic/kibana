/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { renderHook } from '@testing-library/react';
import { type SearchFilterConfig } from '@elastic/eui';
import {
  ContentListProvider,
  contentListQueryClient,
  type FindItemsResult,
  type FindItemsParams,
} from '@kbn/content-list-provider';
import { Filters } from '../filters/filters';
import { SortFilter } from '../filters/sort';
import { useFilters } from './use_filters';

const mockFindItems = jest.fn(
  async (_params: FindItemsParams): Promise<FindItemsResult> => ({
    items: [],
    total: 0,
  })
);

let providerIdCounter = 0;
const nextProviderId = () => `use-filters-test-${++providerIdCounter}`;

const createWrapper = () => {
  const providerId = nextProviderId();

  return ({ children }: { children: React.ReactNode }) => (
    <ContentListProvider
      id={providerId}
      labels={{ entity: 'item', entityPlural: 'items' }}
      dataSource={{ findItems: mockFindItems }}
    >
      {children}
    </ContentListProvider>
  );
};

const findCustomComponentFilter = (filters: SearchFilterConfig[]) =>
  filters.find(
    (config): config is Extract<SearchFilterConfig, { type: 'custom_component' }> =>
      config.type === 'custom_component'
  );

describe('useFilters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    contentListQueryClient.cancelQueries();
    contentListQueryClient.clear();
  });

  it('resolves filter parts from `<Filters>` children', () => {
    const Wrapper = createWrapper();

    const { result } = renderHook(
      () =>
        useFilters(
          <Filters>
            <SortFilter />
          </Filters>
        ),
      { wrapper: Wrapper }
    );

    expect(findCustomComponentFilter(result.current)).toBeDefined();
  });

  it('falls back to defaults when no children are provided', () => {
    const Wrapper = createWrapper();

    const { result } = renderHook(() => useFilters(undefined), {
      wrapper: Wrapper,
    });

    // Defaults include the sort preset, so we should see at least one
    // `custom_component` filter resolved from the defaults.
    expect(findCustomComponentFilter(result.current)).toBeDefined();
  });
});
