/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildTagCloud } from './tag_cloud';
import { mockDataViewsService } from './mock_utils';

test('generates tag cloud chart config', async () => {
  const result = await buildTagCloud(
    {
      chartType: 'tagcloud',
      title: 'test',
      dataset: {
        esql: 'from test | count=count() by category',
      },
      value: 'count',
      breakdown: 'category',
    },
    {
      dataViewsAPI: mockDataViewsService() as any,
    }
  );
  expect(result).toMatchInlineSnapshot(`
    Object {
      "references": Array [
        Object {
          "id": "test",
          "name": "indexpattern-datasource-layer-layer_0",
          "type": "index-pattern",
        },
      ],
      "state": Object {
        "adHocDataViews": Object {
          "test": Object {},
        },
        "datasourceStates": Object {
          "textBased": Object {
            "layers": Object {
              "layer_0": Object {
                "allColumns": Array [
                  Object {
                    "columnId": "metric_formula_accessor",
                    "fieldName": "count",
                  },
                  Object {
                    "columnId": "metric_formula_accessor_breakdown",
                    "fieldName": "category",
                  },
                ],
                "columns": Array [
                  Object {
                    "columnId": "metric_formula_accessor",
                    "fieldName": "count",
                  },
                  Object {
                    "columnId": "metric_formula_accessor_breakdown",
                    "fieldName": "category",
                  },
                ],
                "index": "test",
                "query": Object {
                  "esql": "from test | count=count() by category",
                },
                "timeField": undefined,
              },
            },
          },
        },
        "filters": Array [],
        "internalReferences": Array [],
        "query": Object {
          "language": "kuery",
          "query": "",
        },
        "visualization": Object {
          "layerId": "layer_0",
          "maxFontSize": 72,
          "minFontSize": 12,
          "orientation": "single",
          "showLabel": true,
          "tagAccessor": "metric_formula_accessor_breakdown",
          "valueAccessor": "metric_formula_accessor",
        },
      },
      "title": "test",
      "visualizationType": "lnsTagcloud",
    }
  `);
});
