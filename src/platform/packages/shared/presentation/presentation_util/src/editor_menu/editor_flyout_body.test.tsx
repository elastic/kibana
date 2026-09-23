/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { Filter, Query } from '@kbn/es-query';
import { BehaviorSubject } from 'rxjs';
import type { EditorFlyoutSearchBarProps, EditorMenuServices } from './types';
import { initializeEditorMenuManager } from './editor_menu_manager';
import { EditorFlyoutBody } from './editor_flyout_body';

const services: EditorMenuServices = {
  getAction: jest.fn(),
  notifications: { toasts: { addError: jest.fn() } },
};

const SearchBar = ({
  query,
  filters,
  showSubmitButton,
  onQueryChange,
  onQuerySubmit,
  onFiltersUpdated,
}: EditorFlyoutSearchBarProps) => (
  <div data-test-subj="editorFlyoutSearchBar">
    <span>{typeof query?.query === 'string' ? query.query : ''}</span>
    <span data-test-subj="filterCount">{filters?.length ?? 0}</span>
    {showSubmitButton ? <span data-test-subj="querySubmitButton">Update</span> : null}
    <button
      type="button"
      onClick={() => onQueryChange?.({ query: { language: 'kuery', query: 'status:200' } })}
    >
      Type query
    </button>
    <button
      type="button"
      onClick={() => onQuerySubmit?.({ query: { language: 'kuery', query: 'status:200' } })}
    >
      Update query
    </button>
    <button
      type="button"
      onClick={() => onQuerySubmit?.({ query: { language: 'kuery', query: '  ' } })}
    >
      Clear query
    </button>
    <button
      type="button"
      onClick={() => onFiltersUpdated?.([{ meta: { alias: 'agent' } } as Filter])}
    >
      Set filters
    </button>
    <button type="button" onClick={() => onFiltersUpdated?.([])}>
      Clear filters
    </button>
  </div>
);

const renderChrome = (api: unknown, options?: { attachLater?: boolean }) => {
  const manager = initializeEditorMenuManager({
    services,
    api: options?.attachLater ? undefined : api,
    editorType: 'test',
    supportedMenus: ['options', 'help'],
    title: 'Test editor',
  });
  const view = render(
    <EditorFlyoutBody menuManager={manager} SearchBar={SearchBar}>
      <div data-test-subj="editorBody">Editor</div>
    </EditorFlyoutBody>
  );
  if (options?.attachLater) {
    act(() => manager.setPanelApi(api));
  }
  return { ...view, manager };
};

describe('EditorFlyoutBody', () => {
  it('hides the search bar when the panel cannot write unified search', () => {
    renderChrome({ timeRange$: new BehaviorSubject(undefined) });

    expect(screen.getByTestId('editorBody')).toBeVisible();
    expect(screen.queryByTestId('editorFlyoutSearchBar')).not.toBeInTheDocument();
  });

  it('writes the query when it is submitted and writes filters immediately', () => {
    const setQuery = jest.fn();
    const setFilters = jest.fn();
    const query$ = new BehaviorSubject<Query | undefined>(undefined);
    const filters$ = new BehaviorSubject<Filter[] | undefined>(undefined);
    setQuery.mockImplementation((query: Query | undefined) => query$.next(query));
    setFilters.mockImplementation((filters: Filter[] | undefined) => filters$.next(filters));
    renderChrome(
      {
        query$,
        filters$,
        timeRange$: new BehaviorSubject(undefined),
        setQuery,
        setFilters,
        setTimeRange: jest.fn(),
      },
      { attachLater: true }
    );

    expect(screen.getByTestId('editorFlyoutSearchBar')).toBeVisible();
    expect(screen.getByTestId('querySubmitButton')).toBeVisible();
    expect(screen.getByTestId('editorBody')).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Type query' }));
    expect(setQuery).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Update query' }));
    expect(setQuery).toHaveBeenCalledWith({ language: 'kuery', query: 'status:200' });
    expect(screen.getByText('status:200')).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Clear query' }));
    expect(setQuery).toHaveBeenCalledWith(undefined);

    fireEvent.click(screen.getByRole('button', { name: 'Set filters' }));
    expect(setFilters).toHaveBeenCalledWith([{ meta: { alias: 'agent' } }]);
    expect(screen.getByTestId('filterCount')).toHaveTextContent('1');

    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(setFilters).toHaveBeenCalledWith(undefined);
  });

  it('restores the query and filters from when the flyout opened', () => {
    const setQuery = jest.fn();
    const setFilters = jest.fn();
    const query$ = new BehaviorSubject<Query | undefined>({ language: 'kuery', query: 'host:a' });
    const filters$ = new BehaviorSubject<Filter[] | undefined>([{ meta: { alias: 'original' } }]);
    setQuery.mockImplementation((query: Query | undefined) => query$.next(query));
    setFilters.mockImplementation((filters: Filter[] | undefined) => filters$.next(filters));
    const { unmount } = renderChrome({
      query$,
      filters$,
      timeRange$: new BehaviorSubject(undefined),
      setQuery,
      setFilters,
      setTimeRange: jest.fn(),
    });

    fireEvent.click(screen.getByRole('button', { name: 'Update query' }));
    fireEvent.click(screen.getByRole('button', { name: 'Set filters' }));
    setQuery.mockClear();
    setFilters.mockClear();

    unmount();

    expect(setQuery).toHaveBeenCalledWith({ language: 'kuery', query: 'host:a' });
    expect(setFilters).toHaveBeenCalledWith([{ meta: { alias: 'original' } }]);
  });

  it('keeps live edits when the session is committed before close', () => {
    const setQuery = jest.fn();
    const setFilters = jest.fn();
    const query$ = new BehaviorSubject<Query | undefined>(undefined);
    const filters$ = new BehaviorSubject<Filter[] | undefined>(undefined);
    setQuery.mockImplementation((query: Query | undefined) => query$.next(query));
    setFilters.mockImplementation((filters: Filter[] | undefined) => filters$.next(filters));
    const { manager, unmount } = renderChrome({
      query$,
      filters$,
      timeRange$: new BehaviorSubject(undefined),
      setQuery,
      setFilters,
      setTimeRange: jest.fn(),
    });

    fireEvent.click(screen.getByRole('button', { name: 'Update query' }));
    manager.commitSession();
    setQuery.mockClear();
    setFilters.mockClear();

    unmount();

    expect(setQuery).not.toHaveBeenCalled();
    expect(setFilters).not.toHaveBeenCalled();
  });
});
