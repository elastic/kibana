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
import { getESQLAdHocDataview, getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import { extractIndexPatternsFromSpec } from './extract_index_pattern';
import { setDataViews, setHttp } from '../services';

import type { VegaSpec } from '../data_model/types';
import { vegaVisType } from '../vega_type';

jest.mock('@kbn/esql-utils', () => ({
  getIndexPatternFromESQLQuery: jest.fn(),
  getESQLAdHocDataview: jest.fn(),
}));
jest.mock('../default_spec', () => ({
  getDefaultSpec: jest.fn(() => ''),
}));

const getMockedSpec = (mockedObj: any) => mockedObj as unknown as VegaSpec;

describe('extractIndexPatternsFromSpec', () => {
  const dataViewsStart = dataViewPluginMocks.createStartContract();

  beforeAll(() => {
    setDataViews(dataViewsStart);
    setHttp(httpServiceMock.createStartContract());
  });

  beforeEach(() => {
    (getIndexPatternFromESQLQuery as jest.Mock).mockImplementation((query: string) =>
      query.replace(/^(?:FROM|TS)\s+([^\s|]+).*$/is, '$1')
    );
    (getESQLAdHocDataview as jest.Mock).mockImplementation(async ({ query }) => {
      const indexPattern = (getIndexPatternFromESQLQuery as jest.Mock)(query);
      return { id: `esql-${indexPattern}`, title: indexPattern };
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should not throw errors if no index is specified', async () => {
    const spec = getMockedSpec({
      data: {},
    });

    const indexes = await extractIndexPatternsFromSpec(spec);

    expect(indexes).toMatchInlineSnapshot(`Array []`);
  });

  test('should extract single index pattern', async () => {
    const spec = getMockedSpec({
      data: {
        url: {
          index: 'test',
        },
      },
    });

    const indexes = await extractIndexPatternsFromSpec(spec);

    expect(indexes).toMatchInlineSnapshot(`
      Array [
        Object {
          "id": "test",
          "title": "test",
        },
      ]
    `);
  });

  test('should extract multiple index patterns', async () => {
    const spec = getMockedSpec({
      data: [
        {
          url: {
            index: 'test1',
          },
        },
        {
          url: {
            index: 'test2',
          },
        },
      ],
    });

    const indexes = await extractIndexPatternsFromSpec(spec);

    expect(indexes).toMatchInlineSnapshot(`
      Array [
        Object {
          "id": "test1",
          "title": "test1",
        },
        Object {
          "id": "test2",
          "title": "test2",
        },
      ]
    `);
  });

  test('should filter empty values', async () => {
    const spec = getMockedSpec({
      data: [
        {
          url: {
            wrong: 'wrong',
          },
        },
        {
          url: {
            index: 'ok',
          },
        },
      ],
    });

    const indexes = await extractIndexPatternsFromSpec(spec);

    expect(indexes).toMatchInlineSnapshot(`
      Array [
        Object {
          "id": "ok",
          "title": "ok",
        },
      ]
    `);
  });

  test('should resolve an ad-hoc data view from an ES|QL data url', async () => {
    const spec = getMockedSpec({
      data: {
        url: {
          '%type%': 'esql',
          query: 'FROM metrics-hostmetricsreceiver.otel-default | LIMIT 10',
        },
      },
    });

    const indexes = await extractIndexPatternsFromSpec(spec);

    expect(getESQLAdHocDataview).toHaveBeenCalledWith(
      expect.objectContaining({
        query: 'FROM metrics-hostmetricsreceiver.otel-default | LIMIT 10',
      })
    );
    expect(indexes).toMatchInlineSnapshot(`
      Array [
        Object {
          "id": "esql-metrics-hostmetricsreceiver.otel-default",
          "title": "metrics-hostmetricsreceiver.otel-default",
        },
      ]
    `);
  });

  test('should combine classic index and ES|QL data views', async () => {
    const spec = getMockedSpec({
      data: [
        {
          url: {
            index: 'test',
          },
        },
        {
          url: {
            '%type%': 'esql',
            query: 'FROM logs-* | LIMIT 10',
          },
        },
      ],
    });

    const indexes = await extractIndexPatternsFromSpec(spec);

    expect(indexes).toMatchInlineSnapshot(`
      Array [
        Object {
          "id": "test",
          "title": "test",
        },
        Object {
          "id": "esql-logs-*",
          "title": "logs-*",
        },
      ]
    `);
  });

  test('should extract data views from nested specs (facet/layer/concat)', async () => {
    const spec = getMockedSpec({
      // top-level facet wraps an inner spec that holds the data
      facet: { field: 'host_name', type: 'nominal' },
      spec: {
        layer: [
          {
            data: {
              url: {
                '%type%': 'esql',
                query: 'TS metrics-* | LIMIT 10',
              },
            },
          },
          {
            data: {
              url: {
                index: 'nested-classic',
              },
            },
          },
        ],
      },
    });

    const indexes = await extractIndexPatternsFromSpec(spec);

    expect(indexes).toMatchInlineSnapshot(`
      Array [
        Object {
          "id": "nested-classic",
          "title": "nested-classic",
        },
        Object {
          "id": "esql-metrics-*",
          "title": "metrics-*",
        },
      ]
    `);
  });

  test('should de-duplicate ES|QL data views that resolve to the same index', async () => {
    const spec = getMockedSpec({
      data: [
        {
          url: {
            '%type%': 'esql',
            query: 'FROM logs-* | LIMIT 10',
          },
        },
        {
          url: {
            '%type%': 'esql',
            query: 'FROM logs-* | WHERE foo == "bar"',
          },
        },
      ],
    });

    const indexes = await extractIndexPatternsFromSpec(spec);

    expect(getESQLAdHocDataview).toHaveBeenCalledTimes(1);
    expect(indexes).toMatchInlineSnapshot(`
      Array [
        Object {
          "id": "esql-logs-*",
          "title": "logs-*",
        },
      ]
    `);
  });

  test('should return no data views when asynchronous data view resolution fails', async () => {
    (getESQLAdHocDataview as jest.Mock).mockRejectedValueOnce(new Error('resolution failed'));

    const getUsedIndexPattern = vegaVisType.getUsedIndexPattern;
    if (!getUsedIndexPattern) {
      throw new Error('Vega must define getUsedIndexPattern');
    }

    await expect(
      getUsedIndexPattern({
        spec: JSON.stringify({
          data: { url: { '%type%': 'esql', query: 'FROM logs-*' } },
        }),
      })
    ).resolves.toEqual([]);
  });
});
