/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  getAdhocDataviews,
  buildDatasourceStates,
  buildReferences,
  getDatasetIndex,
  addLayerColumn,
  isFormulaDataset,
  mapToFormula,
} from './utils';
import type { DataView } from '@kbn/data-views-plugin/common';
import type {
  GenericIndexPatternColumn,
  PersistedIndexPatternLayer,
} from '@kbn/lens-plugin/public';

const dataView = {
  id: 'test-dataview',
  fields: {
    getByName: (name: string) => {
      switch (name) {
        case '@timestamp':
          return 'datetime';
        case 'category':
          return 'string';
        case 'price':
          return 'number';
        default:
          return 'string';
      }
    },
  },
  toSpec: () => ({}),
};

describe('isFormulaDataset', () => {
  test('isFormulaDataset returns true when dataset is based on index and timefield', () => {
    const result = isFormulaDataset({
      index: 'test',
      timeFieldName: 'test',
    });
    expect(result).toEqual(true);
  });

  test('isFormulaDataset returns false when dataset is not based on index and timefield', () => {
    const result = isFormulaDataset({
      esql: 'test',
    });
    expect(result).toEqual(false);

    const result2 = isFormulaDataset({
      type: 'datatable',
      columns: [],
      rows: [],
    });
    expect(result2).toEqual(false);
  });
});

test('build references correctly builds references', () => {
  const results = buildReferences({
    layer1: dataView as unknown as DataView,
    layer2: dataView as unknown as DataView,
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

test('getAdhocDataviews', () => {
  const results = getAdhocDataviews({
    layer1: dataView as unknown as DataView,
    layer2: dataView as unknown as DataView,
  });
  expect(results).toMatchInlineSnapshot(`
    Object {
      "test-dataview": Object {},
    }
  `);
});

describe('getDatasetIndex', () => {
  test('returns index if provided', () => {
    const result = getDatasetIndex({
      index: 'test',
      timeFieldName: '@timestamp',
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
      esql: 'from test_index | limit 10',
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
      type: 'datatable',
      columns: [],
      rows: [],
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
        title: 'test',
        layers: [
          {
            dataset: {
              esql: 'from test | limit 10',
            },
            yAxis: [{ label: 'test', value: 'test' }],
          },
        ],
      },
      {},
      () => undefined,
      () => [],
      {
        get: async () => ({ id: 'test' }),
      } as any
    );
    expect(results).toMatchInlineSnapshot(`
      Object {
        "textBased": Object {
          "layers": Object {
            "layer_0": Object {
              "allColumns": Array [],
              "columns": Array [],
              "index": "test",
              "query": Object {
                "esql": "from test | limit 10",
              },
            },
          },
        },
      }
    `);
  });
});

describe('mapToFormula', () => {
  test('map LensBaseLayer to FormulaConfigValue', () => {
    const formulaConfig = mapToFormula({
      label: 'iowait',
      value: 'average(system.cpu.iowait.pct) / max(system.cpu.cores)',
    });
    expect(formulaConfig).toMatchInlineSnapshot(`
      Object {
        "format": undefined,
        "formula": "average(system.cpu.iowait.pct) / max(system.cpu.cores)",
        "label": "iowait",
        "timeScale": undefined,
      }
    `);
  });
  test('map LensBaseLayer to FormulaConfigValue with format', () => {
    const formulaConfig = mapToFormula({
      label: 'iowait',
      value: 'average(system.cpu.iowait.pct) / max(system.cpu.cores)',
      format: 'percent',
      decimals: 1,
    });
    expect(formulaConfig).toMatchInlineSnapshot(`
      Object {
        "format": Object {
          "id": "percent",
          "params": Object {
            "decimals": 1,
          },
        },
        "formula": "average(system.cpu.iowait.pct) / max(system.cpu.cores)",
        "label": "iowait",
        "timeScale": undefined,
      }
    `);
  });
});
