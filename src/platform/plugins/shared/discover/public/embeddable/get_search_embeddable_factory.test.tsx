/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { BehaviorSubject, Observable } from 'rxjs';

import { createSearchSourceMock } from '@kbn/data-plugin/public/mocks';
import type { DataView } from '@kbn/data-views-plugin/common';
import { SHOW_FIELD_STATISTICS } from '@kbn/discover-utils';
import { buildDataViewMock, deepMockedFields } from '@kbn/discover-utils/src/__mocks__';
import type { PresentationContainer } from '@kbn/presentation-publishing';
import type { PhaseEvent, PublishesUnifiedSearch } from '@kbn/presentation-publishing';
import { VIEW_MODE } from '@kbn/saved-search-plugin/common';
import { act, render, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import type { AggregateQuery, Filter, Query, TimeRange } from '@kbn/es-query';
import { createDataViewDataSource } from '../../common/data_sources';
import { discoverServiceMock } from '../__mocks__/services';
import { getSearchEmbeddableFactory } from './get_search_embeddable_factory';
import type { SearchEmbeddableApi, SearchEmbeddableRuntimeState } from './types';
import { SolutionType } from '../context_awareness';
import { mockInitializeDrilldownsManager } from '@kbn/embeddable-plugin/public/mocks';
import { renderWithI18n } from '@kbn/test-jest-helpers';

jest.mock('./utils/serialization_utils', () => ({}));

describe('saved search embeddable', () => {
  const dataViewMock = buildDataViewMock({ name: 'the-data-view', fields: deepMockedFields });

  const getInitialRuntimeState = ({
    searchMock,
    dataView = dataViewMock,
    partialState = {},
  }: {
    searchMock?: jest.Mock;
    dataView?: DataView;
    partialState?: Partial<SearchEmbeddableRuntimeState>;
  } = {}): SearchEmbeddableRuntimeState => {
    const searchSource = createSearchSourceMock({ index: dataView }, undefined, searchMock);
    discoverServiceMock.data.search.searchSource.create = jest
      .fn()
      .mockResolvedValueOnce(searchSource);

    return {
      time_range: { from: 'now-15m', to: 'now' },
      columns: ['message', 'extension'],
      rowHeight: 30,
      headerRowHeight: 5,
      rowsPerPage: 50,
      sampleSize: 250,
      serializedSearchSource: searchSource.getSerializedFields(),
      ...partialState,
    };
  };

  let runtimeState = getInitialRuntimeState();

  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('./utils/serialization_utils').deserializeState = () => runtimeState;
    mockedEditableDashboardApi.setFocusedPanelId.mockClear();
  });

  const mockServices = {
    discoverServices: discoverServiceMock,
    startServices: {
      executeTriggerActions: jest.fn(),
      isEditable: jest.fn().mockReturnValue(true),
    },
  };

  const uuid = 'mock-embeddable-id';
  const factory = getSearchEmbeddableFactory(mockServices);
  const dashboadFilters = new BehaviorSubject<Filter[] | undefined>(undefined);
  const mockedDashboardApi = {
    filters$: dashboadFilters,
    timeRange$: new BehaviorSubject<TimeRange | undefined>(undefined),
    query$: new BehaviorSubject<Query | AggregateQuery | undefined>(undefined),
  } as unknown as PresentationContainer & PublishesUnifiedSearch;

  const getSearchResponse = (nrOfHits: number) => {
    const hits = new Array(nrOfHits).fill(null).map((_, idx) => ({ id: idx }));
    return {
      rawResponse: {
        hits: { hits, total: nrOfHits },
      },
      isPartial: false,
      isRunning: false,
    };
  };

  const createSearchFnMock = (nrOfHits: number) => {
    let resolveSearch = () => {};
    const search = jest.fn(() => {
      return new Observable((subscriber) => {
        resolveSearch = () => {
          subscriber.next(getSearchResponse(nrOfHits));
          subscriber.complete();
        };
      });
    });
    return { search, resolveSearch: () => resolveSearch() };
  };

  const finalizeApiMock = (
    api: Omit<SearchEmbeddableApi, 'uuid' | 'type' | 'parentApi' | 'phase$'>
  ) => ({
    ...api,
    uuid,
    type: factory.type,
    parentApi: mockedDashboardApi,
    phase$: new BehaviorSubject<PhaseEvent | undefined>(undefined),
  });

  const mockedEditableDashboardApi = {
    ...mockedDashboardApi,
    getAppContext: jest.fn().mockReturnValue({
      currentAppId: 'dashboard',
      getCurrentPath: jest.fn().mockReturnValue('/dashboard'),
    }),
    setFocusedPanelId: jest.fn(),
    viewMode$: new BehaviorSubject<'view' | 'edit'>('edit'),
  };

  const finalizeEditableApiMock = (
    api: Omit<SearchEmbeddableApi, 'uuid' | 'type' | 'parentApi' | 'phase$'>
  ) => ({
    ...api,
    uuid,
    type: factory.type,
    parentApi: mockedEditableDashboardApi,
    phase$: new BehaviorSubject<PhaseEvent | undefined>(undefined),
  });

  const waitOneTick = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)));

  describe('search embeddable component', () => {
    it('should render empty grid when empty data is returned', async () => {
      const { search, resolveSearch } = createSearchFnMock(0);
      runtimeState = getInitialRuntimeState({ searchMock: search });
      const { Component, api } = await factory.buildEmbeddable({
        initializeDrilldownsManager: mockInitializeDrilldownsManager,
        initialState: { savedObjectId: 'id' }, // runtimeState passed via mocked deserializeState
        finalizeApi: finalizeApiMock,
        uuid,
        parentApi: mockedDashboardApi,
      });
      await waitOneTick(); // wait for build to complete
      const discoverComponent = render(<Component />);

      // wait for data fetching
      expect(api.dataLoading$.getValue()).toBe(true);
      resolveSearch();
      await waitOneTick();
      expect(api.dataLoading$.getValue()).toBe(false);

      await waitFor(() => {
        expect(discoverComponent.queryByTestId('embeddedSavedSearchDocTable')).toBeInTheDocument();
        expect(discoverComponent.getByTestId('embeddedSavedSearchDocTable').textContent).toEqual(
          'No results found'
        );
      });
    });

    it('should render field stats table in AGGREGATED_LEVEL view mode and not fetch documents', async () => {
      const { search } = createSearchFnMock(0);
      runtimeState = getInitialRuntimeState({
        searchMock: search,
        partialState: { viewMode: VIEW_MODE.AGGREGATED_LEVEL },
      });

      discoverServiceMock.uiSettings.get = jest.fn().mockImplementation((key: string) => {
        if (key === SHOW_FIELD_STATISTICS) return true;
      });

      const { Component, api } = await factory.buildEmbeddable({
        initializeDrilldownsManager: mockInitializeDrilldownsManager,
        initialState: { savedObjectId: 'id' }, // runtimeState passed via mocked deserializeState
        finalizeApi: finalizeApiMock,
        uuid,
        parentApi: mockedDashboardApi,
      });
      await waitOneTick(); // wait for build to complete

      const discoverComponent = render(<Component />);

      // Field statistics mode should not trigger document fetching
      expect(search).not.toHaveBeenCalled();
      expect(api.dataLoading$.getValue()).toBe(false);

      expect(discoverComponent.queryByTestId('dscFieldStatsEmbeddedContent')).toBeInTheDocument();
    });
  });

  describe('missing data view', () => {
    const getNoDataViewRuntimeState = (searchMock?: jest.Mock): SearchEmbeddableRuntimeState => {
      const searchSource = createSearchSourceMock({}, undefined, searchMock);
      const parentSearchSource = createSearchSourceMock({});
      discoverServiceMock.data.search.searchSource.create = jest
        .fn()
        .mockResolvedValueOnce(searchSource)
        .mockResolvedValueOnce(parentSearchSource);

      return {
        time_range: { from: 'now-15m', to: 'now' },
        columns: ['message', 'extension'],
        rowHeight: 30,
        headerRowHeight: 5,
        rowsPerPage: 50,
        sampleSize: 250,
        serializedSearchSource: searchSource.getSerializedFields(),
      };
    };

    it('should render missing data view prompt when data view is not found', async () => {
      runtimeState = getNoDataViewRuntimeState();
      const { Component } = await factory.buildEmbeddable({
        initializeDrilldownsManager: mockInitializeDrilldownsManager,
        initialState: { savedObjectId: 'id' },
        finalizeApi: finalizeApiMock,
        uuid,
        parentApi: mockedDashboardApi,
      });
      await waitOneTick();
      const { queryByTestId } = renderWithI18n(<Component />);

      await waitFor(() => {
        expect(queryByTestId('discoverEmbeddableMissingDataViewCallout')).toBeVisible();
        expect(queryByTestId('discoverDocTable')).not.toBeInTheDocument();
      });
    });

    it('should not fetch data when data view is missing', async () => {
      const { search } = createSearchFnMock(0);
      runtimeState = getNoDataViewRuntimeState(search);

      const { api } = await factory.buildEmbeddable({
        initializeDrilldownsManager: mockInitializeDrilldownsManager,
        initialState: { savedObjectId: 'id' },
        finalizeApi: finalizeApiMock,
        uuid,
        parentApi: mockedDashboardApi,
      });
      await waitOneTick();

      expect(search).not.toHaveBeenCalled();
      expect(api.dataLoading$.getValue()).toBe(false);
    });
  });

  describe('search embeddable api', () => {
    it('should not fetch data if only a new input title is set', async () => {
      const { search, resolveSearch } = createSearchFnMock(1);
      runtimeState = getInitialRuntimeState({
        searchMock: search,
        partialState: { viewMode: VIEW_MODE.DOCUMENT_LEVEL },
      });
      const { api } = await factory.buildEmbeddable({
        initializeDrilldownsManager: mockInitializeDrilldownsManager,
        initialState: { savedObjectId: 'id' }, // runtimeState passed via mocked deserializeState
        finalizeApi: finalizeApiMock,
        uuid,
        parentApi: mockedDashboardApi,
      });
      await waitOneTick(); // wait for build to complete

      // wait for data fetching
      expect(api.dataLoading$.getValue()).toBe(true);
      resolveSearch();
      await waitOneTick();
      expect(api.dataLoading$.getValue()).toBe(false);

      expect(search).toHaveBeenCalledTimes(1);
      api.setTitle('custom title');
      await waitOneTick();
      expect(search).toHaveBeenCalledTimes(1);
    });

    it('should enter inline edit mode and keep legacy discover edit behavior', async () => {
      const user = userEvent.setup();

      const { search, resolveSearch } = createSearchFnMock(1);

      runtimeState = getInitialRuntimeState({
        searchMock: search,
        partialState: { viewMode: VIEW_MODE.DOCUMENT_LEVEL, savedObjectId: 'id' },
      });
      const navigateToEditor = jest.fn();

      discoverServiceMock.embeddable.getStateTransfer = jest.fn().mockImplementation(() => ({
        navigateToEditor,
      }));
      (discoverServiceMock.locator.getLocation as jest.Mock).mockResolvedValue({
        app: 'discover',
        path: '/mock-url',
        state: {},
      });

      const { api, Component } = await factory.buildEmbeddable({
        initializeDrilldownsManager: mockInitializeDrilldownsManager,
        initialState: { savedObjectId: 'id' },
        finalizeApi: finalizeEditableApiMock,
        uuid,
        parentApi: mockedEditableDashboardApi,
      });
      await waitOneTick();

      const discoverComponent = render(<Component />);
      resolveSearch();
      await waitOneTick();

      expect(api.overrideHoverActions$?.getValue()).toBe(false);
      expect(api.onEdit).toBeDefined();

      await act(async () => {
        await api.onEdit?.();
      });

      expect(api.overrideHoverActions$?.getValue()).toBe(true);
      expect(mockedEditableDashboardApi.setFocusedPanelId).toHaveBeenCalledWith(uuid);
      await waitFor(() => {
        expect(
          discoverComponent.getByTestId('discoverEmbeddableInlineEditApplyButton')
        ).toBeInTheDocument();
      });

      await user.click(discoverComponent.getByTestId('discoverEmbeddableInlineEditDiscardButton'));

      expect(api.overrideHoverActions$?.getValue()).toBe(false);
      await waitFor(() => {
        expect(
          discoverComponent.queryByTestId('discoverEmbeddableInlineEditApplyButton')
        ).not.toBeInTheDocument();
      });
    });
  });

  describe('context awareness', () => {
    beforeAll(() => {
      jest
        .spyOn(discoverServiceMock.core.chrome, 'getActiveSolutionNavId$')
        .mockReturnValue(new BehaviorSubject(SolutionType.Search));
    });

    afterAll(() => {
      jest.resetAllMocks();
    });

    it('should resolve root profile on init', async () => {
      const resolveRootProfileSpy = jest.spyOn(
        discoverServiceMock.profilesManager,
        'resolveRootProfile'
      );
      runtimeState = getInitialRuntimeState();
      await factory.buildEmbeddable({
        initializeDrilldownsManager: mockInitializeDrilldownsManager,
        initialState: { savedObjectId: 'id' }, // runtimeState passed via mocked deserializeState
        finalizeApi: finalizeApiMock,
        uuid,
        parentApi: mockedDashboardApi,
      });
      await waitOneTick(); // wait for build to complete

      expect(resolveRootProfileSpy).toHaveBeenCalledWith({ solutionNavId: SolutionType.Search });
      resolveRootProfileSpy.mockClear();
      expect(resolveRootProfileSpy).not.toHaveBeenCalled();
    });

    it('should allow overriding the solutionNavId used to resolve the root profile', async () => {
      const resolveRootProfileSpy = jest.spyOn(
        discoverServiceMock.profilesManager,
        'resolveRootProfile'
      );
      runtimeState = {
        ...getInitialRuntimeState(),
        nonPersistedDisplayOptions: {
          solutionNavIdOverride: 'search' as const,
        },
      };
      await factory.buildEmbeddable({
        initializeDrilldownsManager: mockInitializeDrilldownsManager,
        initialState: { savedObjectId: 'id' }, // runtimeState passed via mocked deserializeState
        finalizeApi: finalizeApiMock,
        uuid,
        parentApi: mockedDashboardApi,
      });
      await waitOneTick(); // wait for build to complete
      expect(resolveRootProfileSpy).toHaveBeenCalledWith({
        solutionNavId: 'search',
      });
    });

    it('should resolve data source profile when fetching', async () => {
      const scopedProfilesManager = discoverServiceMock.profilesManager.createScopedProfilesManager(
        {
          scopedEbtManager: discoverServiceMock.ebtManager.createScopedEBTManager(),
        }
      );
      const resolveDataSourceProfileSpy = jest.spyOn(
        scopedProfilesManager,
        'resolveDataSourceProfile'
      );
      jest
        .spyOn(discoverServiceMock.profilesManager, 'createScopedProfilesManager')
        .mockReturnValueOnce(scopedProfilesManager);
      runtimeState = getInitialRuntimeState();
      const { api } = await factory.buildEmbeddable({
        initializeDrilldownsManager: mockInitializeDrilldownsManager,
        initialState: { savedObjectId: 'id' }, // runtimeState passed via mocked deserializeState
        finalizeApi: finalizeApiMock,
        uuid,
        parentApi: mockedDashboardApi,
      });
      await waitOneTick(); // wait for build to complete

      expect(resolveDataSourceProfileSpy).toHaveBeenCalledWith({
        dataSource: createDataViewDataSource({ dataViewId: dataViewMock.id! }),
        dataView: dataViewMock,
        query: api.savedSearch$.getValue().searchSource.getField('query'),
      });
      resolveDataSourceProfileSpy.mockReset();
      expect(resolveDataSourceProfileSpy).not.toHaveBeenCalled();

      // trigger a refetch
      dashboadFilters.next([{ meta: {} }]);
      await waitOneTick();
      expect(resolveDataSourceProfileSpy).toHaveBeenCalled();
    });

    it('should pass cell renderers from profile', async () => {
      const { search, resolveSearch } = createSearchFnMock(1);
      runtimeState = getInitialRuntimeState({
        searchMock: search,
        partialState: { columns: ['rootProfile', 'message', 'extension'] },
      });
      const { Component, api } = await factory.buildEmbeddable({
        initializeDrilldownsManager: mockInitializeDrilldownsManager,
        initialState: { savedObjectId: 'id' }, // runtimeState passed via mocked deserializeState
        finalizeApi: finalizeApiMock,
        uuid,
        parentApi: mockedDashboardApi,
      });
      await waitOneTick(); // wait for build to complete

      const discoverComponent = render(<Component />);

      // wait for data fetching
      expect(api.dataLoading$.getValue()).toBe(true);
      resolveSearch();
      await waitOneTick();
      expect(api.dataLoading$.getValue()).toBe(false);

      await waitFor(() => {
        const discoverGridComponent = discoverComponent.queryByTestId('discoverDocTable');
        expect(discoverGridComponent).toBeInTheDocument();
        expect(discoverComponent.queryByText('data-source-profile')).toBeInTheDocument();
      });
    });
  });
});
