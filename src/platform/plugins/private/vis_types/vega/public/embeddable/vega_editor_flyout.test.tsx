/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { BehaviorSubject } from 'rxjs';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Filter, Query } from '@kbn/es-query';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { VegaEmbeddableApi } from './vega_embeddable';
import { VegaEditorFlyout } from './vega_editor_flyout';

jest.mock('../components/vega_vis_editor', () => ({
  VegaSpecEditor: ({
    editorValue,
    onChange,
    onFormatChange,
  }: {
    editorValue: string;
    onChange: (value: string) => void;
    onFormatChange: (format: 'hjson' | 'json') => void;
  }) => (
    <div>
      <div data-test-subj="vegaSpecEditorValue">{editorValue}</div>
      <button onClick={() => onFormatChange('hjson')}>setFormat</button>
      <button onClick={() => onChange('{ mark: bar }')}>changeSpec</button>
    </div>
  ),
}));

const renderFlyout = ({
  initialQuery,
  initialFilters,
  isNewPanel = false,
}: {
  initialQuery?: Query;
  initialFilters?: Filter[];
  isNewPanel?: boolean;
} = {}) => {
  const query$ = new BehaviorSubject<Query | undefined>(initialQuery);
  const filters$ = new BehaviorSubject<Filter[] | undefined>(initialFilters);
  const dataViews$ = new BehaviorSubject([]);
  const api = {
    query$,
    filters$,
    dataViews$,
    setQuery: jest.fn((query?: Query) => query$.next(query)),
    setFilters: jest.fn((filters?: Filter[]) => filters$.next(filters)),
  } as unknown as VegaEmbeddableApi;

  const SearchBar = ((props: unknown) => {
    const { filters, onQuerySubmit, onFiltersUpdated } = props as {
      filters: Filter[];
      onQuerySubmit: (payload: { dateRange: unknown; query?: Query }) => void;
      onFiltersUpdated: (filters: Filter[]) => void;
    };

    return (
      <div>
        <div>{`filtersLength:${filters.length}`}</div>
        <button
          onClick={() =>
            onQuerySubmit({
              dateRange: undefined,
              query: { language: 'kuery', query: 'bytes > 1000' },
            })
          }
        >
          updateQuery
        </button>
        <button
          onClick={() =>
            onFiltersUpdated([
              { meta: { alias: 'panel filter' }, query: { match: { status: 200 } } },
            ])
          }
        >
          updateFilters
        </button>
      </div>
    );
  }) as UnifiedSearchPublicPluginStart['ui']['SearchBar'];

  const closeFlyout = jest.fn();
  const onPreview = jest.fn();
  const onRevert = jest.fn();
  const onSave = jest.fn();

  const view = render(
    <VegaEditorFlyout
      api={api}
      ariaLabelledBy="vegaEditorTitle"
      closeFlyout={closeFlyout}
      initialSpec={{ format: 'hjson', value: '{ mark: point }' }}
      SearchBar={SearchBar}
      isNewPanel={isNewPanel}
      onPreview={onPreview}
      onRevert={onRevert}
      onSave={onSave}
    />
  );

  return { api, closeFlyout, onPreview, onRevert, onSave, view };
};

describe('VegaEditorFlyout', () => {
  it('renders the title with the flyout label id and all footer actions', async () => {
    renderFlyout();

    await screen.findByText('changeSpec');

    expect(screen.getByRole('heading', { name: 'Vega' })).toHaveAttribute('id', 'vegaEditorTitle');
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Run preview' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Apply and close' })).toBeDisabled();
  });

  it('runs preview for an updated spec', async () => {
    const { onPreview } = renderFlyout();

    fireEvent.click(await screen.findByText('changeSpec'));
    fireEvent.click(screen.getByRole('button', { name: 'Run preview' }));

    expect(onPreview).toHaveBeenCalledWith({ format: 'hjson', value: '{ mark: bar }' });
  });

  it('applies and closes after saving', async () => {
    const { closeFlyout, onSave } = renderFlyout();

    fireEvent.click(await screen.findByText('changeSpec'));
    fireEvent.click(screen.getByRole('button', { name: 'Apply and close' }));

    expect(onSave).toHaveBeenCalledWith({ format: 'hjson', value: '{ mark: bar }' });
    expect(closeFlyout).toHaveBeenCalledTimes(1);
  });

  it('closes without saving when cancel is clicked', async () => {
    const { closeFlyout, onSave } = renderFlyout();

    await screen.findByText('changeSpec');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(closeFlyout).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('reverts when the flyout unmounts without saving', async () => {
    const { onRevert, view } = renderFlyout();

    await screen.findByText('changeSpec');
    view.unmount();

    expect(onRevert).toHaveBeenCalledTimes(1);
  });

  it('applies search changes live and enables saving for them', async () => {
    const { api } = renderFlyout();

    fireEvent.click(await screen.findByText('updateQuery'));
    fireEvent.click(screen.getByText('updateFilters'));

    await waitFor(() => {
      expect(api.setQuery).toHaveBeenCalledWith({ language: 'kuery', query: 'bytes > 1000' });
      expect(api.setFilters).toHaveBeenCalledWith([
        { meta: { alias: 'panel filter' }, query: { match: { status: 200 } } },
      ]);
    });

    expect(screen.getByRole('button', { name: 'Apply and close' })).toBeEnabled();
  });

  it('passes an empty filters array to the search bar when the panel has no filters', async () => {
    renderFlyout();

    expect(await screen.findByText('filtersLength:0')).toBeInTheDocument();
  });
});
