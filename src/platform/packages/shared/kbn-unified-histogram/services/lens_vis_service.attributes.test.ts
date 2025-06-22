/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AggregateQuery, Filter, FilterStateStore, Query } from '@kbn/es-query';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/public';
import {
  dataViewWithTimefieldMock,
  dataViewWithAtTimefieldMock,
} from '../__mocks__/data_view_with_timefield';
import { currentSuggestionMock } from '../__mocks__/suggestions';
import { getLensVisMock } from '../__mocks__/lens_vis';

describe('LensVisService attributes', () => {
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
  const queryEsql: Query | AggregateQuery = { esql: 'from logstash-* | limit 10' };
  const timeInterval = 'auto';

  it('should return correct attributes', async () => {
    const breakdownField: DataViewField | undefined = undefined;
    const lensVis = await getLensVisMock({
      filters,
      query,
      dataView,
      timeInterval,
      breakdownField,
      columns: [],
      isPlainRecord: false,
    });

    expect(lensVis.visContext).toMatchInlineSnapshot(`
      Object {
        "attributes": Object {
          "references": Array [
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
                    "indexPatternId": "index-pattern-with-timefield-id",
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
                "legendSize": "xlarge",
                "position": "right",
                "shouldTruncate": false,
              },
              "minBarHeight": 2,
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
          "title": "Edit visualization",
          "visualizationType": "lnsXY",
        },
        "requestData": Object {
          "breakdownField": undefined,
          "dataViewId": "index-pattern-with-timefield-id",
          "timeField": "timestamp",
          "timeInterval": "auto",
        },
        "suggestionType": "histogramForDataView",
      }
    `);
  });

  it('should return correct attributes with breakdown field', async () => {
    const breakdownField: DataViewField | undefined = dataView.fields.find(
      (f) => f.name === 'extension'
    );
    const lensVis = await getLensVisMock({
      filters,
      query,
      dataView,
      timeInterval,
      breakdownField,
      columns: [],
      isPlainRecord: false,
    });
    expect(lensVis.visContext).toMatchInlineSnapshot(`
      Object {
        "attributes": Object {
          "references": Array [
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
                          "missingBucket": true,
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
                    "indexPatternId": "index-pattern-with-timefield-id",
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
                "legendSize": "xlarge",
                "position": "right",
                "shouldTruncate": false,
              },
              "minBarHeight": 2,
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
          "title": "Edit visualization",
          "visualizationType": "lnsXY",
        },
        "requestData": Object {
          "breakdownField": "extension",
          "dataViewId": "index-pattern-with-timefield-id",
          "timeField": "timestamp",
          "timeInterval": "auto",
        },
        "suggestionType": "histogramForDataView",
      }
    `);
  });

  it('should return correct attributes with unsupported breakdown field', async () => {
    const breakdownField: DataViewField | undefined = dataView.fields.find(
      (f) => f.name === 'scripted'
    );
    const lensVis = await getLensVisMock({
      filters,
      query,
      dataView,
      timeInterval,
      breakdownField,
      columns: [],
      isPlainRecord: false,
    });
    expect(lensVis.visContext).toMatchInlineSnapshot(`
      Object {
        "attributes": Object {
          "references": Array [
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
                    "indexPatternId": "index-pattern-with-timefield-id",
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
                "legendSize": "xlarge",
                "position": "right",
                "shouldTruncate": false,
              },
              "minBarHeight": 2,
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
          "title": "Edit visualization",
          "visualizationType": "lnsXY",
        },
        "requestData": Object {
          "breakdownField": "scripted",
          "dataViewId": "index-pattern-with-timefield-id",
          "timeField": "timestamp",
          "timeInterval": "auto",
        },
        "suggestionType": "histogramForDataView",
      }
    `);
  });

  it('should return correct attributes for text based languages', async () => {
    const lensVis = await getLensVisMock({
      filters,
      query: queryEsql,
      dataView,
      timeInterval,
      breakdownField: undefined,
      columns: [],
      isPlainRecord: true,
    });
    expect(lensVis.visContext).toMatchInlineSnapshot(`
      Object {
        "attributes": Object {
          "references": Array [],
          "state": Object {
            "datasourceStates": Object {
              "textBased": Object {
                "indexPatternRefs": Array [],
                "initialContext": Object {
                  "contextualFields": Array [
                    "Dest",
                    "AvgTicketPrice",
                  ],
                  "dataViewSpec": Object {
                    "allowNoIndex": false,
                    "fields": Object {
                      "AvgTicketPrice": Object {
                        "aggregatable": true,
                        "count": 0,
                        "esTypes": Array [
                          "float",
                        ],
                        "format": Object {
                          "id": "number",
                          "params": Object {
                            "pattern": "$0,0.[00]",
                          },
                        },
                        "isMapped": true,
                        "name": "AvgTicketPrice",
                        "readFromDocValues": true,
                        "scripted": false,
                        "searchable": true,
                        "shortDotsEnable": false,
                        "type": "number",
                      },
                      "Dest": Object {
                        "aggregatable": true,
                        "count": 0,
                        "esTypes": Array [
                          "keyword",
                        ],
                        "format": Object {
                          "id": "string",
                        },
                        "isMapped": true,
                        "name": "Dest",
                        "readFromDocValues": true,
                        "scripted": false,
                        "searchable": true,
                        "shortDotsEnable": false,
                        "type": "string",
                      },
                      "timestamp": Object {
                        "aggregatable": true,
                        "count": 0,
                        "esTypes": Array [
                          "date",
                        ],
                        "format": Object {
                          "id": "date",
                        },
                        "isMapped": true,
                        "name": "timestamp",
                        "readFromDocValues": true,
                        "scripted": false,
                        "searchable": true,
                        "shortDotsEnable": false,
                        "type": "date",
                      },
                    },
                    "id": "d3d7af60-4c81-11e8-b3d7-01146121b73d",
                    "name": "Kibana Sample Data Flights",
                    "sourceFilters": Array [],
                    "timeFieldName": "timestamp",
                    "title": "kibana_sample_data_flights",
                    "version": "WzM1ODA3LDFd",
                  },
                  "fieldName": "",
                  "query": Object {
                    "esql": "FROM \\"kibana_sample_data_flights\\"",
                  },
                },
                "layers": Object {
                  "46aa21fa-b747-4543-bf90-0b40007c546d": Object {
                    "columns": Array [
                      Object {
                        "columnId": "81e332d6-ee37-42a8-a646-cea4fc75d2d3",
                        "fieldName": "Dest",
                        "meta": Object {
                          "type": "string",
                        },
                      },
                      Object {
                        "columnId": "5b9b8b76-0836-4a12-b9c0-980c9900502f",
                        "fieldName": "AvgTicketPrice",
                        "meta": Object {
                          "type": "number",
                        },
                      },
                    ],
                    "index": "d3d7af60-4c81-11e8-b3d7-01146121b73d",
                    "query": Object {
                      "esql": "FROM kibana_sample_data_flights | keep Dest, AvgTicketPrice",
                    },
                    "timeField": "timestamp",
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
              "esql": "from logstash-* | limit 10
      | EVAL timestamp=DATE_TRUNC(10 minute, timestamp) | stats results = count(*) by timestamp",
            },
            "visualization": Object {
              "gridConfig": Object {
                "isCellLabelVisible": false,
                "isXAxisLabelVisible": true,
                "isXAxisTitleVisible": false,
                "isYAxisLabelVisible": true,
                "isYAxisTitleVisible": false,
                "type": "heatmap_grid",
              },
              "layerId": "46aa21fa-b747-4543-bf90-0b40007c546d",
              "layerType": "data",
              "legend": Object {
                "isVisible": true,
                "position": "right",
                "type": "heatmap_legend",
              },
              "shape": "heatmap",
              "valueAccessor": "5b9b8b76-0836-4a12-b9c0-980c9900502f",
              "xAccessor": "81e332d6-ee37-42a8-a646-cea4fc75d2d3",
            },
          },
          "title": "Heat map",
          "visualizationType": "lnsHeatmap",
        },
        "requestData": Object {
          "breakdownField": undefined,
          "dataViewId": "index-pattern-with-timefield-id",
          "timeField": "timestamp",
          "timeInterval": undefined,
        },
        "suggestionType": "histogramForESQL",
      }
    `);
  });

  it('should return correct attributes for text based languages with adhoc dataview', async () => {
    const adHocDataview = {
      ...dataView,
      isPersisted: () => false,
    } as DataView;
    const lensVis = await getLensVisMock({
      filters,
      query: queryEsql,
      dataView: adHocDataview,
      timeInterval,
      breakdownField: undefined,
      columns: [],
      isPlainRecord: true,
    });
    expect(lensVis.visContext?.attributes).toEqual({
      state: expect.objectContaining({
        adHocDataViews: {
          'index-pattern-with-timefield-id': {},
        },
      }),
      references: [],
      title: 'Heat map',
      visualizationType: 'lnsHeatmap',
    });
  });

  it('should return suggestion title', async () => {
    const lensVis = await getLensVisMock({
      filters,
      query: queryEsql,
      dataView,
      timeInterval,
      breakdownField: undefined,
      columns: [],
      isPlainRecord: true,
    });
    expect(lensVis.visContext?.attributes.title).toBe(currentSuggestionMock.title);
  });

  it('should use the correct histogram query when no suggestion passed', async () => {
    const histogramQuery = {
      esql: `from logstash-* | limit 10
| EVAL timestamp=DATE_TRUNC(10 minute, @timestamp) | stats results = count(*) by timestamp`,
    };
    const lensVis = await getLensVisMock({
      filters,
      query: queryEsql,
      dataView: dataViewWithAtTimefieldMock,
      timeInterval,
      breakdownField: undefined,
      columns: [],
      isPlainRecord: true,
      allSuggestions: [], // none available
      isTransformationalESQL: false,
    });
    expect(lensVis.visContext?.attributes.state.query).toStrictEqual(histogramQuery);
  });
});
