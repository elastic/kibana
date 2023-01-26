/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getLensAttributes } from './get_lens_attributes';
import { AggregateQuery, Filter, FilterStateStore, Query } from '@kbn/es-query';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/public';
import { dataViewWithTimefieldMock } from '../__mocks__/data_view_with_timefield';

describe('getLensAttributes', () => {
  const dataView: DataView = dataViewWithTimefieldMock;
  const filters: Filter[] = [
    {
      meta: {
        index: dataView.id,
        negate: false,
        disabled: false,
        alias: null,
        type: 'phrase',
        key: 'extension',
        params: {
          query: 'js',
        },
      },
      query: {
        match: {
          extension: {
            query: 'js',
            type: 'phrase',
          },
        },
      },
      $state: {
        store: FilterStateStore.APP_STATE,
      },
    },
  ];
  const query: Query | AggregateQuery = { language: 'kuery', query: 'extension : css' };
  const timeInterval = 'auto';

  it('should return correct attributes', () => {
    const breakdownField: DataViewField | undefined = undefined;
    expect(
      getLensAttributes({ title: 'test', filters, query, dataView, timeInterval, breakdownField })
    ).toMatchInlineSnapshot(`
      Object {
        "references": Array [
          Object {
            "id": "index-pattern-with-timefield-id",
            "name": "indexpattern-datasource-current-indexpattern",
            "type": "index-pattern",
          },
          Object {
            "id": "index-pattern-with-timefield-id",
            "name": "indexpattern-datasource-layer-unifiedHistogram",
            "type": "index-pattern",
          },
        ],
        "state": Object {
          "datasourceStates": Object {
            "formBased": Object {
              "layers": Object {
                "unifiedHistogram": Object {
                  "columnOrder": Array [
                    "date_column",
                    "count_column",
                  ],
                  "columns": Object {
                    "count_column": Object {
                      "dataType": "number",
                      "isBucketed": false,
                      "label": "Count of records",
                      "operationType": "count",
                      "params": Object {
                        "format": Object {
                          "id": "number",
                          "params": Object {
                            "decimals": 0,
                          },
                        },
                      },
                      "scale": "ratio",
                      "sourceField": "___records___",
                    },
                    "date_column": Object {
                      "dataType": "date",
                      "isBucketed": true,
                      "label": "timestamp",
                      "operationType": "date_histogram",
                      "params": Object {
                        "interval": "auto",
                      },
                      "scale": "interval",
                      "sourceField": "timestamp",
                    },
                  },
                },
              },
            },
          },
          "filters": Array [
            Object {
              "$state": Object {
                "store": "appState",
              },
              "meta": Object {
                "alias": null,
                "disabled": false,
                "index": "index-pattern-with-timefield-id",
                "key": "extension",
                "negate": false,
                "params": Object {
                  "query": "js",
                },
                "type": "phrase",
              },
              "query": Object {
                "match": Object {
                  "extension": Object {
                    "query": "js",
                    "type": "phrase",
                  },
                },
              },
            },
          ],
          "query": Object {
            "language": "kuery",
            "query": "extension : css",
          },
          "visualization": Object {
            "axisTitlesVisibilitySettings": Object {
              "x": false,
              "yLeft": false,
              "yRight": false,
            },
            "fittingFunction": "None",
            "gridlinesVisibilitySettings": Object {
              "x": true,
              "yLeft": true,
              "yRight": false,
            },
            "layers": Array [
              Object {
                "accessors": Array [
                  "count_column",
                ],
                "layerId": "unifiedHistogram",
                "layerType": "data",
                "seriesType": "bar_stacked",
                "xAccessor": "date_column",
                "yConfig": Array [
                  Object {
                    "forAccessor": "count_column",
                  },
                ],
              },
            ],
            "legend": Object {
              "isVisible": true,
              "position": "right",
            },
            "preferredSeriesType": "bar_stacked",
            "showCurrentTimeMarker": true,
            "tickLabelsVisibilitySettings": Object {
              "x": true,
              "yLeft": true,
              "yRight": false,
            },
            "valueLabels": "hide",
          },
        },
        "title": "test",
        "visualizationType": "lnsXY",
      }
    `);
  });

  it('should return correct attributes with breakdown field', () => {
    const breakdownField: DataViewField | undefined = dataView.fields.find(
      (f) => f.name === 'extension'
    );
    expect(
      getLensAttributes({ title: 'test', filters, query, dataView, timeInterval, breakdownField })
    ).toMatchInlineSnapshot(`
      Object {
        "references": Array [
          Object {
            "id": "index-pattern-with-timefield-id",
            "name": "indexpattern-datasource-current-indexpattern",
            "type": "index-pattern",
          },
          Object {
            "id": "index-pattern-with-timefield-id",
            "name": "indexpattern-datasource-layer-unifiedHistogram",
            "type": "index-pattern",
          },
        ],
        "state": Object {
          "datasourceStates": Object {
            "formBased": Object {
              "layers": Object {
                "unifiedHistogram": Object {
                  "columnOrder": Array [
                    "breakdown_column",
                    "date_column",
                    "count_column",
                  ],
                  "columns": Object {
                    "breakdown_column": Object {
                      "dataType": "string",
                      "isBucketed": true,
                      "label": "Top 3 values of extension",
                      "operationType": "terms",
                      "params": Object {
                        "missingBucket": false,
                        "orderBy": Object {
                          "columnId": "count_column",
                          "type": "column",
                        },
                        "orderDirection": "desc",
                        "otherBucket": true,
                        "parentFormat": Object {
                          "id": "terms",
                        },
                        "size": 3,
                      },
                      "scale": "ordinal",
                      "sourceField": "extension",
                    },
                    "count_column": Object {
                      "dataType": "number",
                      "isBucketed": false,
                      "label": "Count of records",
                      "operationType": "count",
                      "params": Object {
                        "format": Object {
                          "id": "number",
                          "params": Object {
                            "decimals": 0,
                          },
                        },
                      },
                      "scale": "ratio",
                      "sourceField": "___records___",
                    },
                    "date_column": Object {
                      "dataType": "date",
                      "isBucketed": true,
                      "label": "timestamp",
                      "operationType": "date_histogram",
                      "params": Object {
                        "interval": "auto",
                      },
                      "scale": "interval",
                      "sourceField": "timestamp",
                    },
                  },
                },
              },
            },
          },
          "filters": Array [
            Object {
              "$state": Object {
                "store": "appState",
              },
              "meta": Object {
                "alias": null,
                "disabled": false,
                "index": "index-pattern-with-timefield-id",
                "key": "extension",
                "negate": false,
                "params": Object {
                  "query": "js",
                },
                "type": "phrase",
              },
              "query": Object {
                "match": Object {
                  "extension": Object {
                    "query": "js",
                    "type": "phrase",
                  },
                },
              },
            },
          ],
          "query": Object {
            "language": "kuery",
            "query": "extension : css",
          },
          "visualization": Object {
            "axisTitlesVisibilitySettings": Object {
              "x": false,
              "yLeft": false,
              "yRight": false,
            },
            "fittingFunction": "None",
            "gridlinesVisibilitySettings": Object {
              "x": true,
              "yLeft": true,
              "yRight": false,
            },
            "layers": Array [
              Object {
                "accessors": Array [
                  "count_column",
                ],
                "layerId": "unifiedHistogram",
                "layerType": "data",
                "seriesType": "bar_stacked",
                "splitAccessor": "breakdown_column",
                "xAccessor": "date_column",
              },
            ],
            "legend": Object {
              "isVisible": true,
              "position": "right",
            },
            "preferredSeriesType": "bar_stacked",
            "showCurrentTimeMarker": true,
            "tickLabelsVisibilitySettings": Object {
              "x": true,
              "yLeft": true,
              "yRight": false,
            },
            "valueLabels": "hide",
          },
        },
        "title": "test",
        "visualizationType": "lnsXY",
      }
    `);
  });

  it('should return correct attributes with unsupported breakdown field', () => {
    const breakdownField: DataViewField | undefined = dataView.fields.find(
      (f) => f.name === 'scripted'
    );
    expect(
      getLensAttributes({ title: 'test', filters, query, dataView, timeInterval, breakdownField })
    ).toMatchInlineSnapshot(`
      Object {
        "references": Array [
          Object {
            "id": "index-pattern-with-timefield-id",
            "name": "indexpattern-datasource-current-indexpattern",
            "type": "index-pattern",
          },
          Object {
            "id": "index-pattern-with-timefield-id",
            "name": "indexpattern-datasource-layer-unifiedHistogram",
            "type": "index-pattern",
          },
        ],
        "state": Object {
          "datasourceStates": Object {
            "formBased": Object {
              "layers": Object {
                "unifiedHistogram": Object {
                  "columnOrder": Array [
                    "date_column",
                    "count_column",
                  ],
                  "columns": Object {
                    "count_column": Object {
                      "dataType": "number",
                      "isBucketed": false,
                      "label": "Count of records",
                      "operationType": "count",
                      "params": Object {
                        "format": Object {
                          "id": "number",
                          "params": Object {
                            "decimals": 0,
                          },
                        },
                      },
                      "scale": "ratio",
                      "sourceField": "___records___",
                    },
                    "date_column": Object {
                      "dataType": "date",
                      "isBucketed": true,
                      "label": "timestamp",
                      "operationType": "date_histogram",
                      "params": Object {
                        "interval": "auto",
                      },
                      "scale": "interval",
                      "sourceField": "timestamp",
                    },
                  },
                },
              },
            },
          },
          "filters": Array [
            Object {
              "$state": Object {
                "store": "appState",
              },
              "meta": Object {
                "alias": null,
                "disabled": false,
                "index": "index-pattern-with-timefield-id",
                "key": "extension",
                "negate": false,
                "params": Object {
                  "query": "js",
                },
                "type": "phrase",
              },
              "query": Object {
                "match": Object {
                  "extension": Object {
                    "query": "js",
                    "type": "phrase",
                  },
                },
              },
            },
          ],
          "query": Object {
            "language": "kuery",
            "query": "extension : css",
          },
          "visualization": Object {
            "axisTitlesVisibilitySettings": Object {
              "x": false,
              "yLeft": false,
              "yRight": false,
            },
            "fittingFunction": "None",
            "gridlinesVisibilitySettings": Object {
              "x": true,
              "yLeft": true,
              "yRight": false,
            },
            "layers": Array [
              Object {
                "accessors": Array [
                  "count_column",
                ],
                "layerId": "unifiedHistogram",
                "layerType": "data",
                "seriesType": "bar_stacked",
                "xAccessor": "date_column",
                "yConfig": Array [
                  Object {
                    "forAccessor": "count_column",
                  },
                ],
              },
            ],
            "legend": Object {
              "isVisible": true,
              "position": "right",
            },
            "preferredSeriesType": "bar_stacked",
            "showCurrentTimeMarker": true,
            "tickLabelsVisibilitySettings": Object {
              "x": true,
              "yLeft": true,
              "yRight": false,
            },
            "valueLabels": "hide",
          },
        },
        "title": "test",
        "visualizationType": "lnsXY",
      }
    `);
  });
});
