/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createVegaFilterActionHandler } from './vega_filter_action_handler';
import { setDataViews } from '../services';
import type { VegaRenderDescriptor } from '../data_model/types';

const createDescriptor = (): VegaRenderDescriptor => ({
  spec: {
    $schema: 'https://vega.github.io/schema/vega/v5.json',
    data: { values: [] },
    config: {} as VegaRenderDescriptor['spec']['config'],
  },
  isVegaLite: false,
  renderer: 'canvas',
  useResize: true,
  useHover: true,
  useMap: false,
  tooltips: false,
  containerDir: 'column',
  controlsDir: 'column',
  restoreSignalValuesOnRefresh: false,
  hideWarnings: false,
  warnings: [],
  bypassExternalUrlCheckUrls: [],
});

describe('createVegaFilterActionHandler', () => {
  const dataViews = {
    find: jest.fn(),
    getDefault: jest.fn(),
  };
  const filterManager = {
    getFilters: jest.fn((): unknown[] => []),
    removeFilter: jest.fn(),
    removeAll: jest.fn(),
  };
  const fireEvent = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    dataViews.find.mockResolvedValue([{ id: 'logs-index' }]);
    dataViews.getDefault.mockResolvedValue({ id: 'default-index' });
    setDataViews(dataViews as any);
  });

  const createHandler = () =>
    createVegaFilterActionHandler({
      descriptor: createDescriptor(),
      filterManager: filterManager as any,
      fireEvent,
      getDataViews: () => dataViews as any,
    });

  test('rejects unknown function names before side effects', async () => {
    await expect(createHandler()({ fn: 'kibanaDoAnything', args: [] })).rejects.toThrow(
      'kibanaDoAnything() is not defined for this graph'
    );

    expect(fireEvent).not.toHaveBeenCalled();
    expect(filterManager.removeAll).not.toHaveBeenCalled();
  });

  test('rejects hostile query argument shapes before creating filters', async () => {
    const hostileQuery = JSON.parse('{"__proto__":{"polluted":true}}');

    await expect(
      createHandler()({ fn: 'kibanaAddFilter', args: [hostileQuery, 'logs-*'] })
    ).rejects.toThrow();

    expect(({} as { polluted?: unknown }).polluted).toBeUndefined();
    expect(dataViews.find).not.toHaveBeenCalled();
    expect(fireEvent).not.toHaveBeenCalled();
  });

  test('normalizes malformed index and alias arguments', async () => {
    await createHandler()({
      fn: 'kibanaAddFilter',
      args: [{ match_all: {} }, { index: 'not-a-string' }, { alias: 'not-a-string' }],
    });

    expect(dataViews.find).not.toHaveBeenCalled();
    expect(dataViews.getDefault).toHaveBeenCalled();
    expect(fireEvent).toHaveBeenCalledWith({
      name: 'applyFilter',
      data: {
        filters: [
          expect.objectContaining({
            meta: expect.objectContaining({
              alias: undefined,
              index: 'default-index',
            }),
          }),
        ],
      },
    });
  });
});
