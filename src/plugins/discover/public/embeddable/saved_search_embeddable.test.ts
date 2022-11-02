/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ReactElement } from 'react';
import { FilterManager } from '@kbn/data-plugin/public';
import { createFilterManagerMock } from '@kbn/data-plugin/public/query/filter_manager/filter_manager.mock';
import { getSavedSearchUrl, SearchInput } from '..';
import { DiscoverServices } from '../build_services';
import { dataViewMock } from '../__mocks__/data_view';
import { discoverServiceMock } from '../__mocks__/services';
import { SavedSearchEmbeddable, SearchEmbeddableConfig } from './saved_search_embeddable';
import { render } from 'react-dom';
import { createSearchSourceMock } from '@kbn/data-plugin/public/mocks';
import { of, throwError } from 'rxjs';
import { ReactWrapper } from 'enzyme';
import { SHOW_FIELD_STATISTICS } from '../../common';
import { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import { VIEW_MODE } from '../components/view_mode_toggle';

jest.mock('react-dom', () => {
  const { mount } = jest.requireActual('enzyme');
  return {
    ...jest.requireActual('react-dom'),
    render: jest.fn((component: ReactElement) => {
      discoverComponent = mount(component);
    }),
  };
});

const waitOneTick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('saved search embeddable', () => {
  let mountpoint: HTMLDivElement;
  let filterManagerMock: jest.Mocked<FilterManager>;
  let servicesMock: jest.Mocked<DiscoverServices>;

  let executeTriggerActions: jest.Mock;
  let showFieldStatisticsMockValue: boolean = false;
  let viewModeMockValue: VIEW_MODE = VIEW_MODE.DOCUMENT_LEVEL;

  const createEmbeddable = (searchMock?: jest.Mock) => {
    const savedSearchMock = {
      id: 'mock-id',
      sort: [['message', 'asc']] as Array<[string, string]>,
      searchSource: createSearchSourceMock({ index: dataViewMock }, undefined, searchMock),
      viewMode: viewModeMockValue,
    };

    const url = getSavedSearchUrl(savedSearchMock.id);
    const editUrl = `/app/discover${url}`;
    const indexPatterns = [dataViewMock];
    const savedSearchEmbeddableConfig: SearchEmbeddableConfig = {
      savedSearch: savedSearchMock,
      editUrl,
      editPath: url,
      editable: true,
      indexPatterns,
      filterManager: filterManagerMock,
      services: servicesMock,
    };
    const searchInput: SearchInput = {
      id: 'mock-embeddable-id',
      timeRange: { from: 'now-15m', to: 'now' },
      columns: ['message', 'extension'],
      rowHeight: 30,
      rowsPerPage: 50,
    };

    executeTriggerActions = jest.fn();

    const embeddable = new SavedSearchEmbeddable(
      savedSearchEmbeddableConfig,
      searchInput,
      executeTriggerActions
    );

    // this helps to trigger reload
    // eslint-disable-next-line dot-notation
    embeddable['inputSubject'].next = jest.fn(
      (input) => (input.lastReloadRequestTime = Date.now())
    );

    return { embeddable };
  };

  beforeEach(() => {
    mountpoint = document.createElement('div');
    filterManagerMock = createFilterManagerMock();

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

  it('should render saved search embeddable when successfully loading data', async () => {
    // mock return data
    const search = jest.fn().mockReturnValue(
      of({
        rawResponse: { hits: { hits: [{ id: 1 }], total: 1 } },
        isPartial: false,
        isRunning: false,
      })
    );
    const { embeddable } = createEmbeddable(search);
    jest.spyOn(embeddable, 'updateOutput');

    // check that loading state
    const loadingOutput = embeddable.getOutput();
    expect(loadingOutput.loading).toBe(true);
    expect(loadingOutput.rendered).toBe(false);

    embeddable.render(mountpoint);
    expect(render).toHaveBeenCalledTimes(1);

    // wait for data fetching
    await waitOneTick();
    expect(render).toHaveBeenCalledTimes(2);

    // check that loading state
    const loadedOutput = embeddable.getOutput();
    expect(loadedOutput.loading).toBe(false);
    expect(loadedOutput.rendered).toBe(true);
  });

  it('should render saved search embeddable when empty data is returned', async () => {
    // mock return data
    const search = jest.fn().mockReturnValue(
      of({
        rawResponse: { hits: { hits: [], total: 0 } },
        isPartial: false,
        isRunning: false,
      })
    );
    const { embeddable } = createEmbeddable(search);
    jest.spyOn(embeddable, 'updateOutput');

    // check that loading state
    const loadingOutput = embeddable.getOutput();
    expect(loadingOutput.loading).toBe(true);
    expect(loadingOutput.rendered).toBe(false);

    embeddable.render(mountpoint);
    expect(render).toHaveBeenCalledTimes(1);

    // wait for data fetching
    await waitOneTick();
    expect(render).toHaveBeenCalledTimes(2);

    // check that loading state
    const loadedOutput = embeddable.getOutput();
    expect(loadedOutput.loading).toBe(false);
    expect(loadedOutput.rendered).toBe(true);
  });

  it('should render in AGGREGATED_LEVEL view mode', async () => {
    showFieldStatisticsMockValue = true;
    viewModeMockValue = VIEW_MODE.AGGREGATED_LEVEL;

    const { embeddable } = createEmbeddable();
    jest.spyOn(embeddable, 'updateOutput');

    // check that loading state
    const loadingOutput = embeddable.getOutput();
    expect(loadingOutput.loading).toBe(true);
    expect(loadingOutput.rendered).toBe(false);

    embeddable.render(mountpoint);
    expect(render).toHaveBeenCalledTimes(1);

    // wait for data fetching
    await waitOneTick();
    expect(render).toHaveBeenCalledTimes(2);

    // check that loading state
    const loadedOutput = embeddable.getOutput();
    expect(loadedOutput.loading).toBe(false);
    expect(loadedOutput.rendered).toBe(true);
  });

  it('should emit error output in case of fetch error', async () => {
    const search = jest.fn().mockReturnValue(throwError(new Error('Fetch error')));
    const { embeddable } = createEmbeddable(search);
    jest.spyOn(embeddable, 'updateOutput');

    embeddable.render(mountpoint);
    // wait for data fetching
    await waitOneTick();

    expect((embeddable.updateOutput as jest.Mock).mock.calls[1][0].error.message).toBe(
      'Fetch error'
    );
  });
});
