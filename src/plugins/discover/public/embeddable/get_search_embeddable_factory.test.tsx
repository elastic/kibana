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
import { BuildReactEmbeddableApiRegistration } from '@kbn/embeddable-plugin/public/react_embeddable_system/types';
import { PresentationContainer } from '@kbn/presentation-containers';
import { PhaseEvent, PublishesUnifiedSearch, StateComparators } from '@kbn/presentation-publishing';
import { VIEW_MODE } from '@kbn/saved-search-plugin/common';
import { act, render } from '@testing-library/react';

import { AggregateQuery, Filter, Query, TimeRange } from '@kbn/es-query';
import { createDataViewDataSource } from '../../common/data_sources';
import { discoverServiceMock } from '../__mocks__/services';
import { getSearchEmbeddableFactory } from './get_search_embeddable_factory';
import {
  SearchEmbeddableApi,
  SearchEmbeddableRuntimeState,
  SearchEmbeddableSerializedState,
} from './types';

describe('saved search embeddable', () => {
  const mockServices = {
    discoverServices: discoverServiceMock,
    startServices: {
      executeTriggerActions: jest.fn(),
      isEditable: jest.fn().mockReturnValue(true),
    },
  };
  const dataViewMock = buildDataViewMock({ name: 'the-data-view', fields: deepMockedFields });

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

  const buildApiMock = (
    api: BuildReactEmbeddableApiRegistration<
      SearchEmbeddableSerializedState,
      SearchEmbeddableRuntimeState,
      SearchEmbeddableApi
    >,
    _: StateComparators<SearchEmbeddableRuntimeState>
  ) => ({
    ...api,
    uuid,
    type: factory.type,
    parentApi: mockedDashboardApi,
    phase$: new BehaviorSubject<PhaseEvent | undefined>(undefined),
    resetUnsavedChanges: jest.fn(),
    snapshotRuntimeState: jest.fn(),
    unsavedChanges: new BehaviorSubject<Partial<SearchEmbeddableRuntimeState> | undefined>(
      undefined
    ),
  });

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
      timeRange: { from: 'now-15m', to: 'now' },
      columns: ['message', 'extension'],
      rowHeight: 30,
      headerRowHeight: 5,
      rowsPerPage: 50,
      sampleSize: 250,
      serializedSearchSource: searchSource.getSerializedFields(),
      ...partialState,
    };
  };

  const waitOneTick = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)));

  describe('search embeddable component', () => {
    it('should render empty grid when empty data is returned', async () => {
      const { search, resolveSearch } = createSearchFnMock(0);
      const initialRuntimeState = getInitialRuntimeState({ searchMock: search });
      const { Component, api } = await factory.buildEmbeddable(
        initialRuntimeState,
        buildApiMock,
        uuid,
        mockedDashboardApi,
        jest.fn().mockImplementation((newApi) => newApi),
        initialRuntimeState // initialRuntimeState only contains lastSavedRuntimeState
      );
      await waitOneTick(); // wait for build to complete
      const discoverComponent = render(<Component />);

      // wait for data fetching
      expect(api.dataLoading.getValue()).toBe(true);
      resolveSearch();
      await waitOneTick();
      expect(api.dataLoading.getValue()).toBe(false);

      expect(discoverComponent.queryByTestId('embeddedSavedSearchDocTable')).toBeInTheDocument();
      expect(discoverComponent.getByTestId('embeddedSavedSearchDocTable').textContent).toEqual(
        'No results found'
      );
    });

    it('should render field stats table in AGGREGATED_LEVEL view mode', async () => {
      const { search, resolveSearch } = createSearchFnMock(0);

      const initialRuntimeState = getInitialRuntimeState({
        searchMock: search,
        partialState: { viewMode: VIEW_MODE.AGGREGATED_LEVEL },
      });
      const { Component, api } = await factory.buildEmbeddable(
        initialRuntimeState,
        buildApiMock,
        uuid,
        mockedDashboardApi,
        jest.fn().mockImplementation((newApi) => newApi),
        initialRuntimeState // initialRuntimeState only contains lastSavedRuntimeState
      );
      await waitOneTick(); // wait for build to complete

      discoverServiceMock.uiSettings.get = jest.fn().mockImplementationOnce((key: string) => {
        if (key === SHOW_FIELD_STATISTICS) return true;
      });
      const discoverComponent = render(<Component />);

      // wait for data fetching
      expect(api.dataLoading.getValue()).toBe(true);
      resolveSearch();
      await waitOneTick();
      expect(api.dataLoading.getValue()).toBe(false);

      expect(discoverComponent.queryByTestId('dscFieldStatsEmbeddedContent')).toBeInTheDocument();
    });
  });

  describe('search embeddable api', () => {
    it('should not fetch data if only a new input title is set', async () => {
      const { search, resolveSearch } = createSearchFnMock(1);
      const initialRuntimeState = getInitialRuntimeState({
        searchMock: search,
        partialState: { viewMode: VIEW_MODE.AGGREGATED_LEVEL },
      });
      const { api } = await factory.buildEmbeddable(
        initialRuntimeState,
        buildApiMock,
        uuid,
        mockedDashboardApi,
        jest.fn().mockImplementation((newApi) => newApi),
        initialRuntimeState // initialRuntimeState only contains lastSavedRuntimeState
      );
      await waitOneTick(); // wait for build to complete

      // wait for data fetching
      expect(api.dataLoading.getValue()).toBe(true);
      resolveSearch();
      await waitOneTick();
      expect(api.dataLoading.getValue()).toBe(false);

      expect(search).toHaveBeenCalledTimes(1);
      api.setPanelTitle('custom title');
      await waitOneTick();
      expect(search).toHaveBeenCalledTimes(1);
    });
  });

  describe('context awareness', () => {
    beforeAll(() => {
      jest
        .spyOn(discoverServiceMock.core.chrome, 'getActiveSolutionNavId$')
        .mockReturnValue(new BehaviorSubject('test'));
    });

    afterAll(() => {
      jest.resetAllMocks();
    });

    it('should resolve root profile on init', async () => {
      const resolveRootProfileSpy = jest.spyOn(
        discoverServiceMock.profilesManager,
        'resolveRootProfile'
      );
      const initialRuntimeState = getInitialRuntimeState();
      await factory.buildEmbeddable(
        initialRuntimeState,
        buildApiMock,
        uuid,
        mockedDashboardApi,
        jest.fn().mockImplementation((newApi) => newApi),
        initialRuntimeState // initialRuntimeState only contains lastSavedRuntimeState
      );
      await waitOneTick(); // wait for build to complete

      expect(resolveRootProfileSpy).toHaveBeenCalledWith({ solutionNavId: 'test' });
      resolveRootProfileSpy.mockReset();
      expect(resolveRootProfileSpy).not.toHaveBeenCalled();
    });

    it('should resolve data source profile when fetching', async () => {
      const resolveDataSourceProfileSpy = jest.spyOn(
        discoverServiceMock.profilesManager,
        'resolveDataSourceProfile'
      );
      const initialRuntimeState = getInitialRuntimeState();
      const { api } = await factory.buildEmbeddable(
        initialRuntimeState,
        buildApiMock,
        uuid,
        mockedDashboardApi,
        jest.fn().mockImplementation((newApi) => newApi),
        initialRuntimeState // initialRuntimeState only contains lastSavedRuntimeState
      );
      await waitOneTick(); // wait for build to complete

      expect(resolveDataSourceProfileSpy).toHaveBeenCalledWith({
        dataSource: createDataViewDataSource({ dataViewId: dataViewMock.id! }),
        dataView: dataViewMock,
        query: api.savedSearch$.getValue().searchSource.getField('query'),
      });
      resolveDataSourceProfileSpy.mockReset();
      expect(resolveDataSourceProfileSpy).not.toHaveBeenCalled();

      // trigger a refetch
      dashboadFilters.next([]);
      await waitOneTick();
      expect(resolveDataSourceProfileSpy).toHaveBeenCalled();
    });

    it('should pass cell renderers from profile', async () => {
      const { search, resolveSearch } = createSearchFnMock(1);
      const initialRuntimeState = getInitialRuntimeState({
        searchMock: search,
        partialState: { columns: ['rootProfile', 'message', 'extension'] },
      });
      const { Component, api } = await factory.buildEmbeddable(
        initialRuntimeState,
        buildApiMock,
        uuid,
        mockedDashboardApi,
        jest.fn().mockImplementation((newApi) => newApi),
        initialRuntimeState // initialRuntimeState only contains lastSavedRuntimeState
      );
      await waitOneTick(); // wait for build to complete

      const discoverComponent = render(<Component />);

      // wait for data fetching
      expect(api.dataLoading.getValue()).toBe(true);
      resolveSearch();
      await waitOneTick();
      expect(api.dataLoading.getValue()).toBe(false);

      const discoverGridComponent = discoverComponent.queryByTestId('discoverDocTable');
      expect(discoverGridComponent).toBeInTheDocument();
      expect(discoverComponent.queryByText('data-source-profile')).toBeInTheDocument();
    });
  });
});
