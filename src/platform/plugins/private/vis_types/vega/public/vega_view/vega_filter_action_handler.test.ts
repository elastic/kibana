/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Filter } from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/public';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { setDataViews } from '../services';
import type { VegaFilterAction } from '../types';
import type { VegaSpec } from '../data_model/types';
import { createVegaFilterActionHandler } from './vega_filter_action_handler';

describe('createVegaFilterActionHandler', () => {
  const dataViews = dataViewPluginMocks.createStartContract();
  const { filterManager } = dataPluginMock.createStartContract().query;
  const fireEvent = jest.fn();

  const handle = createVegaFilterActionHandler({
    spec: {
      $schema: 'https://vega.github.io/schema/vega/v5.json',
      config: {},
    } as unknown as VegaSpec,
    filterManager,
    fireEvent,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    setDataViews(dataViews);
    dataViews.find.mockImplementation(async (title: string) =>
      title === 'logs-*' ? [{ id: 'logs-id' } as DataView] : []
    );
    dataViews.getDefault = jest.fn().mockResolvedValue({ id: 'default-id' } as DataView);
  });

  describe('kibanaAddFilter', () => {
    it('applies a query filter on the named index', async () => {
      await handle({
        fn: 'kibanaAddFilter',
        args: [{ match_phrase: { host: 'a' } }, 'logs-*', 'Host a'],
      });

      expect(fireEvent).toHaveBeenCalledWith({
        name: 'applyFilter',
        data: {
          filters: [
            { query: { match_phrase: { host: 'a' } }, meta: { index: 'logs-id', alias: 'Host a' } },
          ],
        },
      });
    });

    it('falls back to the default data view when no index is given', async () => {
      await handle({ fn: 'kibanaAddFilter', args: [{ match_all: {} }] });

      expect(fireEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { filters: [expect.objectContaining({ meta: { index: 'default-id' } })] },
        })
      );
    });

    it('rejects an index that does not exist', async () => {
      await expect(
        handle({ fn: 'kibanaAddFilter', args: [{ match_all: {} }, 'missing'] })
      ).rejects.toThrow('Index "missing" not found');
      expect(fireEvent).not.toHaveBeenCalled();
    });
  });

  it('kibanaRemoveFilter removes the matching filter', async () => {
    const existing: Filter = {
      query: { match_phrase: { host: 'a' } },
      meta: { index: 'logs-id' },
    };
    jest.mocked(filterManager.getFilters).mockReturnValue([existing]);

    await handle({ fn: 'kibanaRemoveFilter', args: [{ match_phrase: { host: 'a' } }, 'logs-*'] });

    expect(filterManager.removeFilter).toHaveBeenCalledWith(existing);
  });

  it('kibanaRemoveAllFilters removes every filter', async () => {
    await handle({ fn: 'kibanaRemoveAllFilters', args: [] });

    expect(filterManager.removeAll).toHaveBeenCalled();
  });

  describe('kibanaSetTimeFilter', () => {
    it('applies a relative time range', async () => {
      await handle({ fn: 'kibanaSetTimeFilter', args: ['now-1h', 'now'] });

      expect(fireEvent).toHaveBeenCalledWith({
        name: 'applyFilter',
        data: {
          timeFieldName: '*',
          filters: [
            {
              meta: {},
              query: { range: { '*': { mode: 'relative', gte: 'now-1h', lte: 'now' } } },
            },
          ],
        },
      });
    });

    it('orders a reversed absolute range', async () => {
      await handle({
        fn: 'kibanaSetTimeFilter',
        args: ['2024-01-02T00:00:00.000Z', '2024-01-01T00:00:00.000Z'],
      });

      const [{ data }] = fireEvent.mock.calls[0];
      const { gte, lte, mode } = data.filters[0].query.range['*'];
      expect(mode).toBe('absolute');
      expect(gte.toISOString()).toBe('2024-01-01T00:00:00.000Z');
      expect(lte.toISOString()).toBe('2024-01-02T00:00:00.000Z');
    });

    it('rejects values that are not dates', async () => {
      await expect(handle({ fn: 'kibanaSetTimeFilter', args: ['soon', 'later'] })).rejects.toThrow(
        'both time values must be either relative or absolute dates'
      );
    });
  });

  describe('unknown functions', () => {
    it.each(['kibanaFoo', '__proto__', 'constructor', 'toString', 'hasOwnProperty', 'setMapView'])(
      'rejects %s',
      async (fn) => {
        await expect(handle({ fn, args: [] })).rejects.toThrow(`${fn}() is not defined`);
        expect(fireEvent).not.toHaveBeenCalled();
        expect(filterManager.removeAll).not.toHaveBeenCalled();
      }
    );

    it('rejects an action whose function name is not a string', async () => {
      const action = { fn: { toString: () => 'kibanaRemoveAllFilters' }, args: [] as unknown[] };

      await expect(handle(action as unknown as VegaFilterAction)).rejects.toThrow('is not defined');
      expect(filterManager.removeAll).not.toHaveBeenCalled();
    });

    it('rejects an action whose arguments are not an array', async () => {
      const action = { fn: 'kibanaRemoveAllFilters', args: { length: 0 } };

      await expect(handle(action as unknown as VegaFilterAction)).rejects.toThrow('is not defined');
      expect(filterManager.removeAll).not.toHaveBeenCalled();
    });
  });

  describe('hostile argument shapes', () => {
    afterEach(() => {
      expect(({} as Record<string, unknown>).polluted).toBeUndefined();
      expect(fireEvent).not.toHaveBeenCalled();
    });

    it('rejects a query that tries to pollute the prototype through __proto__', async () => {
      const query = JSON.parse('{"bool":{"__proto__":{"polluted":true}}}');

      await expect(handle({ fn: 'kibanaAddFilter', args: [query, 'logs-*'] })).rejects.toThrow();
    });

    it('rejects a query that tries to pollute the prototype through constructor.prototype', async () => {
      const query = JSON.parse('{"constructor":{"prototype":{"polluted":true}}}');

      await expect(handle({ fn: 'kibanaAddFilter', args: [query, 'logs-*'] })).rejects.toThrow();
    });

    it('rejects a query carrying a function, without calling it', async () => {
      const toJSON = jest.fn(() => ({ match_all: {} }));

      await expect(
        handle({ fn: 'kibanaAddFilter', args: [{ nested: { toJSON } }, 'logs-*'] })
      ).rejects.toThrow('Object normalization error');
      expect(toJSON).not.toHaveBeenCalled();
    });

    it('rejects a cyclic query', async () => {
      const query: Record<string, unknown> = { bool: {} };
      query.self = query;

      await expect(handle({ fn: 'kibanaAddFilter', args: [query, 'logs-*'] })).rejects.toThrow();
    });

    it('rejects a pathologically deep query', async () => {
      const query: Record<string, unknown> = {};
      let node = query;
      for (let depth = 0; depth < 100_000; depth++) {
        const child: Record<string, unknown> = {};
        node.bool = child;
        node = child;
      }

      await expect(handle({ fn: 'kibanaAddFilter', args: [query, 'logs-*'] })).rejects.toThrow();
    });

    it('rejects a time value carrying a function, without calling it', async () => {
      const valueOf = jest.fn(() => 0);

      await expect(
        handle({ fn: 'kibanaSetTimeFilter', args: [{ valueOf }, 'now'] })
      ).rejects.toThrow('Object normalization error');
      expect(valueOf).not.toHaveBeenCalled();
    });
  });

  describe('non-string indices', () => {
    it.each([
      ['an object with toString', { toString: () => 'logs-*' }],
      ['a number', 42],
      ['an array', ['logs-*']],
    ])('ignores %s and uses the default data view', async (_label, index) => {
      await handle({ fn: 'kibanaAddFilter', args: [{ match_all: {} }, index, { alias: true }] });

      expect(dataViews.find).not.toHaveBeenCalled();
      expect(fireEvent).toHaveBeenCalledWith({
        name: 'applyFilter',
        data: {
          filters: [{ query: { match_all: {} }, meta: { index: 'default-id', alias: undefined } }],
        },
      });
    });
  });
});
