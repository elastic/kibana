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
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import type { DataView } from '@kbn/data-views-plugin/public';
import {
  BooleanRelation,
  FILTERS,
  type CombinedFilter,
  type Filter,
  type Query,
} from '@kbn/es-query';
import type { StatefulSearchBarProps } from '@kbn/unified-search-plugin/public';
import type { VegaPluginStartDependencies } from '../plugin';
import { setData } from '../services';
import type { VegaEmbeddableApi } from './vega_embeddable';
import { VegaEditorFlyout } from './vega_editor_flyout';

jest.mock('../components/vega_vis_editor', () => ({
  VegaSpecEditor: ({
    editorValue,
    onChange,
    onFormatChange,
    actionsPlacement,
  }: {
    editorValue: string;
    onChange: (value: string) => void;
    onFormatChange: (format: 'hjson' | 'json') => void;
    actionsPlacement?: 'overlay' | 'toolbar';
  }) => (
    <div>
      <div data-test-subj="vegaSpecEditorValue">{editorValue}</div>
      <div data-test-subj="vegaSpecEditorActionsPlacement">{actionsPlacement}</div>
      <button onClick={() => onFormatChange('hjson')}>setFormat</button>
      <button onClick={() => onChange('{ mark: bar }')}>changeSpec</button>
    </div>
  ),
}));

const createDataView = (id: string, persisted = true): DataView =>
  ({ id, isPersisted: () => persisted } as DataView);

const renderFlyout = ({
  initialQuery,
  initialFilters,
  initialDataViews = [],
  defaultDataView,
  isNewPanel = false,
}: {
  initialQuery?: Query;
  initialFilters?: Filter[];
  initialDataViews?: DataView[];
  defaultDataView?: DataView;
  isNewPanel?: boolean;
} = {}) => {
  const query$ = new BehaviorSubject<Query | undefined>(initialQuery);
  const filters$ = new BehaviorSubject<Filter[] | undefined>(initialFilters);
  const dataViews$ = new BehaviorSubject<DataView[] | undefined>(initialDataViews);
  const api = {
    query$,
    filters$,
    dataViews$,
    setQuery: jest.fn((query?: Query) => query$.next(query)),
    setFilters: jest.fn((filters?: Filter[]) => filters$.next(filters)),
  } as unknown as VegaEmbeddableApi;

  const SearchBar = jest.fn((_props: StatefulSearchBarProps): null => null);
  const getSearchBarProps = (): StatefulSearchBarProps => {
    const props = SearchBar.mock.lastCall?.[0];
    if (!props) throw new Error('SearchBar has not rendered');
    return props;
  };

  const closeFlyout = jest.fn();
  const onPreview = jest.fn();
  const onRevert = jest.fn();
  const onSave = jest.fn();

  const view = render(
    <VegaEditorFlyout
      api={api}
      ariaLabelledBy="vegaEditorTitle"
      closeFlyout={closeFlyout}
      defaultDataView={defaultDataView}
      initialSpec={{ format: 'hjson', value: '{ mark: point }' }}
      SearchBar={SearchBar as VegaPluginStartDependencies['unifiedSearch']['ui']['SearchBar']}
      isNewPanel={isNewPanel}
      onPreview={onPreview}
      onRevert={onRevert}
      onSave={onSave}
    />
  );

  return { api, closeFlyout, getSearchBarProps, onPreview, onRevert, onSave, view };
};

describe('VegaEditorFlyout', () => {
  beforeEach(() => {
    const data = dataPluginMock.createStartContract();
    jest
      .mocked(data.query.queryString.getDefaultQuery)
      .mockReturnValue({ language: 'lucene', query: '' });
    setData(data);
  });

  it('renders the title with the flyout label id and all footer actions', async () => {
    renderFlyout();

    await screen.findByText('changeSpec');

    expect(screen.getByRole('heading', { name: 'Vega' })).toHaveAttribute('id', 'vegaEditorTitle');
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Run preview' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Apply and close' })).toBeDisabled();
  });

  it('renders the spec editor actions in a toolbar so they do not cover the code', async () => {
    renderFlyout();

    expect(await screen.findByTestId('vegaSpecEditorActionsPlacement')).toHaveTextContent(
      'toolbar'
    );
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
    const { api, getSearchBarProps } = renderFlyout();
    const panelFilter = { meta: { alias: 'panel filter' }, query: { match: { status: 200 } } };

    act(() => {
      getSearchBarProps().onQuerySubmit?.({
        dateRange: { from: 'now-15m', to: 'now' },
        query: { language: 'kuery', query: 'bytes > 1000' },
      });
      getSearchBarProps().onFiltersUpdated?.([panelFilter]);
    });

    expect(api.setQuery).toHaveBeenCalledWith({ language: 'kuery', query: 'bytes > 1000' });
    expect(api.setFilters).toHaveBeenCalledWith([panelFilter]);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Apply and close' })).toBeEnabled()
    );
  });

  it('does not enable saving when filters only differ in display metadata', async () => {
    const { api, getSearchBarProps } = renderFlyout({
      initialFilters: [
        { meta: { alias: 'panel filter', key: 'status' }, query: { match: { status: 200 } } },
      ],
    });

    act(() => {
      getSearchBarProps().onFiltersUpdated?.([
        { meta: { alias: 'panel filter' }, query: { match: { status: 200 } } },
      ]);
    });

    expect(api.setFilters).toHaveBeenCalled();
    await waitFor(() => expect(getSearchBarProps().filters?.[0].meta).not.toHaveProperty('key'));
    expect(screen.getByRole('button', { name: 'Apply and close' })).toBeDisabled();
  });

  // SearchBar hides the query input when it gets no query, and with useDefaultBehaviors={false}
  // it doesn't substitute a default.
  it('passes the default query to the search bar when the panel has no query', () => {
    const { getSearchBarProps } = renderFlyout();

    expect(getSearchBarProps().query).toEqual({ language: 'lucene', query: '' });
  });

  it('passes the panel query to the search bar', () => {
    const { getSearchBarProps } = renderFlyout({
      initialQuery: { language: 'kuery', query: 'bytes > 1000' },
    });

    expect(getSearchBarProps().query).toEqual({ language: 'kuery', query: 'bytes > 1000' });
  });

  it('passes an empty filters array to the search bar when the panel has no filters', () => {
    const { getSearchBarProps } = renderFlyout();

    expect(getSearchBarProps().filters).toEqual([]);
  });

  it('hides the pin filter options because panel filters cannot be pinned', () => {
    const { getSearchBarProps } = renderFlyout();

    expect(getSearchBarProps().hiddenFilterPanelOptions).toEqual(['pinFilter']);
  });

  it('gives the search bar the default data view when the spec names none', () => {
    const defaultDataView = createDataView('default-view');
    const { getSearchBarProps } = renderFlyout({ defaultDataView });

    expect(getSearchBarProps().indexPatterns).toEqual([defaultDataView]);
  });

  it('gives the search bar the data views named by the spec', () => {
    const specDataView = createDataView('spec-view');
    const { getSearchBarProps } = renderFlyout({
      initialDataViews: [specDataView],
      defaultDataView: createDataView('default-view'),
    });

    expect(getSearchBarProps().indexPatterns).toEqual([specDataView]);
  });

  describe('with a single ad-hoc data view', () => {
    const initialDataViews = [createDataView('ad-hoc-view', false), createDataView('saved-view')];

    it('stores filters on the ad-hoc data view without its id', () => {
      const { api, getSearchBarProps } = renderFlyout({ initialDataViews });

      act(() => {
        getSearchBarProps().onFiltersUpdated?.([
          { meta: { index: 'ad-hoc-view' }, query: { match: { status: 200 } } },
          { meta: { index: 'saved-view' }, query: { match: { status: 404 } } },
        ]);
      });

      expect(api.setFilters).toHaveBeenCalledWith([
        { meta: {}, query: { match: { status: 200 } } },
        { meta: { index: 'saved-view' }, query: { match: { status: 404 } } },
      ]);
    });

    it('binds filters without a data view to the ad-hoc data view for the search bar', () => {
      const combinedFilter: CombinedFilter = {
        meta: {
          type: FILTERS.COMBINED,
          relation: BooleanRelation.AND,
          params: [{ meta: {}, query: { match: { status: 500 } } }],
        },
        query: {},
      };
      const { getSearchBarProps } = renderFlyout({
        initialDataViews,
        initialFilters: [
          { meta: {}, query: { match: { status: 200 } } },
          { meta: { index: 'saved-view' }, query: { match: { status: 404 } } },
          combinedFilter,
        ],
      });

      const [unbound, saved, combined] = getSearchBarProps().filters ?? [];
      expect(unbound.meta.index).toBe('ad-hoc-view');
      expect(saved.meta.index).toBe('saved-view');
      expect(combined.meta.index).toBe('ad-hoc-view');
      expect(combined.meta.params).toEqual([
        { meta: { index: 'ad-hoc-view' }, query: { match: { status: 500 } } },
      ]);
    });
  });

  describe('with more than one ad-hoc data view', () => {
    const initialDataViews = [createDataView('ad-hoc-a', false), createDataView('ad-hoc-b', false)];

    it('stores filters with their data view id', () => {
      const { api, getSearchBarProps } = renderFlyout({ initialDataViews });
      const filters = [{ meta: { index: 'ad-hoc-a' }, query: { match: { status: 200 } } }];

      act(() => {
        getSearchBarProps().onFiltersUpdated?.(filters);
      });

      expect(api.setFilters).toHaveBeenCalledWith(filters);
    });

    it('does not bind filters without a data view', () => {
      const { getSearchBarProps } = renderFlyout({
        initialDataViews,
        initialFilters: [{ meta: {}, query: { match: { status: 200 } } }],
      });

      expect(getSearchBarProps().filters?.[0].meta).not.toHaveProperty('index');
    });
  });
});
