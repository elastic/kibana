/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  buildDatasourceStates,
  buildReferences,
  getDatasetIndex,
  addLayerColumn,
  getDefaultReferences,
  operationFromColumn,
  buildDatasetState,
  isSingleLayer,
  generateLayer,
} from './utils';
import type {
  GenericIndexPatternColumn,
  PersistedIndexPatternLayer,
  FormBasedLayer,
} from '@kbn/lens-plugin/public';
import type { TextBasedLayer } from '@kbn/lens-plugin/public/datasources/form_based/esql_layer/types';
import type { LensApiState } from '../schema';

const dataView = 'test-dataview';

test('build references correctly builds references', () => {
  const results = buildReferences({
    layer1: dataView,
    layer2: dataView,
  });
  expect(results).toMatchInlineSnapshot(`
    Array [
      Object {
        "id": "test-dataview",
        "name": "indexpattern-datasource-layer-layer1",
        "type": "index-pattern",
      },
      Object {
        "id": "test-dataview",
        "name": "indexpattern-datasource-layer-layer2",
        "type": "index-pattern",
      },
    ]
  `);
});

describe('getDatasetIndex', () => {
  test('returns index if provided', () => {
    const result = getDatasetIndex({
      type: 'index',
      index: 'test',
      time_field: '@timestamp',
    });
    expect(result).toMatchInlineSnapshot(`
      Object {
        "index": "test",
        "timeFieldName": "@timestamp",
      }
    `);
  });

  test('extracts index from esql query', () => {
    const result = getDatasetIndex({
      type: 'esql',
      query: 'from test_index | limit 10',
    });
    expect(result).toMatchInlineSnapshot(`
      Object {
        "index": "test_index",
        "timeFieldName": "@timestamp",
      }
    `);
  });

  test('returns undefined if no query or iundex provided', () => {
    const result = getDatasetIndex({
      type: 'table',
      table: {
        columns: [],
        rows: [],
      },
    });
    expect(result).toMatchInlineSnapshot(`undefined`);
  });
});

describe('addLayerColumn', () => {
  test('adds column to the end', () => {
    const layer = {
      columns: [],
      columnOrder: [],
    } as unknown as PersistedIndexPatternLayer;
    addLayerColumn(layer, 'first', {
      test: 'test',
    } as unknown as GenericIndexPatternColumn);
    addLayerColumn(layer, 'second', {
      test: 'test',
    } as unknown as GenericIndexPatternColumn);
    addLayerColumn(
      layer,
      'before_first',
      {
        test: 'test',
      } as unknown as GenericIndexPatternColumn,
      true
    );
    expect(layer).toMatchInlineSnapshot(`
      Object {
        "columnOrder": Array [
          "before_first",
          "first",
          "second",
        ],
        "columns": Object {
          "before_first": Object {
            "test": "test",
          },
          "first": Object {
            "test": "test",
          },
          "second": Object {
            "test": "test",
          },
        },
      }
    `);
  });
});

describe('buildDatasourceStates', () => {
  test('correctly builds esql layer', async () => {
    const results = await buildDatasourceStates(
      {
        type: 'metric',
        title: 'test',
        dataset: {
          type: 'esql',
          query: 'from test | limit 10',
        },
        metric: {
          operation: 'value',
          label: 'test',
          column: 'test',
          fit: false,
          alignments: { labels: 'left', value: 'left' },
        },
        sampling: 1,
        ignore_global_filters: false,
      },
      {},
      undefined as any,
      () => [{ columnId: 'test', fieldName: 'test' }]
    );
    expect(results).toMatchInlineSnapshot(`
      Object {
        "textBased": Object {
          "layers": Object {
            "layer_0": Object {
              "columns": Array [
                Object {
                  "columnId": "test",
                  "fieldName": "test",
                },
              ],
              "index": "test",
              "query": Object {
                "esql": "from test | limit 10",
              },
              "timeField": "@timestamp",
            },
          },
        },
      }
    `);
  });
});

describe('getDefaultReferences', () => {
  test('generates correct references for index and layer id', () => {
    const result = getDefaultReferences('my-index', 'layer_1');
    expect(result).toMatchInlineSnapshot(`
      Array [
        Object {
          "id": "my-index",
          "name": "indexpattern-datasource-layer-layer_1",
          "type": "index-pattern",
        },
      ]
    `);
  });
});

describe('operationFromColumn', () => {
  test('returns undefined for non-existent column', () => {
    const layer = {
      indexPatternId: 'test-dataview',
      columns: {},
      columnOrder: [],
    } as unknown as FormBasedLayer;

    const result = operationFromColumn('non-existent', layer);
    expect(result).toBeUndefined();
  });

  test('handles bucket operation', () => {
    const layer = {
      indexPatternId: 'test-dataview',
      columns: {
        'test-column': {
          operationType: 'terms',
          sourceField: 'category',
          label: 'Top values of category',
          isBucketed: true,
          params: {
            size: 10,
            orderBy: { type: 'alphabetical' },
            orderDirection: 'asc',
          },
        },
      },
      columnOrder: ['test-column'],
    } as unknown as FormBasedLayer;

    const result = operationFromColumn('test-column', layer);
    expect(result).toBeDefined();
  });

  test('handles metric operation', () => {
    const layer = {
      indexPatternId: 'test-dataview',
      columns: {
        'test-column': {
          operationType: 'average',
          sourceField: 'price',
          label: 'Average of price',
        },
      },
      columnOrder: ['test-column'],
    } as unknown as FormBasedLayer;

    const result = operationFromColumn('test-column', layer);
    expect(result).toBeDefined();
  });
});

describe('buildDatasetState', () => {
  test('builds esql dataset state', () => {
    const textBasedLayer = {
      index: 'my-index',
      query: { esql: 'from my-index | limit 10' },
      columns: [],
      allColumns: [],
    } as TextBasedLayer;

    const result = buildDatasetState(textBasedLayer);
    expect(result).toMatchInlineSnapshot(`
      Object {
        "query": "from my-index | limit 10",
        "type": "esql",
      }
    `);
  });

  test('builds index dataset state', () => {
    const formBasedLayer = {
      indexPatternId: 'my-dataview-id',
      columns: {},
      columnOrder: [],
    } as FormBasedLayer;

    const result = buildDatasetState(formBasedLayer);
    expect(result).toMatchInlineSnapshot(`
      Object {
        "index": "my-dataview-id",
        "time_field": "@timestamp",
        "type": "index",
      }
    `);
  });
});

describe('isSingleLayer', () => {
  test('returns true for PersistedIndexPatternLayer', () => {
    const layer = {
      columnOrder: ['col1'],
      columns: {},
    };

    expect(isSingleLayer(layer)).toBe(true);
  });

  test('returns true for TextBased layer', () => {
    const layer = {
      columns: [],
      allColumns: [],
      index: 'test',
    };

    expect(isSingleLayer(layer)).toBe(true);
  });
});

describe('generateLayer', () => {
  test('generates layer with correct structure', () => {
    const options = {
      type: 'metric',
      sampling: 0.5,
      ignore_global_filters: true,
    } as LensApiState;

    const result = generateLayer('layer_1', options);

    expect(result).toMatchInlineSnapshot(`
      Object {
        "layer_1": Object {
          "columnOrder": Array [],
          "columns": Object {},
          "ignoreGlobalFilters": true,
          "sampling": 0.5,
        },
      }
    `);
  });

  test('generates layer with default values', () => {
    const options = {
      type: 'metric',
    } as LensApiState;

    const result = generateLayer('layer_0', options);

    expect(result).toMatchInlineSnapshot(`
      Object {
        "layer_0": Object {
          "columnOrder": Array [],
          "columns": Object {},
          "ignoreGlobalFilters": undefined,
          "sampling": undefined,
        },
      }
    `);
  });
});
