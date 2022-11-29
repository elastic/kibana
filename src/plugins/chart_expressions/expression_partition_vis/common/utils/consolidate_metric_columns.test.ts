/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Datatable } from '@kbn/expressions-plugin/common';
import { consolidateMetricColumns } from './consolidate_metric_columns';

describe('consolidateMetricColumns', () => {
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

    const result = consolidateMetricColumns(table, ['1', '2'], ['3', '4'], {
      3: 'metric1 label',
      4: 'metric2 label',
    });
    expect(result.bucketAccessors).toEqual(['1', '2', 'metric-name']);
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
            "id": "2",
            "meta": Object {
              "type": "string",
            },
            "name": "bucket2",
          },
          Object {
            "id": "metric-name",
            "meta": Object {
              "sourceParams": Object {
                "consolidatedMetricsColumn": true,
              },
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
            "2": "red",
            "metric-name": "metric1 label",
            "value": 1,
          },
          Object {
            "1": "square",
            "2": "red",
            "metric-name": "metric2 label",
            "value": 2,
          },
          Object {
            "1": "square",
            "2": "blue",
            "metric-name": "metric1 label",
            "value": 3,
          },
          Object {
            "1": "square",
            "2": "blue",
            "metric-name": "metric2 label",
            "value": 4,
          },
          Object {
            "1": "circle",
            "2": "red",
            "metric-name": "metric1 label",
            "value": 5,
          },
          Object {
            "1": "circle",
            "2": "red",
            "metric-name": "metric2 label",
            "value": 6,
          },
          Object {
            "1": "circle",
            "2": "blue",
            "metric-name": "metric1 label",
            "value": 7,
          },
          Object {
            "1": "circle",
            "2": "blue",
            "metric-name": "metric2 label",
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
    const result = consolidateMetricColumns(table, bucketAccessors, metricAccessors, {
      3: 'metric1',
    });

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

    const result = consolidateMetricColumns(table, undefined, ['3', '4'], {
      3: 'metric1',
      4: 'metric2',
    });
    expect(result.bucketAccessors).toEqual(['metric-name']);
    expect(result.metricAccessor).toEqual('value');
    expect(result.table).toMatchInlineSnapshot(`
      Object {
        "columns": Array [
          Object {
            "id": "metric-name",
            "meta": Object {
              "sourceParams": Object {
                "consolidatedMetricsColumn": true,
              },
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
