/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { renderHook, render, act, waitFor } from '@testing-library/react';
import { Query, type SearchFilterConfig } from '@elastic/eui';

// Local structural type for the props EUI passes to a `custom_component`
// filter. Matches the shape `useFilters` declares internally so the test
// stays decoupled from EUI internals.
interface CustomFilterComponentProps {
  query: Query;
  onChange?: (query: Query) => void;
}
import {
  ContentListProvider,
  contentListQueryClient,
  useContentListState,
  type FindItemsResult,
  type FindItemsParams,
} from '@kbn/content-list-provider';
import { Filters } from '../filters/filters';
import { SortFilter } from '../filters/sort';
import { filter } from '../filters/part';
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

  it('returns the same wrapper component identity across re-renders with new children', () => {
    const Wrapper = createWrapper();
    const sortChildren = (
      <Filters>
        <SortFilter />
      </Filters>
    );

    const { result, rerender } = renderHook(
      ({ children }: { children: React.ReactNode }) => useFilters(children),
      {
        wrapper: Wrapper,
        initialProps: { children: sortChildren },
      }
    );

    const firstSortFilter = findCustomComponentFilter(result.current);
    expect(firstSortFilter).toBeDefined();
    const firstComponent = firstSortFilter!.component;

    // Re-render with a brand new JSX tree (different identity, same intent).
    rerender({
      children: (
        <Filters>
          <SortFilter />
        </Filters>
      ),
    });

    const secondSortFilter = findCustomComponentFilter(result.current);
    expect(secondSortFilter!.component).toBe(firstComponent);
  });

  it('dispatches SET_QUERY with `source: "filter"` when a wrapped onChange fires', async () => {
    const Wrapper = createWrapper();

    // Capture the `onChange` prop EUI would pass through to the underlying
    // component. The wrapper sets it to its `handleChange`, so invoking it
    // exercises the dispatch path that filter components actually take at
    // runtime.
    let capturedOnChange: ((q: Query) => void) | undefined;
    const CaptureFilterComponent: React.FC<CustomFilterComponentProps> = ({ onChange }) => {
      capturedOnChange = onChange;
      return null;
    };
    const FakeFilter = filter.createComponent<Record<string, never>>({
      resolve: () => ({ type: 'custom_component', component: CaptureFilterComponent }),
    });

    const stateContainer = {
      current: undefined as ReturnType<typeof useContentListState> | undefined,
    };

    const Probe = () => {
      const filters = useFilters(
        <Filters>
          <FakeFilter />
        </Filters>
      );
      stateContainer.current = useContentListState();

      const wrapped = findCustomComponentFilter(filters);
      const Wrapped = wrapped?.component;
      return Wrapped ? <Wrapped query={Query.parse('')} onChange={() => undefined} /> : null;
    };

    render(
      <Wrapper>
        <Probe />
      </Wrapper>
    );

    await waitFor(() => {
      expect(stateContainer.current?.state.queryText).toBe('');
      expect(capturedOnChange).toBeDefined();
    });

    act(() => {
      capturedOnChange!(Query.parse('tag:Production'));
    });

    await waitFor(() => {
      expect(stateContainer.current?.state.queryText).toBe('tag:Production');
      expect(stateContainer.current?.state.queryChangeSource).toBe('filter');
    });
  });

  it('falls back to defaults when no children are provided', () => {
    const Wrapper = createWrapper();

    const { result } = renderHook(() => useFilters(undefined), {
      wrapper: Wrapper,
    });

    // Defaults include the sort preset, so we should see at least one
    // custom_component filter wired through the wrapper.
    expect(findCustomComponentFilter(result.current)).toBeDefined();
  });
});
