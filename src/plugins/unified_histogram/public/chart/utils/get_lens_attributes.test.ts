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
import { dataViewWithTimefieldMock } from '../../__mocks__/data_view_with_timefield';
import { currentSuggestionMock } from '../../__mocks__/suggestions';

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
      getLensAttributes({
        title: 'test',
        filters,
        query,
        dataView,
        timeInterval,
        breakdownField,
        suggestion: undefined,
      })
    ).toMatchInlineSnapshot(`
      Object {
        "attributes": Object {
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
          "title": "test",
          "visualizationType": "lnsXY",
        },
        "requestData": Object {
          "breakdownField": undefined,
          "dataViewId": "index-pattern-with-timefield-id",
          "timeField": "timestamp",
          "timeInterval": "auto",
        },
      }
    `);
  });

  it('should return correct attributes with breakdown field', () => {
    const breakdownField: DataViewField | undefined = dataView.fields.find(
      (f) => f.name === 'extension'
    );
    expect(
      getLensAttributes({
        title: 'test',
        filters,
        query,
        dataView,
        timeInterval,
        breakdownField,
        suggestion: undefined,
      })
    ).toMatchInlineSnapshot(`
      Object {
        "attributes": Object {
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
          "title": "test",
          "visualizationType": "lnsXY",
        },
        "requestData": Object {
          "breakdownField": "extension",
          "dataViewId": "index-pattern-with-timefield-id",
          "timeField": "timestamp",
          "timeInterval": "auto",
        },
      }
    `);
  });

  it('should return correct attributes with unsupported breakdown field', () => {
    const breakdownField: DataViewField | undefined = dataView.fields.find(
      (f) => f.name === 'scripted'
    );
    expect(
      getLensAttributes({
        title: 'test',
        filters,
        query,
        dataView,
        timeInterval,
        breakdownField,
        suggestion: undefined,
      })
    ).toMatchInlineSnapshot(`
      Object {
        "attributes": Object {
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
          "title": "test",
          "visualizationType": "lnsXY",
        },
        "requestData": Object {
          "breakdownField": "scripted",
          "dataViewId": "index-pattern-with-timefield-id",
          "timeField": "timestamp",
          "timeInterval": "auto",
        },
      }
    `);
  });

  it('should return correct attributes for text based languages', () => {
    expect(
      getLensAttributes({
        title: 'test',
        filters,
        query,
        dataView,
        timeInterval,
        breakdownField: undefined,
        suggestion: currentSuggestionMock,
      })
    ).toMatchInlineSnapshot(`
      Object {
        "attributes": Object {
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
              "language": "kuery",
              "query": "extension : css",
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
          "title": "test",
          "visualizationType": "lnsHeatmap",
        },
        "requestData": Object {
          "breakdownField": undefined,
          "dataViewId": "index-pattern-with-timefield-id",
          "timeField": "timestamp",
          "timeInterval": "auto",
        },
      }
    `);
  });

  it('should return correct attributes for text based languages with adhoc dataview', () => {
    const adHocDataview = {
      ...dataView,
      isPersisted: () => false,
    } as DataView;
    const lensAttrs = getLensAttributes({
      title: 'test',
      filters,
      query,
      dataView: adHocDataview,
      timeInterval,
      breakdownField: undefined,
      suggestion: currentSuggestionMock,
    });
    expect(lensAttrs.attributes).toEqual({
      state: expect.objectContaining({
        adHocDataViews: {
          'index-pattern-with-timefield-id': {},
        },
      }),
      references: [
        {
          id: 'index-pattern-with-timefield-id',
          name: 'indexpattern-datasource-current-indexpattern',
          type: 'index-pattern',
        },
        {
          id: 'index-pattern-with-timefield-id',
          name: 'indexpattern-datasource-layer-unifiedHistogram',
          type: 'index-pattern',
        },
      ],
      title: 'test',
      visualizationType: 'lnsHeatmap',
    });
  });

  it('should return suggestion title if no title is given', () => {
    expect(
      getLensAttributes({
        title: undefined,
        filters,
        query,
        dataView,
        timeInterval,
        breakdownField: undefined,
        suggestion: currentSuggestionMock,
      }).attributes.title
    ).toBe(currentSuggestionMock.title);
  });
});
