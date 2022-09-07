/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { functionWrapper } from '@kbn/expressions-plugin/common/expression_functions/specs/tests/utils';
import {
  PieVisConfig,
  EmptySizeRatios,
  LabelPositions,
  ValueFormats,
  LegendDisplay,
} from '../types/expression_renderers';
import { ExpressionValueVisDimension, LegendSize } from '@kbn/visualizations-plugin/common';
import { Datatable } from '@kbn/expressions-plugin/common/expression_types/specs';
import { collapseMetrics, pieVisFunction } from './pie_vis_function';
import { PARTITION_LABELS_VALUE } from '../constants';
import { ExecutionContext } from '@kbn/expressions-plugin/common';

describe('interpreter/functions#pieVis', () => {
  const fn = functionWrapper(pieVisFunction());
  const context: Datatable = {
    type: 'datatable',
    rows: [{ 'col-0-1': 0 }],
    columns: [{ id: 'col-0-1', name: 'Count', meta: { type: 'number' } }],
  };

  const visConfig: PieVisConfig = {
    addTooltip: true,
    legendDisplay: LegendDisplay.SHOW,
    legendPosition: 'right',
    legendSize: LegendSize.SMALL,
    isDonut: true,
    emptySizeRatio: EmptySizeRatios.SMALL,
    nestedLegend: true,
    truncateLegend: true,
    maxLegendLines: 2,
    distinctColors: false,
    palette: {
      type: 'system_palette',
      name: 'kibana_palette',
    },
    labels: {
      type: PARTITION_LABELS_VALUE,
      show: false,
      values: true,
      position: LabelPositions.DEFAULT,
      valuesFormat: ValueFormats.PERCENT,
      percentDecimals: 2,
      truncate: 100,
      last_level: false,
    },
    metrics: [
      {
        type: 'vis_dimension',
        accessor: 0,
        format: {
          id: 'number',
          params: {},
        },
      },
    ],
    buckets: [
      {
        type: 'vis_dimension',
        accessor: 1,
        format: {
          id: 'number',
          params: {},
        },
      },
      {
        type: 'vis_dimension',
        accessor: 2,
        format: {
          id: 'number',
          params: {},
        },
      },
      {
        type: 'vis_dimension',
        accessor: 3,
        format: {
          id: 'number',
          params: {},
        },
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns an object with the correct structure for pie', async () => {
    const actual = await fn(context, { ...visConfig, isDonut: false });
    expect(actual).toMatchSnapshot();
  });

  it('returns an object with the correct structure for donut', async () => {
    const actual = await fn(context, visConfig);
    expect(actual).toMatchSnapshot();
  });

  it('throws error if provided split row and split column at once', async () => {
    const splitDimension: ExpressionValueVisDimension = {
      type: 'vis_dimension',
      accessor: 3,
      format: {
        id: 'number',
        params: {},
      },
    };

    expect(() =>
      fn(context, {
        ...visConfig,
        splitColumn: [splitDimension],
        splitRow: [splitDimension],
      })
    ).toThrowErrorMatchingSnapshot();
  });

  it.skip('logs correct datatable to inspector', async () => {
    let loggedTable: Datatable;
    const handlers = {
      inspectorAdapters: {
        tables: {
          logDatatable: (name: string, datatable: Datatable) => {
            loggedTable = datatable;
          },
          reset: () => {},
        },
      },
      getExecutionContext: jest.fn(),
    } as unknown as ExecutionContext;

    await fn(context, visConfig, handlers as any);

    expect(loggedTable!).toMatchSnapshot();
  });
});

describe('collapseMetrics', () => {
  it('collapses multiple metrics into a single metric column', () => {
    const table: Datatable = {
      type: 'datatable',
      columns: [
        {
          id: '1',
          name: 'bucket1',
          meta: {
            type: 'string',
          },
        },
        {
          id: '2',
          name: 'bucket2',
          meta: {
            type: 'string',
          },
        },
        {
          id: '3',
          name: 'metric1',
          meta: {
            type: 'number',
          },
        },
        {
          id: '4',
          name: 'metric2',
          meta: {
            type: 'number',
          },
        },
      ],
      rows: [
        { '1': 'square', '2': 'red', '3': 1, '4': 2 },
        { '1': 'square', '2': 'blue', '3': 3, '4': 4 },
        { '1': 'circle', '2': 'red', '3': 5, '4': 6 },
        { '1': 'circle', '2': 'blue', '3': 7, '4': 8 },
      ],
    };

    const result = collapseMetrics(table, ['1', '2'], ['3', '4']);
    expect(result.bucketAccessors).toEqual(['1', 'metric-name']);
    expect(result.metricAccessor).toEqual('value');
    expect(result.table).toMatchInlineSnapshot(`
      Object {
        "columns": Array [
          Object {
            "id": "1",
            "meta": Object {
              "type": "string",
            },
            "name": "bucket1",
          },
          Object {
            "id": "metric-name",
            "meta": Object {
              "type": "string",
            },
            "name": "metric-name",
          },
          Object {
            "id": "value",
            "meta": Object {
              "type": "number",
            },
            "name": "value",
          },
        ],
        "rows": Array [
          Object {
            "1": "square",
            "metric-name": "red - metric1",
            "value": 1,
          },
          Object {
            "1": "square",
            "metric-name": "red - metric2",
            "value": 2,
          },
          Object {
            "1": "square",
            "metric-name": "blue - metric1",
            "value": 3,
          },
          Object {
            "1": "square",
            "metric-name": "blue - metric2",
            "value": 4,
          },
          Object {
            "1": "circle",
            "metric-name": "red - metric1",
            "value": 5,
          },
          Object {
            "1": "circle",
            "metric-name": "red - metric2",
            "value": 6,
          },
          Object {
            "1": "circle",
            "metric-name": "blue - metric1",
            "value": 7,
          },
          Object {
            "1": "circle",
            "metric-name": "blue - metric2",
            "value": 8,
          },
        ],
        "type": "datatable",
      }
    `);
  });

  it('leaves single metric tables alone', () => {
    const table: Datatable = {
      type: 'datatable',
      columns: [
        {
          id: '1',
          name: 'bucket1',
          meta: {
            type: 'string',
          },
        },
        {
          id: '2',
          name: 'bucket2',
          meta: {
            type: 'string',
          },
        },
        {
          id: '3',
          name: 'metric1',
          meta: {
            type: 'number',
          },
        },
      ],
      rows: [
        { '1': 'square', '2': 'red', '3': 1 },
        { '1': 'square', '2': 'blue', '3': 3 },
        { '1': 'circle', '2': 'red', '3': 5 },
        { '1': 'circle', '2': 'blue', '3': 7 },
      ],
    };

    const bucketAccessors = ['1', '2'];
    const metricAccessors = ['3'];
    const result = collapseMetrics(table, bucketAccessors, metricAccessors);

    expect(result.table).toEqual(table);
    expect(result.bucketAccessors).toEqual(bucketAccessors);
    expect(result.metricAccessor).toEqual(metricAccessors[0]);
  });

  it('does not blow up when there are no bucket accessors', () => {
    const table: Datatable = {
      type: 'datatable',
      columns: [
        {
          id: '3',
          name: 'metric1',
          meta: {
            type: 'number',
          },
        },
        {
          id: '4',
          name: 'metric2',
          meta: {
            type: 'number',
          },
        },
      ],
      rows: [
        { '3': 1, '4': 2 },
        { '3': 3, '4': 4 },
        { '3': 5, '4': 6 },
        { '3': 7, '4': 8 },
      ],
    };

    const result = collapseMetrics(table, undefined, ['3', '4']);
    expect(result.bucketAccessors).toEqual(['metric-name']);
    expect(result.metricAccessor).toEqual('value');
    expect(result.table).toMatchInlineSnapshot(`
      Object {
        "columns": Array [
          Object {
            "id": "metric-name",
            "meta": Object {
              "type": "string",
            },
            "name": "metric-name",
          },
          Object {
            "id": "value",
            "meta": Object {
              "type": "number",
            },
            "name": "value",
          },
        ],
        "rows": Array [
          Object {
            "metric-name": "metric1",
            "value": 1,
          },
          Object {
            "metric-name": "metric2",
            "value": 2,
          },
          Object {
            "metric-name": "metric1",
            "value": 3,
          },
          Object {
            "metric-name": "metric2",
            "value": 4,
          },
          Object {
            "metric-name": "metric1",
            "value": 5,
          },
          Object {
            "metric-name": "metric2",
            "value": 6,
          },
          Object {
            "metric-name": "metric1",
            "value": 7,
          },
          Object {
            "metric-name": "metric2",
            "value": 8,
          },
        ],
        "type": "datatable",
      }
    `);
  });
});
