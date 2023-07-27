/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { discoverServiceMock } from '../__mocks__/services';
import { SearchEmbeddableFactory, type StartServices } from './search_embeddable_factory';
import { createSearchSourceMock } from '@kbn/data-plugin/public/mocks';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { ErrorEmbeddable } from '@kbn/embeddable-plugin/public';

jest.mock('@kbn/embeddable-plugin/public', () => {
  return {
    ...jest.requireActual('@kbn/embeddable-plugin/public'),
    openAddPanelFlyout: jest.fn(),
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

const ErrorEmbeddableMock = ErrorEmbeddable as unknown as jest.Mock;

describe('SearchEmbeddableFactory', () => {
  it('should create factory correctly', async () => {
    const savedSearchMock = {
      id: 'mock-id',
      sort: [['message', 'asc']] as Array<[string, string]>,
      searchSource: createSearchSourceMock({ index: dataViewMock }, undefined),
    };

    const mockGet = jest.fn().mockResolvedValue(savedSearchMock);
    discoverServiceMock.savedSearch.get = mockGet;

    const factory = new SearchEmbeddableFactory(
      () => Promise.resolve({ executeTriggerActions: jest.fn() } as unknown as StartServices),
      () => Promise.resolve(discoverServiceMock)
    );
    const embeddable = await factory.createFromSavedObject('saved-object-id', input);

    expect(mockGet.mock.calls[0][0]).toEqual('saved-object-id');
    expect(embeddable).toBeDefined();
  });

  it('should throw an error when saved search could not be found', async () => {
    const mockGet = jest.fn().mockRejectedValue('Could not find saved search');
    discoverServiceMock.savedSearch.get = mockGet;

    const factory = new SearchEmbeddableFactory(
      () => Promise.resolve({ executeTriggerActions: jest.fn() } as unknown as StartServices),
      () => Promise.resolve(discoverServiceMock)
    );

    await factory.createFromSavedObject('saved-object-id', input);

    expect(ErrorEmbeddableMock.mock.calls[0][0]).toEqual('Could not find saved search');
  });
});
