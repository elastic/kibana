/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { discoverServiceMock } from '../__mocks__/services';
import { SearchEmbeddableFactory, type StartServices } from './search_embeddable_factory';
import { getSavedSearch } from '@kbn/saved-search-plugin/public';
import { createSearchSourceMock } from '@kbn/data-plugin/public/mocks';
import { dataViewMock } from '../__mocks__/data_view';
import { ErrorEmbeddable } from '@kbn/embeddable-plugin/public';

jest.mock('@kbn/saved-search-plugin/public', () => {
  return {
    ...jest.requireActual('@kbn/saved-search-plugin/public'),
    getSavedSearch: jest.fn(),
  };
});

jest.mock('@kbn/embeddable-plugin/public', () => {
  return {
    ...jest.requireActual('@kbn/embeddable-plugin/public'),
    ErrorEmbeddable: jest.fn(),
  };
});

const input = {
  id: 'mock-embeddable-id',
  timeRange: { from: 'now-15m', to: 'now' },
  columns: ['message', 'extension'],
  rowHeight: 30,
  rowsPerPage: 50,
};

const getSavedSearchMock = getSavedSearch as unknown as jest.Mock;
const ErrorEmbeddableMock = ErrorEmbeddable as unknown as jest.Mock;

describe('SearchEmbeddableFactory', () => {
  it('should create factory correctly', async () => {
    const savedSearchMock = {
      id: 'mock-id',
      sort: [['message', 'asc']] as Array<[string, string]>,
      searchSource: createSearchSourceMock({ index: dataViewMock }, undefined),
    };
    getSavedSearchMock.mockResolvedValue(savedSearchMock);

    const factory = new SearchEmbeddableFactory(
      () => Promise.resolve({ executeTriggerActions: jest.fn() } as unknown as StartServices),
      () => Promise.resolve(discoverServiceMock)
    );
    const embeddable = await factory.createFromSavedObject('saved-object-id', input);

    expect(getSavedSearchMock.mock.calls[0][0]).toEqual('saved-object-id');
    expect(embeddable).toBeDefined();
  });

  it('should throw an error when saved search could not be found', async () => {
    getSavedSearchMock.mockRejectedValue('Could not find saved search');

    const factory = new SearchEmbeddableFactory(
      () => Promise.resolve({ executeTriggerActions: jest.fn() } as unknown as StartServices),
      () => Promise.resolve(discoverServiceMock)
    );

    await factory.createFromSavedObject('saved-object-id', input);

    expect(ErrorEmbeddableMock.mock.calls[0][0]).toEqual('Could not find saved search');
  });
});
