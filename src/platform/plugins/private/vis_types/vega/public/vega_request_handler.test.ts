/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildEsQuery, type Filter } from '@kbn/es-query';
import { coreMock } from '@kbn/core/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import type { DataView } from '@kbn/data-views-plugin/public';
import { EsqlSource, type FilterableSource } from '@kbn/data-source';
import { VegaParser } from './async_services';
import { setData, setDataViews, setHttp } from './services';
import type { VegaVisualizationDependencies } from './plugin';
import type { VegaEsqlSources } from './lib/vega_data_sources';
import { createVegaRequestHandler } from './vega_request_handler';

jest.mock('@kbn/es-query', () => {
  const actual = jest.requireActual('@kbn/es-query');
  return { ...actual, buildEsQuery: jest.fn(actual.buildEsQuery) };
});
jest.mock('@kbn/data-source', () => ({
  EsqlSource: { forDataset: jest.fn() },
}));
jest.mock('./async_services', () => ({
  VegaParser: jest.fn().mockImplementation(() => ({
    parseAsync: async function parseAsync() {
      return { toRenderDescriptor: () => ({}) };
    },
  })),
}));

const esqlDataset = { kind: 'esql', id: 'esql-logs', fields: [] } as unknown as FilterableSource;
const savedDataView = { id: 'saved-view', fields: [] } as unknown as DataView;
const filterOn = (index: string): Filter => ({ meta: { index }, query: { match_all: {} } });
const esqlSpec = JSON.stringify({ data: { url: { '%type%': 'esql', query: 'FROM logs-*' } } });
const dslSpec = JSON.stringify({ data: { url: { index: 'logs-*' } } });

describe('vegaRequestHandler', () => {
  const core = coreMock.createStart();
  const data = dataPluginMock.createStartContract();
  const dataViews = dataViewPluginMocks.createStartContract();
  const forDataset = jest.mocked(EsqlSource.forDataset);

  const request = (spec: string, filters: Filter[], esqlSources?: VegaEsqlSources) =>
    createVegaRequestHandler({
      plugins: { data },
      core,
      getServiceSettings: jest.fn(),
    } as unknown as VegaVisualizationDependencies)({
      timeRange: { from: 'now-15m', to: 'now' },
      query: undefined,
      filters,
      visParams: { spec },
      isApproximate: false,
      esqlSources,
    });

  beforeAll(() => {
    setData(data);
    setDataViews(dataViews);
    setHttp(core.http);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    dataViews.get.mockImplementation(async (id: string) => {
      if (id === savedDataView.id) return savedDataView;
      throw new Error(`Saved object [index-pattern/${id}] not found`);
    });
    forDataset.mockResolvedValue({
      toFilterableSource: async () => esqlDataset,
    } as unknown as EsqlSource);
  });

  it('builds the filters of a DSL spec with their data view, without looking up sources', async () => {
    await request(dslSpec, [filterOn('saved-view')]);

    expect(jest.mocked(buildEsQuery).mock.calls[0][0]).toBe(savedDataView);
    expect(forDataset).not.toHaveBeenCalled();
    expect(dataViews.find).not.toHaveBeenCalled();
  });

  it('builds an ES|QL filter with the dataset it names, without a data view request', async () => {
    await request(esqlSpec, [filterOn('esql-logs')]);

    expect(jest.mocked(buildEsQuery).mock.calls[0][0]).toBe(esqlDataset);
    expect(dataViews.get).not.toHaveBeenCalled();
  });

  it('reads the ES|QL sources it is given instead of resolving them, and hands them to the parser', async () => {
    const esqlSources: VegaEsqlSources = {
      filterableSources: [esqlDataset],
      getSource: () => undefined,
    };

    await request(esqlSpec, [filterOn('esql-logs')], esqlSources);

    expect(forDataset).not.toHaveBeenCalled();
    expect(jest.mocked(buildEsQuery).mock.calls[0][0]).toBe(esqlDataset);
    expect(jest.mocked(VegaParser).mock.calls[0][7]).toBe(esqlSources);
  });

  it('gets the data view of a filter that names no dataset of the spec', async () => {
    await request(esqlSpec, [filterOn('saved-view')]);

    expect(jest.mocked(buildEsQuery).mock.calls[0][0]).toBe(savedDataView);
  });

  it('builds filters without an index pattern when the first filter names none', async () => {
    await request(esqlSpec, [{ meta: {}, query: { match_all: {} } }]);

    expect(jest.mocked(buildEsQuery).mock.calls[0][0]).toBeUndefined();
    expect(dataViews.get).not.toHaveBeenCalled();
  });
});
