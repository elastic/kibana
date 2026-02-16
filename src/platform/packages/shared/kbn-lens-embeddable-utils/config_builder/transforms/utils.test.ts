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
  filtersAndQueryToLensState,
  filtersAndQueryToApiFormat,
} from './utils';
import type {
  GenericIndexPatternColumn,
  PersistedIndexPatternLayer,
  FormBasedLayer,
  ReferenceBasedIndexPatternColumn,
} from '@kbn/lens-common';
import type { TextBasedLayer } from '@kbn/lens-common';
import type { LensApiState, MetricState } from '../schema';
import type { AggregateQuery, Filter, Query } from '@kbn/es-query';
import type { LensAttributes } from '../types';
import type { LensApiFilterType } from '../schema/filter';

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
        "timeFieldName": undefined,
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

  test('adds column with reference column', () => {
    const layer: PersistedIndexPatternLayer = {
      columns: {},
      columnOrder: [],
    };

    const parentColumn: ReferenceBasedIndexPatternColumn = {
      operationType: 'counter_rate',
      label: 'Counter rate',
      dataType: 'number',
      isBucketed: false,
      references: [],
    };

    const referenceColumn: GenericIndexPatternColumn = {
      operationType: 'max',
      sourceField: 'bytes',
      label: 'Max of bytes',
      dataType: 'number',
      isBucketed: false,
    };

    addLayerColumn(layer, 'metric', [parentColumn, referenceColumn]);

    expect(layer.columns.metric).toBeDefined();
    expect(layer.columns.metric_reference).toBeDefined();
    expect(layer.columns.metric).toHaveProperty('references', ['metric_reference']);
    expect(layer.columnOrder).toEqual(['metric', 'metric_reference']);
  });

  test('adds reference column to the beginning when first=true', () => {
    const layer: PersistedIndexPatternLayer = {
      columns: {},
      columnOrder: ['existing'],
    };

    const parentColumn: ReferenceBasedIndexPatternColumn = {
      operationType: 'cumulative_sum',
      label: 'Cumulative sum',
      dataType: 'number',
      isBucketed: false,
      references: [],
    };

    const referenceColumn: GenericIndexPatternColumn = {
      operationType: 'sum',
      sourceField: 'sales',
      label: 'Sum of sales',
      dataType: 'number',
      isBucketed: false,
    };

    addLayerColumn(layer, 'metric', [parentColumn, referenceColumn], true);

    expect(layer.columns.metric).toBeDefined();
    expect(layer.columns.metric_reference).toBeDefined();
    expect(layer.columns.metric).toHaveProperty('references', ['metric_reference']);
    expect(layer.columnOrder).toEqual(['metric_reference', 'metric', 'existing']);
  });

  test('adds column with postfix and reference', () => {
    const layer: PersistedIndexPatternLayer = {
      columns: {},
      columnOrder: [],
    };

    const parentColumn: ReferenceBasedIndexPatternColumn = {
      operationType: 'moving_average',
      label: 'Moving average',
      dataType: 'number',
      isBucketed: false,
      references: [],
    };

    const referenceColumn: GenericIndexPatternColumn = {
      operationType: 'sum',
      sourceField: 'count',
      label: 'Sum of count',
      dataType: 'number',
      isBucketed: false,
    };

    addLayerColumn(layer, 'metric', [parentColumn, referenceColumn], false, '_trendline');

    expect(layer.columns.metric_trendline).toBeDefined();
    expect(layer.columns.metric_trendline_reference).toBeDefined();
    expect(layer.columns.metric_trendline).toHaveProperty('references', [
      'metric_trendline_reference',
    ]);
    expect(layer.columnOrder).toEqual(['metric_trendline', 'metric_trendline_reference']);
  });
});

describe('buildDatasourceStates', () => {
  test('correctly builds esql layer', async () => {
    const results = buildDatasourceStates(
      {
        type: 'metric',
        title: 'test',
        dataset: {
          type: 'esql',
          query: 'from test | limit 10',
        },
        metrics: [
          {
            type: 'primary',
            operation: 'value',
            label: 'test',
            column: 'test',
            fit: false,
            alignments: { labels: 'left', value: 'left' },
          },
        ],
        sampling: 1,
        ignore_global_filters: false,
      },
      undefined as any,
      () => [{ columnId: 'test', fieldName: 'test' }]
    );
    expect(results).toMatchInlineSnapshot(`
      Object {
        "layers": Object {
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
                "timeField": undefined,
              },
            },
          },
        },
        "usedDataviews": Object {
          "layer_0": Object {
            "index": "test",
            "timeFieldName": undefined,
            "type": "adHocDataView",
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

    const result = buildDatasetState(
      textBasedLayer,
      'layer_0',
      {},
      [],
      [
        {
          type: 'index-pattern',
          id: 'my-index',
          name: 'indexpattern-datasource-layer-layer_0',
        },
      ]
    );
    expect(result).toMatchInlineSnapshot(`
      Object {
        "query": "from my-index | limit 10",
        "type": "esql",
      }
    `);
  });

  test('builds dataView dataset state', () => {
    const formBasedLayer = {
      indexPatternId: 'my-dataview-id',
      columns: {},
      columnOrder: [],
    } as FormBasedLayer;

    const result = buildDatasetState(formBasedLayer, 'layer_0', {}, [], []);
    expect(result).toMatchInlineSnapshot(`
      Object {
        "id": "my-dataview-id",
        "type": "dataView",
      }
    `);
  });

  test('builds index dataset state', () => {
    const formBasedLayer = {
      indexPatternId: 'my-adhoc-dataview-id',
      columns: {},
      columnOrder: [],
    } as FormBasedLayer;

    const result = buildDatasetState(
      formBasedLayer,
      'layer_1',
      {
        'my-adhoc-dataview-id': {
          index: 'test-id',
          title: 'my-adhoc-dataview-id',
          timeFieldName: '@timestamp',
        },
      } as Record<string, unknown>,
      [],
      [
        {
          type: 'index-pattern',
          id: 'my-adhoc-dataview-id',
          name: 'indexpattern-datasource-layer-layer_1',
        },
      ]
    );
    expect(result).toMatchInlineSnapshot(`
      Object {
        "index": "my-adhoc-dataview-id",
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
    } as MetricState;

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
    } as MetricState;

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

describe('filtersAndQueryToLensState', () => {
  test('converts API filters and query to Lens state format', () => {
    const apiState: LensApiState = {
      type: 'metric',
      title: 'test metric',
      dataset: {
        type: 'esql',
        query: 'from test | limit 10',
      },
      metrics: [
        {
          type: 'primary',
          operation: 'value',
          label: 'test',
          column: 'test',
          fit: false,
          alignments: { labels: 'left', value: 'left' },
        },
      ],
      sampling: 1,
      ignore_global_filters: false,
      filters: [
        { language: 'kuery', query: 'category: "shoes"' },
        { language: 'lucene', query: 'price > 100' },
      ] as LensApiFilterType[],
    };

    const result = filtersAndQueryToLensState(apiState);

    expect(result.query).toEqual({ esql: 'from test | limit 10' });
    expect(result.filters).toHaveLength(2);
    for (const [index, filter] of Object.entries(result.filters ?? [])) {
      expect(filter).toEqual({ meta: {}, ...apiState.filters?.[index as unknown as number] });
    }
  });

  test('handles missing filters and query gracefully', () => {
    const apiState: LensApiState = {
      type: 'metric',
      title: 'test metric',
      dataset: {
        type: 'esql',
        query: 'from test | limit 10',
      },
      metrics: [
        {
          type: 'primary',
          operation: 'value',
          label: 'test',
          column: 'test',
          fit: false,
          alignments: { labels: 'left', value: 'left' },
        },
      ],
      sampling: 1,
      ignore_global_filters: false,
    };

    const result = filtersAndQueryToLensState(apiState);

    expect(result.query).toEqual({ esql: 'from test | limit 10' });
  });
});

describe('filtersAndQueryToApiFormat', () => {
  test('converts Lens state filters and query to API format', () => {
    const lensState: LensAttributes = {
      state: {
        filters: [
          {
            query: { language: 'kuery', query: 'category: "electronics"' },
            meta: { disabled: false },
          },
          {
            query: { language: 'lucene', query: 'price:[100 TO *]' },
            meta: { negate: true },
          },
        ] as Filter[],
        query: { language: 'kuery', query: 'brand: "apple"' } as Query,
      },
    } as LensAttributes;

    const result = filtersAndQueryToApiFormat(lensState);

    expect(result).toMatchInlineSnapshot(`
      Object {
        "filters": Array [
          Object {
            "language": "kuery",
            "query": "category: \\"electronics\\"",
          },
          Object {
            "language": "lucene",
            "query": "price:[100 TO *]",
          },
        ],
        "query": Object {
          "language": "kuery",
          "query": "brand: \\"apple\\"",
        },
      }
    `);
  });

  test('handles non-string query gracefully', () => {
    const lensState = {
      state: {
        filters: [] as Filter[],
        query: { language: 'kuery', query: { bool: { must: [] } } } as Query,
      },
    } as LensAttributes;

    const result = filtersAndQueryToApiFormat(lensState);

    expect(result).toEqual({});
  });

  test('should not include filters if empty and query if ES|QL', () => {
    const lensState = {
      state: { filters: [] as Filter[], query: { esql: 'FROM ...' } as AggregateQuery },
    } as LensAttributes;

    const result = filtersAndQueryToApiFormat(lensState);

    expect(result).toEqual({});
  });
});
