/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import { createSearchSourceMock } from '@kbn/data-plugin/public/mocks';
import type { DataView } from '@kbn/data-views-plugin/common';
import { SHOW_FIELD_STATISTICS } from '@kbn/discover-utils';
import { buildDataViewMock, deepMockedFields } from '@kbn/discover-utils/src/__mocks__';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import type { SavedSearchByValueAttributes } from '@kbn/saved-search-plugin/public';
import { ReactWrapper } from 'enzyme';
import { ReactElement } from 'react';
import { render } from 'react-dom';
import { act } from 'react-dom/test-utils';
import { Observable, throwError } from 'rxjs';
import { SearchInput } from '..';
import { VIEW_MODE } from '../../common/constants';
import { DiscoverServices } from '../build_services';
import { dataViewAdHoc } from '../__mocks__/data_view_complex';
import { discoverServiceMock } from '../__mocks__/services';
import { getDiscoverLocatorParams } from './get_discover_locator_params';
import { SavedSearchEmbeddable, SearchEmbeddableConfig } from './saved_search_embeddable';
import { SavedSearchEmbeddableComponent } from './saved_search_embeddable_component';

jest.mock('./get_discover_locator_params', () => {
  const actual = jest.requireActual('./get_discover_locator_params');
  return {
    ...actual,
    getDiscoverLocatorParams: jest.fn(actual.getDiscoverLocatorParams),
  };
});

let discoverComponent: ReactWrapper;

jest.mock('react-dom', () => {
  const { mount } = jest.requireActual('enzyme');
  return {
    ...jest.requireActual('react-dom'),
    render: jest.fn((component: ReactElement) => {
      discoverComponent = mount(component);
    }),
  };
});

const waitOneTick = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)));

function getSearchResponse(nrOfHits: number) {
  const hits = new Array(nrOfHits).fill(null).map((_, idx) => ({ id: idx }));
  return {
    rawResponse: {
      hits: { hits, total: nrOfHits },
    },
    isPartial: false,
    isRunning: false,
  };
}

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

const dataViewMock = buildDataViewMock({ name: 'the-data-view', fields: deepMockedFields });

describe('saved search embeddable', () => {
  let mountpoint: HTMLDivElement;
  let servicesMock: jest.Mocked<DiscoverServices>;

  let executeTriggerActions: jest.Mock;
  let showFieldStatisticsMockValue: boolean = false;
  let viewModeMockValue: VIEW_MODE = VIEW_MODE.DOCUMENT_LEVEL;

  const createEmbeddable = ({
    searchMock,
    customTitle,
    dataView = dataViewMock,
    byValue,
  }: {
    searchMock?: jest.Mock;
    customTitle?: string;
    dataView?: DataView;
    byValue?: boolean;
  } = {}) => {
    const searchSource = createSearchSourceMock({ index: dataView }, undefined, searchMock);
    const savedSearch = {
      id: 'mock-id',
      title: 'saved search',
      sort: [['message', 'asc']] as Array<[string, string]>,
      searchSource,
      viewMode: viewModeMockValue,
      managed: false,
    };
    executeTriggerActions = jest.fn();
    jest
      .spyOn(servicesMock.savedSearch.byValue, 'toSavedSearch')
      .mockReturnValue(Promise.resolve(savedSearch));
    const savedSearchEmbeddableConfig: SearchEmbeddableConfig = {
      editable: true,
      services: servicesMock,
      executeTriggerActions,
    };
    const baseInput = {
      id: 'mock-embeddable-id',
      viewMode: ViewMode.EDIT,
      timeRange: { from: 'now-15m', to: 'now' },
      columns: ['message', 'extension'],
      rowHeight: 30,
      headerRowHeight: 5,
      rowsPerPage: 50,
      sampleSize: 250,
    };
    const searchInput: SearchInput = byValue
      ? { ...baseInput, attributes: {} as SavedSearchByValueAttributes }
      : { ...baseInput, savedObjectId: savedSearch.id };
    if (customTitle) {
      searchInput.title = customTitle;
    }
    const embeddable = new SavedSearchEmbeddable(savedSearchEmbeddableConfig, searchInput);

    // this helps to trigger reload
    // eslint-disable-next-line dot-notation
    embeddable['inputSubject'].next = jest.fn(
      (input) => (input.lastReloadRequestTime = Date.now())
    );

    return { embeddable, searchInput, searchSource, savedSearch };
  };

  beforeEach(() => {
    mountpoint = document.createElement('div');

    showFieldStatisticsMockValue = false;
    viewModeMockValue = VIEW_MODE.DOCUMENT_LEVEL;

    servicesMock = discoverServiceMock as unknown as jest.Mocked<DiscoverServices>;

    (servicesMock.uiSettings as unknown as jest.Mocked<IUiSettingsClient>).get.mockImplementation(
      (key: string) => {
        if (key === SHOW_FIELD_STATISTICS) return showFieldStatisticsMockValue;
      }
    );
  });

  afterEach(() => {
    mountpoint.remove();
    jest.resetAllMocks();
  });

  it('should update input correctly', async () => {
    const { embeddable } = createEmbeddable();
    jest.spyOn(embeddable, 'updateOutput');

    await waitOneTick();
    expect(render).toHaveBeenCalledTimes(0);
    embeddable.render(mountpoint);
    expect(render).toHaveBeenCalledTimes(1);

    const searchProps = discoverComponent.find(SavedSearchEmbeddableComponent).prop('searchProps');

    searchProps.onAddColumn!('bytes');
    await waitOneTick();
    expect(searchProps.columns).toEqual(['message', 'extension', 'bytes']);
    expect(render).toHaveBeenCalledTimes(3); // twice per an update to show and then hide a loading indicator

    searchProps.onRemoveColumn!('bytes');
    await waitOneTick();
    expect(searchProps.columns).toEqual(['message', 'extension']);

    searchProps.onSetColumns!(['message', 'bytes', 'extension'], false);
    await waitOneTick();
    expect(searchProps.columns).toEqual(['message', 'bytes', 'extension']);

    searchProps.onMoveColumn!('bytes', 2);
    await waitOneTick();
    expect(searchProps.columns).toEqual(['message', 'extension', 'bytes']);

    expect(searchProps.rowHeightState).toEqual(30);
    searchProps.onUpdateRowHeight!(40);
    await waitOneTick();
    expect(searchProps.rowHeightState).toEqual(40);

    expect(searchProps.headerRowHeightState).toEqual(5);
    searchProps.onUpdateHeaderRowHeight!(3);
    await waitOneTick();
    expect(searchProps.headerRowHeightState).toEqual(3);

    expect(searchProps.rowsPerPageState).toEqual(50);
    searchProps.onUpdateRowsPerPage!(100);
    await waitOneTick();
    expect(searchProps.rowsPerPageState).toEqual(100);

    expect(
      discoverComponent.find(SavedSearchEmbeddableComponent).prop('fetchedSampleSize')
    ).toEqual(250);
    searchProps.onUpdateSampleSize!(300);
    await waitOneTick();
    expect(
      discoverComponent.find(SavedSearchEmbeddableComponent).prop('fetchedSampleSize')
    ).toEqual(300);

    searchProps.onFilter!({ name: 'customer_id', type: 'string', scripted: false }, [17], '+');
    await waitOneTick();
    expect(executeTriggerActions).toHaveBeenCalled();
  });

  it('should render saved search embeddable when successfully loading data', async () => {
    // mock return data
    const { search, resolveSearch } = createSearchFnMock(1);
    const { embeddable } = createEmbeddable({ searchMock: search });
    jest.spyOn(embeddable, 'updateOutput');

    await waitOneTick();

    // check that loading state
    const loadingOutput = embeddable.getOutput();
    expect(loadingOutput.loading).toBe(true);
    expect(loadingOutput.rendered).toBe(false);
    expect(loadingOutput.error).toBe(undefined);

    embeddable.render(mountpoint);
    expect(render).toHaveBeenCalledTimes(1);

    // wait for data fetching
    resolveSearch();
    await waitOneTick();
    expect(render).toHaveBeenCalledTimes(2);

    // check that loading state
    const loadedOutput = embeddable.getOutput();
    expect(loadedOutput.loading).toBe(false);
    expect(loadedOutput.rendered).toBe(true);
    expect(loadedOutput.error).toBe(undefined);
  });

  it('should render saved search embeddable when empty data is returned', async () => {
    // mock return data
    const { search, resolveSearch } = createSearchFnMock(0);
    const { embeddable } = createEmbeddable({ searchMock: search });
    jest.spyOn(embeddable, 'updateOutput');

    await waitOneTick();

    // check that loading state
    const loadingOutput = embeddable.getOutput();
    expect(loadingOutput.loading).toBe(true);
    expect(loadingOutput.rendered).toBe(false);
    expect(loadingOutput.error).toBe(undefined);

    embeddable.render(mountpoint);
    expect(render).toHaveBeenCalledTimes(1);

    // wait for data fetching
    resolveSearch();
    await waitOneTick();
    expect(render).toHaveBeenCalledTimes(2);

    // check that loading state
    const loadedOutput = embeddable.getOutput();
    expect(loadedOutput.loading).toBe(false);
    expect(loadedOutput.rendered).toBe(true);
    expect(loadedOutput.error).toBe(undefined);
  });

  it('should render in AGGREGATED_LEVEL view mode', async () => {
    showFieldStatisticsMockValue = true;
    viewModeMockValue = VIEW_MODE.AGGREGATED_LEVEL;

    const { search, resolveSearch } = createSearchFnMock(1);
    const { embeddable } = createEmbeddable({ searchMock: search });
    jest.spyOn(embeddable, 'updateOutput');

    await waitOneTick();

    // check that loading state
    const loadingOutput = embeddable.getOutput();
    expect(loadingOutput.loading).toBe(true);
    expect(loadingOutput.rendered).toBe(false);
    expect(loadingOutput.error).toBe(undefined);

    embeddable.render(mountpoint);
    expect(render).toHaveBeenCalledTimes(1);

    // wait for data fetching
    resolveSearch();
    await waitOneTick();
    expect(render).toHaveBeenCalledTimes(2);

    // check that loading state
    const loadedOutput = embeddable.getOutput();
    expect(loadedOutput.loading).toBe(false);
    expect(loadedOutput.rendered).toBe(true);
    expect(loadedOutput.error).toBe(undefined);
  });

  it('should emit error output in case of fetch error', async () => {
    const search = jest.fn().mockReturnValue(throwError(new Error('Fetch error')));
    const { embeddable } = createEmbeddable({ searchMock: search });
    jest.spyOn(embeddable, 'updateOutput');

    embeddable.render(mountpoint);
    // wait for data fetching
    await waitOneTick();

    expect((embeddable.updateOutput as jest.Mock).mock.calls[2][0].error.message).toBe(
      'Fetch error'
    );
    // check that loading state
    const loadedOutput = embeddable.getOutput();
    expect(loadedOutput.loading).toBe(false);
    expect(loadedOutput.rendered).toBe(true);
    expect(loadedOutput.error).not.toBe(undefined);
  });

  it('should not fetch data if only a new input title is set', async () => {
    const search = jest.fn().mockReturnValue(getSearchResponse(1));
    const { embeddable, searchInput } = createEmbeddable({ searchMock: search });
    await waitOneTick();
    embeddable.render(mountpoint);
    // wait for data fetching
    await waitOneTick();
    expect(search).toHaveBeenCalledTimes(1);
    embeddable.updateOutput({ title: 'custom title' });
    embeddable.updateInput(searchInput);
    await waitOneTick();
    expect(search).toHaveBeenCalledTimes(1);
  });

  it('should not reload when the input title doesnt change', async () => {
    const search = jest.fn().mockReturnValue(getSearchResponse(1));
    const { embeddable } = createEmbeddable({ searchMock: search, customTitle: 'custom title' });
    embeddable.reload = jest.fn();
    await waitOneTick();
    embeddable.render(mountpoint);
    // wait for data fetching
    await waitOneTick();
    embeddable.updateOutput({ title: 'custom title' });
    await waitOneTick();

    expect(embeddable.reload).toHaveBeenCalledTimes(0);
    expect(search).toHaveBeenCalledTimes(1);
  });

  it('should reload when a different input title is set', async () => {
    const search = jest.fn().mockReturnValue(getSearchResponse(1));
    const { embeddable } = createEmbeddable({ searchMock: search, customTitle: 'custom title' });
    embeddable.reload = jest.fn();
    await waitOneTick();
    embeddable.render(mountpoint);

    await waitOneTick();
    embeddable.updateOutput({ title: 'custom title changed' });
    await waitOneTick();

    expect(embeddable.reload).toHaveBeenCalledTimes(1);
    expect(search).toHaveBeenCalledTimes(1);
  });

  it('should not reload and fetch when a input title matches the saved search title', async () => {
    const search = jest.fn().mockReturnValue(getSearchResponse(1));
    const { embeddable } = createEmbeddable({ searchMock: search });
    embeddable.reload = jest.fn();
    await waitOneTick();
    embeddable.render(mountpoint);
    await waitOneTick();
    embeddable.updateOutput({ title: 'saved search' });
    await waitOneTick();

    expect(embeddable.reload).toHaveBeenCalledTimes(0);
    expect(search).toHaveBeenCalledTimes(1);
  });

  it('should correctly handle aborted requests', async () => {
    const { embeddable, searchSource } = createEmbeddable();
    await waitOneTick();
    const updateOutput = jest.spyOn(embeddable, 'updateOutput');
    const abortSignals: AbortSignal[] = [];
    jest.spyOn(searchSource, 'fetch$').mockImplementation(
      (options) =>
        new Observable(() => {
          if (options?.abortSignal) {
            abortSignals.push(options.abortSignal);
          }
          throw new Error('Search failed');
        })
    );
    embeddable.reload();
    embeddable.reload();
    await waitOneTick();
    expect(updateOutput).toHaveBeenCalledTimes(3);
    expect(abortSignals[0].aborted).toBe(true);
    expect(abortSignals[1].aborted).toBe(false);
    embeddable.reload();
    await waitOneTick();
    expect(updateOutput).toHaveBeenCalledTimes(5);
    expect(abortSignals[2].aborted).toBe(false);
  });

  describe('edit link params', () => {
    const runEditLinkTest = async (dataView?: DataView, byValue?: boolean) => {
      jest
        .spyOn(servicesMock.locator, 'getUrl')
        .mockClear()
        .mockResolvedValueOnce('/base/mock-url');
      jest
        .spyOn(servicesMock.core.http.basePath, 'remove')
        .mockClear()
        .mockReturnValueOnce('/mock-url');
      const { embeddable } = createEmbeddable({ dataView, byValue });

      const locatorParams = getDiscoverLocatorParams(embeddable);
      (getDiscoverLocatorParams as jest.Mock).mockClear();
      await waitOneTick();
      expect(getDiscoverLocatorParams).toHaveBeenCalledTimes(1);
      expect(getDiscoverLocatorParams).toHaveBeenCalledWith(embeddable);
      expect(servicesMock.locator.getUrl).toHaveBeenCalledTimes(1);
      expect(servicesMock.locator.getUrl).toHaveBeenCalledWith(locatorParams);
      expect(servicesMock.core.http.basePath.remove).toHaveBeenCalledTimes(1);
      expect(servicesMock.core.http.basePath.remove).toHaveBeenCalledWith('/base/mock-url');
      const { editApp, editPath, editUrl } = embeddable.getOutput();
      expect(editApp).toBe('discover');
      expect(editPath).toBe('/mock-url');
      expect(editUrl).toBe('/base/mock-url');
    };

    it('should correctly output edit link params for by reference saved search', async () => {
      await runEditLinkTest();
    });

    it('should correctly output edit link params for by reference saved search with ad hoc data view', async () => {
      await runEditLinkTest(dataViewAdHoc);
    });

    it('should correctly output edit link params for by value saved search', async () => {
      await runEditLinkTest(undefined, true);
    });

    it('should correctly output edit link params for by value saved search with ad hoc data view', async () => {
      jest
        .spyOn(servicesMock.locator, 'getRedirectUrl')
        .mockClear()
        .mockReturnValueOnce('/base/mock-url');
      jest
        .spyOn(servicesMock.core.http.basePath, 'remove')
        .mockClear()
        .mockReturnValueOnce('/mock-url');
      const { embeddable } = createEmbeddable({
        dataView: dataViewAdHoc,
        byValue: true,
      });
      const locatorParams = getDiscoverLocatorParams(embeddable);
      (getDiscoverLocatorParams as jest.Mock).mockClear();
      await waitOneTick();
      expect(getDiscoverLocatorParams).toHaveBeenCalledTimes(1);
      expect(getDiscoverLocatorParams).toHaveBeenCalledWith(embeddable);
      expect(servicesMock.locator.getRedirectUrl).toHaveBeenCalledTimes(1);
      expect(servicesMock.locator.getRedirectUrl).toHaveBeenCalledWith(locatorParams);
      expect(servicesMock.core.http.basePath.remove).toHaveBeenCalledTimes(1);
      expect(servicesMock.core.http.basePath.remove).toHaveBeenCalledWith('/base/mock-url');
      const { editApp, editPath, editUrl } = embeddable.getOutput();
      expect(editApp).toBe('r');
      expect(editPath).toBe('/mock-url');
      expect(editUrl).toBe('/base/mock-url');
    });
  });
});
