/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EsqlSource,
  registerEsqlSourceInDataViewsCache,
  unregisterFromDataViewsCache,
} from '@kbn/data-source';
import { cloneDeep } from 'lodash';
import { getRepresentativeQuery, withLegacyAggregateQuerySlot } from '@kbn/lens-common';
import type { XYPersistedState } from '@kbn/lens-common';
import {
  isLensLegacyAttributes,
  LensConfigBuilder,
  lensApiConfigSchema,
} from '@kbn/lens-embeddable-utils';
import type { AggregateQuery, Filter, Query } from '@kbn/es-query';
import { FilterStateStore } from '@kbn/es-query';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/public';
import {
  dataViewWithTimefieldMock,
  dataViewWithAtTimefieldMock,
} from '../__mocks__/data_view_with_timefield';
import { buildDataViewMock } from '../__mocks__/data_view';
import { currentSuggestionMock, allSuggestionsMock } from '../__mocks__/suggestions';
import { getDefaultDataSource, getLensVisMock } from '../__mocks__/lens_vis';
import { UnifiedHistogramExternalVisContextStatus, UnifiedHistogramSuggestionType } from '../types';

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
          "version": 3,
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
                        "label": "Top 9 values of extension",
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
                          "size": 9,
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
                  "splitAccessors": Array [
                    "breakdown_column",
                  ],
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
          "version": 3,
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
          "version": 3,
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
          "version": 3,
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
    });
    expect(lensVis.visContext?.attributes).toEqual({
      state: expect.objectContaining({
        adHocDataViews: {
          'index-pattern-with-timefield-id': {},
        },
      }),
      version: 3,
      references: [],
      title: 'Heat map',
      visualizationType: 'lnsHeatmap',
    });
  });

  it('should allow modifying attributes with getModifiedVisAttributes', async () => {
    const lensVis = await getLensVisMock({
      filters,
      query,
      dataView,
      timeInterval,
      breakdownField: undefined,
      columns: [],
      getModifiedVisAttributes: (attributes) => ({
        ...attributes,
        title: 'Modified title',
        visualizationType: 'lnsHeatmap',
      }),
    });
    expect(lensVis.visContext?.attributes).toEqual(
      expect.objectContaining({
        title: 'Modified title',
        visualizationType: 'lnsHeatmap',
      })
    );
  });

  it('should not allow modifying attributes with getModifiedVisAttributes if externalVisContext is applied', async () => {
    const lensVis = await getLensVisMock({
      filters,
      query,
      dataView,
      timeInterval,
      breakdownField: undefined,
      columns: [],
    });
    const lensVis2 = await getLensVisMock({
      filters,
      query,
      dataView,
      timeInterval,
      breakdownField: undefined,
      columns: [],
      externalVisContext: lensVis.visContext,
      getModifiedVisAttributes: (attributes) => ({
        ...attributes,
        title: 'Modified title',
        visualizationType: 'lnsHeatmap',
      }),
    });
    expect(lensVis2.visContext?.attributes).not.toEqual(
      expect.objectContaining({
        title: 'Modified title',
        visualizationType: 'lnsHeatmap',
      })
    );
  });

  it('should return suggestion title', async () => {
    const lensVis = await getLensVisMock({
      filters,
      query: queryEsql,
      dataView,
      timeInterval,
      breakdownField: undefined,
      columns: [],
    });
    expect(lensVis.visContext?.attributes.title).toBe(currentSuggestionMock.title);
  });

  it('fingerprints an ES|QL chart with its data view, not with the per-query source id', async () => {
    const esqlSource = await EsqlSource.create({
      query: queryEsql.esql,
      resultColumns: [],
      timeFieldName: '@timestamp',
    });
    const dataViews = {
      create: jest.fn(async ({ id }: { id: string }) => ({ ...dataViewWithAtTimefieldMock, id })),
      clearInstanceCache: jest.fn(),
    } as unknown as Parameters<typeof registerEsqlSourceInDataViewsCache>[0];
    const chartDataView = await registerEsqlSourceInDataViewsCache(dataViews, esqlSource);

    const { visContext } = await getLensVisMock({
      filters: [],
      query: queryEsql,
      dataView: dataViewWithAtTimefieldMock,
      dataSource: esqlSource,
      timeInterval,
      breakdownField: undefined,
      columns: [],
      allSuggestions: [],
    });

    expect(chartDataView.id).not.toBe(esqlSource.id);
    expect(visContext?.requestData.dataViewId).toBe(chartDataView.id);
  });

  it.each(['layer query', 'legacy dual-written query'])(
    'should reuse an unchanged ES|QL histogram with %s',
    async (queryFormat) => {
      const timeRange = {
        from: '2022-11-17T00:00:00.000Z',
        to: '2022-11-17T12:00:00.000Z',
      };
      const { lensService, visContext } = await getLensVisMock({
        filters: [],
        query: queryEsql,
        dataView: dataViewWithAtTimefieldMock,
        timeInterval,
        timeRange,
        breakdownField: undefined,
        columns: [],
        allSuggestions: [],
      });

      expect(visContext?.suggestionType).toBe(UnifiedHistogramSuggestionType.histogramForESQL);
      expect(visContext?.attributes.state.query).toBeUndefined();
      expect(getRepresentativeQuery(visContext?.attributes)).toStrictEqual({
        esql: `from logstash-* | limit 10
| STATS results = COUNT(*) BY timestamp = BUCKET(@timestamp, 5 minute)
| LIMIT 10000`,
      });
      expect(visContext?.requestData).toStrictEqual({
        dataViewId: dataViewWithAtTimefieldMock.id,
        timeField: '@timestamp',
        timeInterval: undefined,
        breakdownField: undefined,
      });

      if (!visContext) {
        throw new Error('Expected an ES|QL histogram');
      }
      const savedVisContext = cloneDeep(visContext);
      if (queryFormat === 'legacy dual-written query') {
        savedVisContext.attributes = withLegacyAggregateQuerySlot(savedVisContext.attributes);
      }
      const onVisContextChanged = jest.fn();
      lensService.update({
        queryParams: {
          dataSource: await getDefaultDataSource({
            query: queryEsql,
            dataView: dataViewWithAtTimefieldMock,
            columns: [],
          }),
          query: queryEsql,
          filters: [],
          timeRange,
          columns: [],
        },
        timeInterval,
        breakdownField: undefined,
        externalVisContext: savedVisContext,
        onVisContextChanged,
      });

      expect(onVisContextChanged).toHaveBeenCalledWith(
        savedVisContext,
        UnifiedHistogramExternalVisContextStatus.applied
      );
      expect(lensService.state$.getValue().visContext?.attributes).toStrictEqual(
        savedVisContext.attributes
      );
    }
  );

  it.each([
    {
      name: 'reuses an ES|QL histogram with an empty fingerprint',
      requestData: {},
      shouldApply: true,
    },
    {
      name: 'reuses an ES|QL histogram with a different data view ID',
      requestData: { dataViewId: 'previous-chart-data-view', timeField: '@timestamp' },
      shouldApply: true,
    },
    {
      name: 'reuses an ES|QL histogram without a data view ID',
      requestData: { timeField: '@timestamp' },
      shouldApply: true,
    },
    {
      name: 'reuses an ES|QL histogram despite a stale time field in its fingerprint',
      requestData: { dataViewId: dataViewWithAtTimefieldMock.id, timeField: 'event.ingested' },
      shouldApply: true,
    },
    {
      name: 'reuses an ES|QL histogram despite a stale breakdown in its fingerprint',
      requestData: { timeField: '@timestamp', breakdownField: 'extension' },
      shouldApply: true,
    },
    {
      name: 'overrides an ES|QL histogram when the query changes despite ignoring the ID',
      requestData: { timeField: '@timestamp' },
      nextQuery: { esql: 'from other-index | limit 10' },
    },
    {
      name: 'overrides a classic histogram with a different data view ID',
      requestData: {
        dataViewId: 'previous-chart-data-view',
        timeField: '@timestamp',
        timeInterval,
      },
      currentQuery: query,
    },
  ])(
    '$name',
    async ({
      requestData,
      shouldApply = false,
      currentQuery = queryEsql,
      nextQuery = currentQuery,
    }) => {
      const params = {
        filters: [],
        query: currentQuery,
        dataView: dataViewWithAtTimefieldMock,
        timeInterval,
        breakdownField: undefined,
        columns: [],
        allSuggestions: [],
      };
      const { lensService, visContext } = await getLensVisMock(params);
      if (!visContext) {
        throw new Error('Expected an ES|QL histogram');
      }
      const savedVisContext = cloneDeep(visContext);
      const onVisContextChanged = jest.fn();
      const updateParams = {
        queryParams: {
          dataSource: await getDefaultDataSource({
            query: currentQuery,
            dataView: dataViewWithAtTimefieldMock,
            columns: [],
          }),
          query: currentQuery,
          filters: [],
          timeRange: { from: '2022-11-17T00:00:00.000Z', to: '2022-11-17T12:00:00.000Z' },
          columns: [],
        },
        timeInterval,
        breakdownField: undefined,
        onVisContextChanged,
      };
      lensService.update({ ...updateParams, externalVisContext: savedVisContext });
      expect(onVisContextChanged).toHaveBeenLastCalledWith(
        savedVisContext,
        UnifiedHistogramExternalVisContextStatus.applied
      );

      const externalVisContext = { ...savedVisContext, requestData };
      const originalExternalVisContext = cloneDeep(externalVisContext);
      lensService.update({
        ...updateParams,
        queryParams: {
          ...updateParams.queryParams,
          dataSource: await getDefaultDataSource({
            query: nextQuery,
            dataView: dataViewWithAtTimefieldMock,
            columns: [],
          }),
          query: nextQuery,
        },
        externalVisContext,
      });
      expect(onVisContextChanged).toHaveBeenLastCalledWith(
        expect.objectContaining({
          requestData: shouldApply ? requestData : visContext.requestData,
        }),
        shouldApply
          ? UnifiedHistogramExternalVisContextStatus.applied
          : UnifiedHistogramExternalVisContextStatus.automaticallyOverridden
      );
      if (shouldApply) {
        expect(lensService.state$.getValue().visContext?.attributes).toStrictEqual(
          savedVisContext.attributes
        );
      }
      expect(externalVisContext).toStrictEqual(originalExternalVisContext);
      expect(savedVisContext).toStrictEqual(visContext);
    }
  );

  it.each([
    { name: 'time field', timeFieldName: 'event.ingested', breakdownField: undefined },
    {
      name: 'breakdown',
      timeFieldName: '@timestamp',
      breakdownField: dataView.fields.find((field) => field.name === 'extension'),
    },
  ])(
    'regenerates the ES|QL histogram when the current $name changes',
    async ({ timeFieldName, breakdownField }) => {
      const timeRange = {
        from: '2022-11-17T00:00:00.000Z',
        to: '2022-11-17T12:00:00.000Z',
      };
      const { lensService, visContext } = await getLensVisMock({
        filters: [],
        query: queryEsql,
        dataView: dataViewWithAtTimefieldMock,
        timeInterval,
        timeRange,
        breakdownField: undefined,
        columns: [],
        allSuggestions: [],
      });
      if (!visContext) {
        throw new Error('Expected an ES|QL histogram');
      }
      const currentDataView = buildDataViewMock({
        name: dataViewWithAtTimefieldMock.name,
        fields: dataViewWithAtTimefieldMock.fields,
        timeFieldName,
      });
      const currentColumns = [
        { id: 'extension', name: 'extension', meta: { type: 'string' as const } },
      ];
      const onVisContextChanged = jest.fn();
      lensService.update({
        queryParams: {
          dataSource: await getDefaultDataSource({
            query: queryEsql,
            dataView: currentDataView,
            columns: currentColumns,
          }),
          query: queryEsql,
          filters: [],
          timeRange,
          columns: currentColumns,
        },
        timeInterval,
        breakdownField,
        externalVisContext: visContext,
        onVisContextChanged,
      });
      expect(onVisContextChanged).toHaveBeenCalledWith(
        expect.objectContaining({
          requestData: expect.objectContaining({
            timeField: timeFieldName,
            breakdownField: breakdownField?.name,
          }),
        }),
        UnifiedHistogramExternalVisContextStatus.automaticallyOverridden
      );
      expect(
        getRepresentativeQuery(lensService.state$.getValue().visContext?.attributes)
      ).not.toEqual(getRepresentativeQuery(visContext.attributes));
    }
  );

  it.each([
    {
      name: 'missing',
      savedTimeField: undefined,
      currentTimeField: '@timestamp',
      shouldApply: true,
    },
    {
      name: 'matching',
      savedTimeField: '@timestamp',
      currentTimeField: '@timestamp',
      shouldApply: true,
    },
    {
      name: 'changed',
      savedTimeField: '@timestamp',
      currentTimeField: 'event.ingested',
      shouldApply: false,
    },
    {
      name: 'removed',
      savedTimeField: '@timestamp',
      currentTimeField: undefined,
      shouldApply: false,
    },
  ])(
    'checks an explicit layer time field for an aggregated ES|QL chart ($name)',
    async ({ savedTimeField, currentTimeField, shouldApply }) => {
      const aggregateQuery = { esql: 'FROM logstash-* | STATS count = COUNT(*) BY host' };
      const builder = new LensConfigBuilder(undefined, true);
      const attributes = builder.fromAPIFormat(
        lensApiConfigSchema.parse({
          type: 'xy',
          title: 'Count by host',
          layers: [
            {
              type: 'bar',
              data_source: { type: 'esql', query: aggregateQuery.esql },
              x: { column: 'host' },
              y: [{ column: 'count' }],
            },
          ],
        })
      );
      const datasourceState = attributes.state.datasourceStates.textBased;
      if (!datasourceState) {
        throw new Error('Expected an ES|QL datasource');
      }
      for (const layer of Object.values(datasourceState.layers)) {
        layer.timeField = savedTimeField;
      }
      const suggestion = {
        ...currentSuggestionMock,
        title: attributes.title,
        visualizationId: attributes.visualizationType,
        visualizationState: attributes.state.visualization,
        datasourceState,
      };
      const columns = [
        { id: 'host', name: 'host', meta: { type: 'string' as const } },
        { id: 'count', name: 'count', meta: { type: 'number' as const } },
      ];
      const { lensService, visContext } = await getLensVisMock({
        filters: [],
        query: aggregateQuery,
        dataView: dataViewWithAtTimefieldMock,
        timeInterval,
        breakdownField: undefined,
        columns,
        allSuggestions: [suggestion],
      });
      if (!visContext) {
        throw new Error('Expected an aggregated ES|QL chart');
      }
      expect(visContext.suggestionType).toBe(UnifiedHistogramSuggestionType.lensSuggestion);
      const savedVisContext = cloneDeep(visContext);
      const currentDataView = buildDataViewMock({
        name: dataViewWithAtTimefieldMock.name,
        fields: dataViewWithAtTimefieldMock.fields,
        timeFieldName: currentTimeField,
      });
      suggestion.datasourceState = cloneDeep(datasourceState);
      for (const layer of Object.values(suggestion.datasourceState.layers)) {
        layer.timeField = currentTimeField;
      }
      const onVisContextChanged = jest.fn();
      lensService.update({
        queryParams: {
          dataSource: await getDefaultDataSource({
            query: aggregateQuery,
            dataView: currentDataView,
            columns,
          }),
          query: aggregateQuery,
          filters: [],
          columns,
          columnsMap: Object.fromEntries(columns.map((column) => [column.name, column])),
        },
        timeInterval,
        breakdownField: undefined,
        externalVisContext: savedVisContext,
        onVisContextChanged,
      });
      expect(onVisContextChanged).toHaveBeenCalledWith(
        expect.any(Object),
        shouldApply
          ? UnifiedHistogramExternalVisContextStatus.applied
          : UnifiedHistogramExternalVisContextStatus.automaticallyOverridden
      );
      const restored = lensService.state$.getValue().visContext;
      if (shouldApply) {
        const expectedVisContext = cloneDeep(savedVisContext);
        for (const layer of Object.values(
          expectedVisContext.attributes.state.datasourceStates.textBased?.layers ?? {}
        )) {
          layer.timeField = currentTimeField;
        }
        expect(restored).toStrictEqual(expectedVisContext);
      } else {
        expect(
          Object.values(restored?.attributes.state.datasourceStates.textBased?.layers ?? {}).map(
            (layer) => layer.timeField
          )
        ).toEqual([currentTimeField]);
      }
      expect(savedVisContext).toStrictEqual(visContext);
    }
  );

  it('reuses an ES|QL histogram after a Lens as-code round trip', async () => {
    const timeRange = {
      from: '2022-11-17T00:00:00.000Z',
      to: '2022-11-17T12:00:00.000Z',
    };
    const { lensService, visContext } = await getLensVisMock({
      filters: [],
      query: queryEsql,
      dataView: dataViewWithAtTimefieldMock,
      timeInterval,
      timeRange,
      breakdownField: undefined,
      columns: [],
      allSuggestions: [],
    });
    if (!visContext || !isLensLegacyAttributes(visContext.attributes)) {
      throw new Error('Expected Lens attributes for an ES|QL histogram');
    }
    const savedAttributes = cloneDeep(visContext.attributes);
    if (savedAttributes.visualizationType !== 'lnsXY') {
      throw new Error('Expected an XY histogram');
    }
    const visualization = savedAttributes.state.visualization as XYPersistedState;
    visualization.preferredSeriesType = 'line';
    visualization.layers = visualization.layers.map((layer) =>
      layer.layerType === 'data' ? { ...layer, seriesType: 'line', xAccessor: 'timestamp' } : layer
    );
    const builder = new LensConfigBuilder(undefined, true);
    const apiConfig = builder.toAPIFormat(savedAttributes);
    const attributes = builder.fromAPIFormat(apiConfig);

    expect(attributes.state.visualization).toMatchObject({
      preferredSeriesType: 'line',
      layers: [{ seriesType: 'line' }],
    });
    expect(getRepresentativeQuery(attributes)).toStrictEqual(
      getRepresentativeQuery(visContext.attributes)
    );
    expect(builder.toAPIFormat(attributes)).toStrictEqual(apiConfig);
    const layers = Object.values(attributes.state.datasourceStates.textBased?.layers ?? {});
    expect(layers).toHaveLength(1);
    expect(layers[0].timeField).toBeUndefined();

    const restoredVisContext = {
      suggestionType: visContext.suggestionType,
      attributes,
      requestData: { timeField: layers[0].timeField },
    };
    const onVisContextChanged = jest.fn();
    lensService.update({
      queryParams: {
        dataSource: await getDefaultDataSource({
          query: queryEsql,
          dataView: dataViewWithAtTimefieldMock,
          columns: [],
        }),
        query: queryEsql,
        filters: [],
        timeRange,
        columns: [],
      },
      timeInterval,
      breakdownField: undefined,
      externalVisContext: restoredVisContext,
      onVisContextChanged,
    });
    const expectedVisContext = cloneDeep(restoredVisContext);
    for (const layer of Object.values(
      expectedVisContext.attributes.state.datasourceStates.textBased?.layers ?? {}
    )) {
      layer.timeField = '@timestamp';
    }
    expect(onVisContextChanged).toHaveBeenCalledWith(
      expectedVisContext,
      UnifiedHistogramExternalVisContextStatus.applied
    );
  });

  it('keeps an ES|QL chart edit after the source data view is unregistered', async () => {
    const timeRange = {
      from: '2022-11-17T00:00:00.000Z',
      to: '2022-11-17T12:00:00.000Z',
    };
    const dataSource = await getDefaultDataSource({
      query: queryEsql,
      dataView: dataViewWithAtTimefieldMock,
      columns: [],
    });
    const { lensService, currentSuggestionContext } = await getLensVisMock({
      filters: [],
      query: queryEsql,
      dataView: dataViewWithAtTimefieldMock,
      dataSource,
      timeInterval,
      timeRange,
      breakdownField: undefined,
      columns: [],
      allSuggestions: [],
    });
    const onVisContextChanged = jest.fn();
    lensService.update({
      queryParams: { dataSource, query: queryEsql, filters: [], timeRange, columns: [] },
      timeInterval,
      breakdownField: undefined,
      externalVisContext: undefined,
      onVisContextChanged,
    });
    onVisContextChanged.mockClear();

    // Discover unregisters the previous source's shim as soon as the query changes,
    // while the edit flyout can still be open on the chart built from that source.
    unregisterFromDataViewsCache(dataSource.id);
    lensService.onSuggestionEdited({ editedSuggestionContext: currentSuggestionContext });

    expect(onVisContextChanged).toHaveBeenCalledTimes(1);
    expect(onVisContextChanged).toHaveBeenCalledWith(
      expect.objectContaining({
        suggestionType: UnifiedHistogramSuggestionType.histogramForESQL,
        requestData: expect.objectContaining({ dataViewId: dataViewWithAtTimefieldMock.id }),
      }),
      UnifiedHistogramExternalVisContextStatus.manuallyCustomized
    );
  });

  it.each([
    { shape: 'bar', donutHole: undefined, visualization: { preferredSeriesType: 'bar' } },
    { shape: 'pie', donutHole: 'none', visualization: { shape: 'pie' } },
    { shape: 'donut', donutHole: 'm', visualization: { shape: 'donut' } },
  ])(
    'reuses an aggregated ES|QL $shape chart after a Lens as-code round trip',
    async ({ shape, donutHole, visualization }) => {
      const aggregateQuery = { esql: 'FROM logstash-* | STATS count = COUNT(*) BY host' };
      const dataSource = { type: 'esql', query: aggregateQuery.esql };
      const builder = new LensConfigBuilder(undefined, true);
      const originalAttributes = builder.fromAPIFormat(
        lensApiConfigSchema.parse(
          shape === 'bar'
            ? {
                type: 'xy',
                layers: [
                  {
                    type: 'bar',
                    data_source: dataSource,
                    x: { column: 'host' },
                    y: [{ column: 'count' }],
                  },
                ],
              }
            : {
                type: 'pie',
                data_source: dataSource,
                metrics: [{ column: 'count' }],
                group_by: [{ column: 'host' }],
                styling: { donut_hole: donutHole },
              }
        )
      );
      const apiConfig = builder.toAPIFormat(originalAttributes);
      const attributes = builder.fromAPIFormat(apiConfig);
      expect(builder.toAPIFormat(attributes)).toStrictEqual(apiConfig);
      expect(attributes.state.visualization).toMatchObject(visualization);
      expect(getRepresentativeQuery(attributes)).toStrictEqual(aggregateQuery);
      const datasourceState = attributes.state.datasourceStates.textBased;
      if (!datasourceState) {
        throw new Error('Expected an ES|QL datasource');
      }
      const layers = Object.values(datasourceState.layers);
      expect(layers).toHaveLength(1);
      expect(layers[0].timeField).toBeUndefined();
      expect(layers[0].columns.map((column) => column.fieldName).sort()).toEqual(['count', 'host']);

      const columns = [
        { id: 'host', name: 'host', meta: { type: 'string' as const } },
        { id: 'count', name: 'count', meta: { type: 'number' as const } },
      ];
      const { lensService } = await getLensVisMock({
        filters: [],
        query: aggregateQuery,
        dataView: dataViewWithAtTimefieldMock,
        timeInterval,
        breakdownField: undefined,
        columns,
        allSuggestions: [
          {
            ...currentSuggestionMock,
            title: attributes.title,
            visualizationId: attributes.visualizationType,
            visualizationState: attributes.state.visualization,
            datasourceState,
          },
        ],
      });
      const externalVisContext = {
        suggestionType: UnifiedHistogramSuggestionType.lensSuggestion,
        attributes,
        requestData: {},
      };
      const onVisContextChanged = jest.fn();
      lensService.update({
        queryParams: {
          dataSource: await getDefaultDataSource({
            query: aggregateQuery,
            dataView: dataViewWithAtTimefieldMock,
            columns,
          }),
          query: aggregateQuery,
          filters: [],
          columns,
          columnsMap: Object.fromEntries(columns.map((column) => [column.name, column])),
        },
        timeInterval,
        breakdownField: undefined,
        externalVisContext,
        onVisContextChanged,
      });
      const expectedVisContext = cloneDeep(externalVisContext);
      for (const layer of Object.values(
        expectedVisContext.attributes.state.datasourceStates.textBased?.layers ?? {}
      )) {
        layer.timeField = '@timestamp';
      }
      expect(onVisContextChanged).toHaveBeenCalledWith(
        expectedVisContext,
        UnifiedHistogramExternalVisContextStatus.applied
      );
    }
  );

  it('should use the correct histogram query when no suggestion passed', async () => {
    const histogramQuery = {
      esql: `from logstash-* | limit 10
| STATS results = COUNT(*) BY timestamp = BUCKET(@timestamp, 5 minute)
| LIMIT 10000`,
    };
    const lensVis = await getLensVisMock({
      filters,
      query: queryEsql,
      dataView: dataViewWithAtTimefieldMock,
      timeInterval,
      breakdownField: undefined,
      columns: [],
      allSuggestions: [], // none available
      isTransformationalESQL: false,
    });
    expect(getRepresentativeQuery(lensVis.visContext?.attributes)).toStrictEqual(histogramQuery);
  });

  it('should inject table with approximationApplied:true into Lens layers for ES|QL STATS query', async () => {
    const queryStats = { esql: 'from logstash-* | stats maxB = max(bytes)' };
    const columns = [{ id: 'maxB', name: 'maxB', meta: { type: 'number' as const } }];
    const table = {
      type: 'datatable' as const,
      rows: [{ maxB: 100 }],
      columns,
      meta: { type: 'es_ql' as const, approximationApplied: true },
    };

    const lensVis = await getLensVisMock({
      filters,
      query: queryStats,
      dataView,
      timeInterval,
      breakdownField: undefined,
      columns,
      allSuggestions: allSuggestionsMock.map((suggestion) => ({
        ...suggestion,
        datasourceState: { layers: { main: { columns: [], query: queryStats } } },
      })),
      table,
    });

    expect(lensVis.currentSuggestionContext?.type).toBe(
      UnifiedHistogramSuggestionType.lensSuggestion
    );

    const layers = lensVis.visContext?.attributes.state.datasourceStates.textBased?.layers ?? {};
    const layerValues = Object.values(layers);
    expect(layerValues.length).toBeGreaterThan(0);
    for (const layer of layerValues) {
      expect((layer as { table?: typeof table }).table?.meta?.approximationApplied).toBe(true);
    }
  });

  it('should inject table with approximationApplied:false into Lens layers for ES|QL STATS query', async () => {
    const queryStats = { esql: 'from logstash-* | stats maxB = max(bytes)' };
    const columns = [{ id: 'maxB', name: 'maxB', meta: { type: 'number' as const } }];
    const table = {
      type: 'datatable' as const,
      rows: [{ maxB: 100 }],
      columns,
      meta: { type: 'es_ql' as const, approximationApplied: false },
    };

    const lensVis = await getLensVisMock({
      filters,
      query: queryStats,
      dataView,
      timeInterval,
      breakdownField: undefined,
      columns,
      allSuggestions: allSuggestionsMock.map((suggestion) => ({
        ...suggestion,
        datasourceState: { layers: { main: { columns: [], query: queryStats } } },
      })),
      table,
    });

    const layers = lensVis.visContext?.attributes.state.datasourceStates.textBased?.layers ?? {};
    const layerValues = Object.values(layers);
    expect(layerValues.length).toBeGreaterThan(0);
    for (const layer of layerValues) {
      expect((layer as { table?: typeof table }).table?.meta?.approximationApplied).toBe(false);
    }
  });

  it('should not inject table into Lens layers when table is not provided', async () => {
    const queryStats = { esql: 'from logstash-* | stats maxB = max(bytes)' };
    const columns = [{ id: 'maxB', name: 'maxB', meta: { type: 'number' as const } }];

    const lensVis = await getLensVisMock({
      filters,
      query: queryStats,
      dataView,
      timeInterval,
      breakdownField: undefined,
      columns,
      allSuggestions: allSuggestionsMock,
      table: undefined,
    });

    const layers = lensVis.visContext?.attributes.state.datasourceStates.textBased?.layers ?? {};
    const layerValues = Object.values(layers);
    for (const layer of layerValues) {
      expect((layer as { table?: unknown }).table).toBeUndefined();
    }
  });
});
