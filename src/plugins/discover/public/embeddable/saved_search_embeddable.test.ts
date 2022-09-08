/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

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

jest.mock('react-dom', () => {
  return {
    ...jest.requireActual('react-dom'),
    render: jest.fn(),
  };
});

const waitOneTick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('saved search embeddable', () => {
  let mountpoint: HTMLDivElement;
  let filterManagerMock: jest.Mocked<FilterManager>;
  let servicesMock: jest.Mocked<DiscoverServices>;

  const createEmbeddable = (searchMock?: jest.Mock) => {
    const savedSearchMock = {
      id: 'mock-id',
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
    };
    const executeTriggerActions = jest.fn();
    const embeddable = new SavedSearchEmbeddable(
      savedSearchEmbeddableConfig,
      searchInput,
      executeTriggerActions
    );
    return embeddable;
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
    const embeddable = createEmbeddable();
    embeddable.updateOutput = jest.fn();

    embeddable.render(mountpoint);
    expect(render).toHaveBeenCalledTimes(1);

    // wait for data fetching
    await waitOneTick();
    expect(render).toHaveBeenCalledTimes(2);
  });

  it('should emit error output in case of fetch error', async () => {
    const search = jest.fn().mockReturnValue(throwError(new Error('Fetch error')));
    const embeddable = createEmbeddable(search);
    embeddable.updateOutput = jest.fn();

    embeddable.render(mountpoint);
    // wait for data fetching
    await waitOneTick();

    expect((embeddable.updateOutput as jest.Mock).mock.calls[1][0].error.message).toBe(
      'Fetch error'
    );
  });
});
