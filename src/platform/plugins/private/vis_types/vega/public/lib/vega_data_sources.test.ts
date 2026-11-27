/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { httpServiceMock } from '@kbn/core/public/mocks';
import { EsqlSource, type FilterableSource } from '@kbn/data-source';
import type { DataView } from '@kbn/data-views-plugin/public';
import {
  NO_ESQL_SOURCES,
  resolveVegaDataSources,
  resolveVegaDataSourcesOfText,
  resolveVegaEsqlSources,
  resolveVegaEsqlSourcesOfText,
} from './vega_data_sources';
import { setDataViews, setHttp } from '../services';
import type { VegaSpec } from '../data_model/types';
import { vegaVisType } from '../vega_type';

jest.mock('@kbn/data-source', () => ({
  EsqlSource: { forDataset: jest.fn() },
}));
jest.mock('../default_spec', () => ({
  getDefaultSpec: jest.fn(() => ''),
}));

const asSpec = (spec: object) => spec as unknown as VegaSpec;
const esqlUrl = (query: string) => ({ url: { '%type%': 'esql', query } });

// The dataset of a query is its FROM target in these tests.
const datasetOf = (query: string) => query.replace(/^(?:FROM|TS)\s+([^\s|]+).*$/is, '$1');

describe('vega data sources', () => {
  const dataViews = dataViewPluginMocks.createStartContract();
  const forDataset = jest.mocked(EsqlSource.forDataset);

  beforeAll(() => {
    setDataViews(dataViews);
    setHttp(httpServiceMock.createStartContract());
  });

  beforeEach(() => {
    jest.clearAllMocks();
    dataViews.find.mockImplementation(async (index: string) => [
      { id: `${index}-id`, title: index } as DataView,
    ]);
    forDataset.mockImplementation(
      async ({ query }) =>
        ({
          query,
          timeFieldName: '@timestamp',
          toFilterableSource: async () => ({ kind: 'esql', id: `esql-${datasetOf(query)}` }),
        } as unknown as EsqlSource)
    );
  });

  describe('resolveVegaEsqlSources', () => {
    it('resolves nothing for a spec without ES|QL urls', async () => {
      const sources = await resolveVegaEsqlSources(asSpec({ data: { url: { index: 'logs-*' } } }));

      expect(sources).toBe(NO_ESQL_SOURCES);
      expect(forDataset).not.toHaveBeenCalled();
    });

    it('resolves the source of each query and each dataset once, nested specs included', async () => {
      const spec = asSpec({
        facet: { field: 'host', type: 'nominal' },
        spec: {
          layer: [
            { data: esqlUrl('FROM logs-* | LIMIT 10') },
            { data: esqlUrl('FROM logs-* | WHERE status == 200') },
            { data: esqlUrl('TS metrics-* | LIMIT 10') },
          ],
        },
      });

      const sources = await resolveVegaEsqlSources(spec);

      expect(forDataset).toHaveBeenCalledTimes(3);
      expect(sources.getSource('FROM logs-* | WHERE status == 200')?.query).toBe(
        'FROM logs-* | WHERE status == 200'
      );
      expect(sources.getSource('FROM other')).toBeUndefined();
      expect(sources.filterableSources).toEqual([
        { kind: 'esql', id: 'esql-logs-*' },
        { kind: 'esql', id: 'esql-metrics-*' },
      ]);
    });

    it('leaves out a query without a dataset and a query that fails, and keeps the others', async () => {
      forDataset.mockRejectedValueOnce(new Error('resolution failed'));
      const spec = asSpec({
        data: [esqlUrl('FROM broken-*'), esqlUrl('ROW a = 1'), esqlUrl('FROM logs-*')],
      });

      const sources = await resolveVegaEsqlSources(spec);

      expect(forDataset).toHaveBeenCalledTimes(2);
      expect(sources.getSource('FROM broken-*')).toBeUndefined();
      expect(sources.getSource('ROW a = 1')).toBeUndefined();
      expect(sources.filterableSources).toEqual([{ kind: 'esql', id: 'esql-logs-*' }]);
    });

    it('resolves nothing for a spec text that does not parse', async () => {
      expect(await resolveVegaEsqlSourcesOfText('{ data: ')).toBe(NO_ESQL_SOURCES);
    });
  });

  describe('resolveVegaDataSources', () => {
    it('finds the data views of index urls as before, without ES|QL lookups', async () => {
      const sources = await resolveVegaDataSources(
        asSpec({
          data: [{ url: { index: 'test1' } }, { url: { wrong: 'x' } }, { url: { index: 'test2' } }],
        })
      );

      expect(dataViews.find).toHaveBeenCalledWith('test1', 1);
      expect(dataViews.find).toHaveBeenCalledWith('test2', 1);
      expect(forDataset).not.toHaveBeenCalled();
      expect(sources).toEqual([
        { id: 'test1-id', title: 'test1' },
        { id: 'test2-id', title: 'test2' },
      ]);
    });

    it('lists the data views of index urls, then the datasets of ES|QL urls', async () => {
      const sources = await resolveVegaDataSources(
        asSpec({ data: [esqlUrl('FROM logs-*'), { url: { index: 'test' } }] })
      );

      expect(sources).toEqual([
        { id: 'test-id', title: 'test' },
        { kind: 'esql', id: 'esql-logs-*' },
      ]);
    });

    it('uses the ES|QL sources the caller already holds', async () => {
      const held = Promise.resolve({
        filterableSources: [{ kind: 'esql', id: 'held' } as FilterableSource],
        getSource: (): undefined => undefined,
      });

      const sources = await resolveVegaDataSources(asSpec({ data: esqlUrl('FROM logs-*') }), held);

      expect(forDataset).not.toHaveBeenCalled();
      expect(sources).toEqual([{ kind: 'esql', id: 'held' }]);
    });

    it('leaves out an index url whose lookup fails', async () => {
      dataViews.find.mockRejectedValueOnce(new Error('find failed'));

      const sources = await resolveVegaDataSources(
        asSpec({ data: [{ url: { index: 'broken' } }, { url: { index: 'test' } }] })
      );

      expect(sources).toEqual([{ id: 'test-id', title: 'test' }]);
    });

    it('resolves nothing for a spec text that does not parse', async () => {
      expect(await resolveVegaDataSourcesOfText('{ data: ')).toEqual([]);
    });
  });

  it('gives the legacy visualization type the data sources of its spec', async () => {
    const { getUsedIndexPattern } = vegaVisType;
    if (!getUsedIndexPattern) {
      throw new Error('Vega must define getUsedIndexPattern');
    }

    await expect(
      getUsedIndexPattern({ spec: JSON.stringify({ data: esqlUrl('FROM logs-*') }) })
    ).resolves.toEqual([{ kind: 'esql', id: 'esql-logs-*' }]);
    await expect(getUsedIndexPattern({ spec: '{ data: ' })).resolves.toEqual([]);
  });
});
