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
import { throwError } from 'rxjs';
import { ReactWrapper } from 'enzyme';
import { SavedSearchEmbeddableComponent } from './saved_search_embeddable_component';

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

const waitOneTick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('saved search embeddable', () => {
  let mountpoint: HTMLDivElement;
  let filterManagerMock: jest.Mocked<FilterManager>;
  let servicesMock: jest.Mocked<DiscoverServices>;
  let executeTriggerActions: jest.Mock;

  const createEmbeddable = (searchMock?: jest.Mock) => {
    const savedSearchMock = {
      id: 'mock-id',
      sort: [['message', 'asc']] as Array<[string, string]>,
      searchSource: createSearchSourceMock({ index: dataViewMock }, undefined, searchMock),
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

    return { embeddable, searchInput };
  };

  beforeEach(() => {
    mountpoint = document.createElement('div');
    filterManagerMock = createFilterManagerMock();
    servicesMock = discoverServiceMock as unknown as jest.Mocked<DiscoverServices>;
  });

  afterEach(() => {
    mountpoint.remove();
  });

  it('should render saved search embeddable two times initially', async () => {
    const { embeddable } = createEmbeddable();
    embeddable.updateOutput = jest.fn();

    embeddable.render(mountpoint);
    expect(render).toHaveBeenCalledTimes(1);

    // wait for data fetching
    await waitOneTick();
    expect(render).toHaveBeenCalledTimes(2);
  });

  it('should update input correctly', async () => {
    const { embeddable } = createEmbeddable();
    embeddable.updateOutput = jest.fn();

    embeddable.render(mountpoint);
    await waitOneTick();

    const searchProps = discoverComponent.find(SavedSearchEmbeddableComponent).prop('searchProps');

    searchProps.onAddColumn!('bytes');
    await waitOneTick();
    expect(searchProps.columns).toEqual(['message', 'extension', 'bytes']);

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

    expect(searchProps.rowsPerPageState).toEqual(50);
    searchProps.onUpdateRowsPerPage!(100);
    await waitOneTick();
    expect(searchProps.rowsPerPageState).toEqual(100);

    searchProps.onFilter!({ name: 'customer_id', type: 'string', scripted: false }, [17], '+');
    await waitOneTick();
    expect(executeTriggerActions).toHaveBeenCalled();
  });

  it('should emit error output in case of fetch error', async () => {
    const search = jest.fn().mockReturnValue(throwError(new Error('Fetch error')));
    const { embeddable } = createEmbeddable(search);
    embeddable.updateOutput = jest.fn();

    embeddable.render(mountpoint);
    // wait for data fetching
    await waitOneTick();

    expect((embeddable.updateOutput as jest.Mock).mock.calls[1][0].error.message).toBe(
      'Fetch error'
    );
  });

  it('a custom title should not start another search which would cause an Abort error', async () => {
    const search = jest.fn().mockReturnValue(
      of({
        rawResponse: { hits: { hits: [], total: 0 } },
        isPartial: false,
        isRunning: false,
      })
    );
    const { embeddable, searchInput } = createEmbeddable(search);

    embeddable.render(mountpoint);
    // wait for data fetching
    await waitOneTick();
    expect(search).toHaveBeenCalledTimes(1);
    embeddable.updateOutput({ title: 'custom title' });
    embeddable.updateInput(searchInput);
    await waitOneTick();
    expect(search).toHaveBeenCalledTimes(1);
  });
});
