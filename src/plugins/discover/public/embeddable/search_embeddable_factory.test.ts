/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { discoverServiceMock } from '../__mocks__/services';
import { SearchEmbeddableFactory, type StartServices } from './search_embeddable_factory';
import { ErrorEmbeddable } from '@kbn/embeddable-plugin/public';
import type { SearchByValueInput } from '@kbn/saved-search-plugin/public';

jest.mock('@kbn/embeddable-plugin/public', () => {
  return {
    ...jest.requireActual('@kbn/embeddable-plugin/public'),
    ErrorEmbeddable: jest.fn(),
  };
});

const input = {
  id: 'mock-embeddable-id',
  savedObjectId: 'mock-saved-object-id',
  timeRange: { from: 'now-15m', to: 'now' },
  columns: ['message', 'extension'],
  rowHeight: 30,
  headerRowHeight: 5,
  rowsPerPage: 50,
};

const ErrorEmbeddableMock = ErrorEmbeddable as unknown as jest.Mock;

describe('SearchEmbeddableFactory', () => {
  it('should create factory correctly from saved object', async () => {
    const mockUnwrap = jest
      .spyOn(discoverServiceMock.savedSearch.byValue.attributeService, 'unwrapAttributes')
      .mockClear();

    const factory = new SearchEmbeddableFactory(
      () => Promise.resolve({ executeTriggerActions: jest.fn() } as unknown as StartServices),
      () => Promise.resolve(discoverServiceMock)
    );

    const embeddable = await factory.createFromSavedObject('saved-object-id', input);

    expect(mockUnwrap).toHaveBeenCalledTimes(1);
    expect(mockUnwrap).toHaveBeenLastCalledWith(input);
    expect(embeddable).toBeDefined();
  });

  it('should create factory correctly from by value input', async () => {
    const mockUnwrap = jest
      .spyOn(discoverServiceMock.savedSearch.byValue.attributeService, 'unwrapAttributes')
      .mockClear();

    const factory = new SearchEmbeddableFactory(
      () => Promise.resolve({ executeTriggerActions: jest.fn() } as unknown as StartServices),
      () => Promise.resolve(discoverServiceMock)
    );

    const { savedObjectId, ...byValueInput } = input;
    const embeddable = await factory.create(byValueInput as SearchByValueInput);

    expect(mockUnwrap).toHaveBeenCalledTimes(1);
    expect(mockUnwrap).toHaveBeenLastCalledWith(byValueInput);
    expect(embeddable).toBeDefined();
  });

  it('should show error embeddable when create throws an error', async () => {
    const error = new Error('Failed to create embeddable');
    const factory = new SearchEmbeddableFactory(
      () => {
        throw error;
      },
      () => Promise.resolve(discoverServiceMock)
    );

    await factory.createFromSavedObject('saved-object-id', input);

    expect(ErrorEmbeddableMock.mock.calls[0][0]).toEqual(error);
  });
});
