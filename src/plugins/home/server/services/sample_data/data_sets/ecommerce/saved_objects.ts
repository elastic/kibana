/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/* eslint max-len: 0 */

import { i18n } from '@kbn/i18n';
import { SavedObject } from '@kbn/core/server';

export const getSavedObjects = (): SavedObject[] => [
  {
    attributes: {
      fieldAttrs:
        '{"products.manufacturer":{"count":1},"products.price":{"count":1},"products.product_name":{"count":1},"total_quantity":{"count":1}}',
      fieldFormatMap:
        '{"taxful_total_price":{"id":"number","params":{"pattern":"$0,0.[00]"}},"products.price":{"id":"number","params":{"pattern":"$0,0.00"}},"taxless_total_price":{"id":"number","params":{"pattern":"$0,0.00"}},"products.taxless_price":{"id":"number","params":{"pattern":"$0,0.00"}},"products.taxful_price":{"id":"number","params":{"pattern":"$0,0.00"}},"products.min_price":{"id":"number","params":{"pattern":"$0,0.00"}},"products.base_unit_price":{"id":"number","params":{"pattern":"$0,0.00"}},"products.base_price":{"id":"number","params":{"pattern":"$0,0.00"}}}',
      fields: '[]',
      runtimeFieldMap: '{}',
      timeFieldName: 'order_date',
      title: 'kibana_sample_data_ecommerce',
      name: 'Kibana Sample Data eCommerce',
      typeMeta: '{}',
    },
    coreMigrationVersion: '8.0.0',
    id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
    migrationVersion: {
      'index-pattern': '7.11.0',
    },
    references: [],
    type: 'index-pattern',
    updated_at: '2021-08-05T12:23:57.577Z',
    version: 'WzI1LDFd',
  },
  {
    attributes: {
      description: '',
      kibanaSavedObjectMeta: {
        searchSourceJSON: '{"query":{"query":"","language":"kuery"},"filter":[]}',
      },
      title: i18n.translate('home.sampleData.ecommerceSpec.promotionTrackingTitle', {
        defaultMessage: '[eCommerce] Promotion Tracking',
      }),
      uiStateJSON: '{}',
      version: 1,
      visState:
        '{"title":"[eCommerce] Promotion Tracking","type":"metrics","aggs":[],"params":{"time_range_mode":"entire_time_range","id":"61ca57f0-469d-11e7-af02-69e470af7417","type":"timeseries","series":[{"id":"ea20ae70-b88d-11e8-a451-f37365e9f268","color":"rgba(211,96,134,1)","split_mode":"everything","metrics":[{"id":"ea20ae71-b88d-11e8-a451-f37365e9f268","type":"sum","field":"taxful_total_price"}],"separate_axis":0,"axis_position":"right","formatter":"number","chart_type":"line","line_width":"2","point_size":"5","fill":"0","stacked":"none","filter":{"query":"products.product_name:*trouser*","language":"lucene"},"label":"Revenue Trousers","value_template":"${{value}}","split_color_mode":"gradient"},{"id":"062d77b0-b88e-11e8-a451-f37365e9f268","color":"rgba(84,179,153,1)","split_mode":"everything","metrics":[{"id":"062d77b1-b88e-11e8-a451-f37365e9f268","type":"sum","field":"taxful_total_price"}],"separate_axis":0,"axis_position":"right","formatter":"number","chart_type":"line","line_width":"2","point_size":"05","fill":"0","stacked":"none","filter":{"query":"products.product_name:*watch*","language":"lucene"},"label":"Revenue Watches","value_template":"${{value}}","split_color_mode":"gradient"},{"id":"61ca57f1-469d-11e7-af02-69e470af7417","color":"rgba(96,146,192,1)","split_mode":"everything","metrics":[{"id":"61ca57f2-469d-11e7-af02-69e470af7417","type":"sum","field":"taxful_total_price"}],"separate_axis":0,"axis_position":"right","formatter":"number","chart_type":"line","line_width":"2","point_size":"5","fill":"0","stacked":"none","filter":{"query":"products.product_name:*bag*","language":"lucene"},"label":"Revenue Bags","value_template":"${{value}}","split_color_mode":"gradient"},{"id":"faa2c170-b88d-11e8-a451-f37365e9f268","color":"rgba(202,142,174,1)","split_mode":"everything","metrics":[{"id":"faa2c171-b88d-11e8-a451-f37365e9f268","type":"sum","field":"taxful_total_price"}],"separate_axis":0,"axis_position":"right","formatter":"number","chart_type":"line","line_width":"2","point_size":"5","fill":"0","stacked":"none","filter":{"query":"products.product_name:*cocktail dress*","language":"lucene"},"label":"Revenue Cocktail Dresses","value_template":"${{value}}","split_color_mode":"gradient"}],"time_field":"order_date","interval":"12h","use_kibana_indexes":true,"axis_position":"left","axis_formatter":"number","axis_scale":"normal","show_legend":1,"show_grid":1,"legend_position":"bottom","annotations":[{"fields":"taxful_total_price","template":"Ring the bell! ${{taxful_total_price}}","query_string":{"query":"taxful_total_price:>250","language":"lucene"},"id":"c8c30be0-b88f-11e8-a451-f37365e9f268","color":"rgba(25,77,51,1)","time_field":"order_date","icon":"fa-bell","ignore_global_filters":1,"ignore_panel_filters":1,"index_pattern_ref_name":"metrics_1_index_pattern"}],"tooltip_mode":"show_all","drop_last_bucket":0,"isModelInvalid":false,"index_pattern_ref_name":"metrics_0_index_pattern"}}',
    },
    coreMigrationVersion: '8.0.0',
    id: '45e07720-b890-11e8-a6d9-e546fe2bba5f',
    migrationVersion: {
      visualization: '7.14.0',
    },
    references: [
      {
        id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
        name: 'metrics_0_index_pattern',
        type: 'index-pattern',
      },
      {
        id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
        name: 'metrics_1_index_pattern',
        type: 'index-pattern',
      },
    ],
    type: 'visualization',
    updated_at: '2021-08-05T12:23:57.577Z',
    version: 'WzIxLDFd',
  },
  {
    attributes: {
      description: '',
      kibanaSavedObjectMeta: {
        searchSourceJSON: '{"query":{"query":"","language":"kuery"},"filter":[]}',
      },
      title: i18n.translate('home.sampleData.ecommerceSpec.soldProductsPerDayTitle', {
        defaultMessage: '[eCommerce] Sold Products per Day',
      }),
      uiStateJSON: '{}',
      version: 1,
      visState:
        '{"title":"[eCommerce] Sold Products per Day","type":"metrics","aggs":[],"params":{"time_range_mode":"entire_time_range","id":"61ca57f0-469d-11e7-af02-69e470af7417","type":"gauge","series":[{"id":"61ca57f1-469d-11e7-af02-69e470af7417","color":"#68BC00","split_mode":"everything","metrics":[{"id":"61ca57f2-469d-11e7-af02-69e470af7417","type":"count"},{"id":"fd1e1b90-e4e3-11eb-8234-cb7bfd534fce","type":"math","variables":[{"id":"00374270-e4e4-11eb-8234-cb7bfd534fce","name":"c","field":"61ca57f2-469d-11e7-af02-69e470af7417"}],"script":"params.c / (params._interval / 1000 / 60 / 60 / 24)"}],"separate_axis":0,"axis_position":"right","formatter":"0.0","chart_type":"line","line_width":1,"point_size":1,"fill":0.5,"stacked":"none","label":"Trxns / day","split_color_mode":"gradient","value_template":""}],"time_field":"order_date","interval":"1d","axis_position":"left","axis_formatter":"number","axis_scale":"normal","show_legend":1,"show_grid":1,"gauge_color_rules":[{"value":150,"id":"6da070c0-b891-11e8-b645-195edeb9de84","gauge":"rgba(104,188,0,1)","operator":"gte"},{"value":150,"id":"9b0cdbc0-b891-11e8-b645-195edeb9de84","gauge":"rgba(244,78,59,1)","operator":"lt"}],"gauge_width":"15","gauge_inner_width":"10","gauge_style":"half","filter":"","gauge_max":"300","use_kibana_indexes":true,"hide_last_value_indicator":true,"tooltip_mode":"show_all","drop_last_bucket":0,"isModelInvalid":false,"index_pattern_ref_name":"metrics_0_index_pattern"}}',
    },
    coreMigrationVersion: '8.0.0',
    id: 'b80e6540-b891-11e8-a6d9-e546fe2bba5f',
    migrationVersion: {
      visualization: '7.14.0',
    },
    references: [
      {
        id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
        name: 'metrics_0_index_pattern',
        type: 'index-pattern',
      },
    ],
    type: 'visualization',
    updated_at: '2021-08-05T12:23:57.577Z',
    version: 'WzIyLDFd',
  },
  {
    attributes: {
      columns: [
        'category',
        'taxful_total_price',
        'products.price',
        'products.product_name',
        'products.manufacturer',
        'sku',
      ],
      description: '',
      hits: 0,
      kibanaSavedObjectMeta: {
        searchSourceJSON:
          '{"highlightAll":true,"version":true,"query":{"query":"","language":"kuery"},"filter":[],"indexRefName":"kibanaSavedObjectMeta.searchSourceJSON.index"}',
      },
      sort: [['order_date', 'desc']],
      title: i18n.translate('home.sampleData.ecommerceSpec.ordersTitle', {
        defaultMessage: '[eCommerce] Orders',
      }),
      version: 1,
    },
    coreMigrationVersion: '8.0.0',
    id: '3ba638e0-b894-11e8-a6d9-e546fe2bba5f',
    migrationVersion: {
      search: '7.9.3',
    },
    references: [
      {
        id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
        name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
        type: 'index-pattern',
      },
    ],
    type: 'search',
    updated_at: '2021-08-05T12:23:57.577Z',
    version: 'WzIzLDFd',
  },
  {
    id: '9c6f83f0-bb4d-11e8-9c84-77068524bcab',
    type: 'visualization',
    updated_at: '2021-10-28T15:07:24.077Z',
    version: '1',
    coreMigrationVersion: '8.0.0',
    migrationVersion: { visualization: '8.0.0' },
    attributes: {
      title: i18n.translate('home.sampleData.ecommerceSpec.salesCountMapTitle', {
        defaultMessage: '[eCommerce] Sales Count Map',
      }),
      visState:
        '{"title":"[eCommerce] Sales Count Map","type":"vega","aggs":[],"params":{"spec":"{\\n  $schema: https://vega.github.io/schema/vega/v5.json\\n  config: {\\n    kibana: {type: \\"map\\", latitude: 25, longitude: -40, zoom: 3}\\n  }\\n  data: [\\n    {\\n      name: table\\n      url: {\\n        index: kibana_sample_data_ecommerce\\n        %context%: true\\n        %timefield%: order_date\\n        body: {\\n          size: 0\\n          aggs: {\\n            gridSplit: {\\n              geotile_grid: {field: \\"geoip.location\\", precision: 4, size: 10000}\\n              aggs: {\\n                gridCentroid: {\\n                  geo_centroid: {\\n                    field: \\"geoip.location\\"\\n                  }\\n                }\\n              }\\n            }\\n          }\\n        }\\n      }\\n      format: {property: \\"aggregations.gridSplit.buckets\\"}\\n      transform: [\\n        {\\n          type: geopoint\\n          projection: projection\\n          fields: [\\n            gridCentroid.location.lon\\n            gridCentroid.location.lat\\n          ]\\n        }\\n      ]\\n    }\\n  ]\\n  scales: [\\n    {\\n      name: gridSize\\n      type: linear\\n      domain: {data: \\"table\\", field: \\"doc_count\\"}\\n      range: [\\n        50\\n        1000\\n      ]\\n    }\\n  ]\\n  marks: [\\n    {\\n      name: gridMarker\\n      type: symbol\\n      from: {data: \\"table\\"}\\n      encode: {\\n        update: {\\n          size: {scale: \\"gridSize\\", field: \\"doc_count\\"}\\n          xc: {signal: \\"datum.x\\"}\\n          yc: {signal: \\"datum.y\\"}\\n        }\\n      }\\n    },\\n    {\\n      name: gridLabel\\n      type: text\\n      from: {data: \\"table\\"}\\n      encode: {\\n        enter: {\\n          fill: {value: \\"firebrick\\"}\\n          text: {signal: \\"datum.doc_count\\"}\\n        }\\n        update: {\\n          x: {signal: \\"datum.x\\"}\\n          y: {signal: \\"datum.y\\"}\\n          dx: {value: -6}\\n          dy: {value: 6}\\n          fontSize: {value: 18}\\n          fontWeight: {value: \\"bold\\"}\\n        }\\n      }\\n    }\\n  ]\\n}"}}',
      uiStateJSON: '{}',
      description: '',
      version: 1,
      kibanaSavedObjectMeta: {
        searchSourceJSON:
          '{"query":{"query":"","language":"kuery"},"filter":[],"indexRefName":"kibanaSavedObjectMeta.searchSourceJSON.index"}',
      },
    },
    references: [
      {
        id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
        name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
        type: 'index-pattern',
      },
    ],
  },
  {
    attributes: {
      description: '',
      kibanaSavedObjectMeta: {
        searchSourceJSON: '{"query":{"query":"","language":"kuery"},"filter":[]}',
      },
      title: '[eCommerce] Markdown',
      uiStateJSON: '{}',
      version: 1,
      visState:
        '{"title":"[eCommerce] Markdown","type":"markdown","params":{"fontSize":12,"openLinksInNewTab":false,"markdown":"### Sample eCommerce Data\\nThis dashboard contains sample data for you to play with. You can view it, search it, and interact with the visualizations. For more information about Kibana, check our [docs](https://www.elastic.co/guide/en/kibana/current/index.html)."},"aggs":[]}',
    },
    coreMigrationVersion: '8.0.0',
    id: 'c00d1f90-f5ea-11eb-a78e-83aac3c38a60',
    migrationVersion: {
      visualization: '7.14.0',
    },
    references: [],
    type: 'visualization',
    updated_at: '2021-08-05T12:43:35.817Z',
    version: 'WzE3MSwxXQ==',
  },
  {
    attributes: {
      description: '',
      kibanaSavedObjectMeta: {
        searchSourceJSON: '{"query":{"query":"","language":"kuery"},"filter":[]}',
      },
      title: '[eCommerce] Controls',
      uiStateJSON: '{}',
      version: 1,
      visState:
        '{"title":"[eCommerce] Controls","type":"input_control_vis","params":{"controls":[{"id":"1536977437774","fieldName":"manufacturer.keyword","parent":"","label":"Manufacturer","type":"list","options":{"type":"terms","multiselect":true,"dynamicOptions":true,"size":5,"order":"desc"},"indexPatternRefName":"control_0_index_pattern"},{"id":"1536977465554","fieldName":"category.keyword","parent":"","label":"Category","type":"list","options":{"type":"terms","multiselect":true,"dynamicOptions":true,"size":5,"order":"desc"},"indexPatternRefName":"control_1_index_pattern"},{"id":"1536977596163","fieldName":"total_quantity","parent":"","label":"Quantity","type":"range","options":{"decimalPlaces":0,"step":1},"indexPatternRefName":"control_2_index_pattern"}],"updateFiltersOnChange":false,"useTimeFilter":true,"pinFilters":false},"aggs":[]}',
    },
    coreMigrationVersion: '8.0.0',
    id: 'c3378480-f5ea-11eb-a78e-83aac3c38a60',
    migrationVersion: {
      visualization: '7.14.0',
    },
    references: [
      {
        id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
        name: 'control_0_index_pattern',
        type: 'index-pattern',
      },
      {
        id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
        name: 'control_1_index_pattern',
        type: 'index-pattern',
      },
      {
        id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
        name: 'control_2_index_pattern',
        type: 'index-pattern',
      },
    ],
    type: 'visualization',
    updated_at: '2021-08-05T12:43:41.128Z',
    version: 'WzE3NiwxXQ==',
  },
  {
    attributes: {
      state: {
        datasourceStates: {
          indexpattern: {
            layers: {
              'c7478794-6767-4286-9d65-1c0ecd909dd8': {
                columnOrder: [
                  '8289349e-6d1b-4abf-b164-0208183d2c34',
                  '041db33b-5c9c-47f3-a5d3-ef5e255d1663',
                  '041db33b-5c9c-47f3-a5d3-ef5e255d1663X0',
                  '041db33b-5c9c-47f3-a5d3-ef5e255d1663X1',
                ],
                columns: {
                  '041db33b-5c9c-47f3-a5d3-ef5e255d1663': {
                    customLabel: true,
                    dataType: 'number',
                    isBucketed: false,
                    label: '% of target ($10k)',
                    operationType: 'formula',
                    params: {
                      format: {
                        id: 'percent',
                        params: {
                          decimals: 0,
                        },
                      },
                      formula: 'sum(taxful_total_price) / 10000 - 1',
                      isFormulaBroken: false,
                    },
                    references: ['041db33b-5c9c-47f3-a5d3-ef5e255d1663X1'],
                    scale: 'ratio',
                  },
                  '041db33b-5c9c-47f3-a5d3-ef5e255d1663X0': {
                    customLabel: true,
                    dataType: 'number',
                    isBucketed: false,
                    label: 'Part of Weekly revenue',
                    operationType: 'sum',
                    scale: 'ratio',
                    sourceField: 'taxful_total_price',
                  },
                  '041db33b-5c9c-47f3-a5d3-ef5e255d1663X1': {
                    customLabel: true,
                    dataType: 'number',
                    isBucketed: false,
                    label: 'Part of Weekly revenue',
                    operationType: 'math',
                    params: {
                      tinymathAst: {
                        args: [
                          {
                            args: ['041db33b-5c9c-47f3-a5d3-ef5e255d1663X0', 10000],
                            location: {
                              max: 32,
                              min: 0,
                            },
                            name: 'divide',
                            text: 'sum(taxful_total_price) / 10000 ',
                            type: 'function',
                          },
                          1,
                        ],
                        location: {
                          max: 35,
                          min: 0,
                        },
                        name: 'subtract',
                        text: 'sum(taxful_total_price) / 10000 - 1',
                        type: 'function',
                      },
                    },
                    references: ['041db33b-5c9c-47f3-a5d3-ef5e255d1663X0'],
                    scale: 'ratio',
                  },
                  '8289349e-6d1b-4abf-b164-0208183d2c34': {
                    dataType: 'date',
                    isBucketed: true,
                    label: 'order_date',
                    operationType: 'date_histogram',
                    params: {
                      interval: '1d',
                    },
                    scale: 'interval',
                    sourceField: 'order_date',
                  },
                },
                incompleteColumns: {},
              },
            },
          },
        },
        filters: [],
        query: {
          language: 'kuery',
          query: '',
        },
        visualization: {
          axisTitlesVisibilitySettings: {
            x: false,
            yLeft: false,
            yRight: true,
          },
          fittingFunction: 'None',
          gridlinesVisibilitySettings: {
            x: true,
            yLeft: true,
            yRight: true,
          },
          layers: [
            {
              accessors: ['041db33b-5c9c-47f3-a5d3-ef5e255d1663'],
              layerId: 'c7478794-6767-4286-9d65-1c0ecd909dd8',
              seriesType: 'bar_stacked',
              xAccessor: '8289349e-6d1b-4abf-b164-0208183d2c34',
            },
          ],
          legend: {
            isVisible: true,
            position: 'right',
          },
          preferredSeriesType: 'bar_stacked',
          tickLabelsVisibilitySettings: {
            x: true,
            yLeft: true,
            yRight: true,
          },
          valueLabels: 'hide',
          yLeftExtent: {
            mode: 'full',
          },
          yRightExtent: {
            mode: 'full',
          },
        },
      },
      title: '% of target revenue ($10k)',
      visualizationType: 'lnsXY',
    },
    coreMigrationVersion: '8.0.0',
    id: 'c762b7a0-f5ea-11eb-a78e-83aac3c38a60',
    migrationVersion: {
      lens: '7.14.0',
    },
    references: [
      {
        id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
        name: 'indexpattern-datasource-current-indexpattern',
        type: 'index-pattern',
      },
      {
        id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
        name: 'indexpattern-datasource-layer-c7478794-6767-4286-9d65-1c0ecd909dd8',
        type: 'index-pattern',
      },
    ],
    type: 'lens',
    updated_at: '2021-08-05T12:43:48.122Z',
    version: 'WzE4NCwxXQ==',
  },
  {
    attributes: {
      state: {
        datasourceStates: {
          indexpattern: {
            layers: {
              'c7478794-6767-4286-9d65-1c0ecd909dd8': {
                columnOrder: ['041db33b-5c9c-47f3-a5d3-ef5e255d1663'],
                columns: {
                  '041db33b-5c9c-47f3-a5d3-ef5e255d1663': {
                    customLabel: true,
                    dataType: 'number',
                    isBucketed: false,
                    label: 'Sum of revenue',
                    operationType: 'sum',
                    scale: 'ratio',
                    sourceField: 'taxful_total_price',
                  },
                },
                incompleteColumns: {},
              },
            },
          },
        },
        filters: [],
        query: {
          language: 'kuery',
          query: '',
        },
        visualization: {
          accessor: '041db33b-5c9c-47f3-a5d3-ef5e255d1663',
          layerId: 'c7478794-6767-4286-9d65-1c0ecd909dd8',
        },
      },
      title: 'Sum of revenue',
      visualizationType: 'lnsMetric',
    },
    coreMigrationVersion: '8.0.0',
    id: 'ce02e260-f5ea-11eb-a78e-83aac3c38a60',
    migrationVersion: {
      lens: '7.14.0',
    },
    references: [
      {
        id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
        name: 'indexpattern-datasource-current-indexpattern',
        type: 'index-pattern',
      },
      {
        id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
        name: 'indexpattern-datasource-layer-c7478794-6767-4286-9d65-1c0ecd909dd8',
        type: 'index-pattern',
      },
    ],
    type: 'lens',
    updated_at: '2021-08-05T12:43:59.238Z',
    version: 'WzE4OSwxXQ==',
  },
  {
    attributes: {
      state: {
        datasourceStates: {
          indexpattern: {
            layers: {
              '4fb42a8e-b133-43c8-805c-a38472053938': {
                columnOrder: ['020bbfdf-9ef8-4802-aa9e-342d2ea0bebf'],
                columns: {
                  '020bbfdf-9ef8-4802-aa9e-342d2ea0bebf': {
                    customLabel: true,
                    dataType: 'number',
                    isBucketed: false,
                    label: 'Median spending',
                    operationType: 'median',
                    scale: 'ratio',
                    sourceField: 'taxful_total_price',
                  },
                },
                incompleteColumns: {},
              },
            },
          },
        },
        filters: [],
        query: {
          language: 'kuery',
          query: '',
        },
        visualization: {
          accessor: '020bbfdf-9ef8-4802-aa9e-342d2ea0bebf',
          layerId: '4fb42a8e-b133-43c8-805c-a38472053938',
        },
      },
      title: 'Median spending',
      visualizationType: 'lnsMetric',
    },
    coreMigrationVersion: '8.0.0',
    id: 'd5f90030-f5ea-11eb-a78e-83aac3c38a60',
    migrationVersion: {
      lens: '7.14.0',
    },
    references: [
      {
        id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
        name: 'indexpattern-datasource-current-indexpattern',
        type: 'index-pattern',
      },
      {
        id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
        name: 'indexpattern-datasource-layer-4fb42a8e-b133-43c8-805c-a38472053938',
        type: 'index-pattern',
      },
    ],
    type: 'lens',
    updated_at: '2021-08-05T12:44:12.595Z',
    version: 'WzE5NywxXQ==',
  },
  {
    attributes: {
      state: {
        datasourceStates: {
          indexpattern: {
            layers: {
              'b6093a53-884f-42c2-9fcc-ba56cfb66c53': {
                columnOrder: [
                  '15c45f89-a149-443a-a830-aa8c3a9317db',
                  '2b41b3d8-2f62-407a-a866-960f254c679d',
                  'eadae280-2da3-4d1d-a0e1-f9733f89c15b',
                  'ddc92e50-4d5c-413e-b91b-3e504889fa65',
                  '5e31e5d3-2aaa-4475-a130-3b69bf2f748a',
                ],
                columns: {
                  '15c45f89-a149-443a-a830-aa8c3a9317db': {
                    dataType: 'date',
                    isBucketed: true,
                    label: 'order_date',
                    operationType: 'date_histogram',
                    params: {
                      interval: '1d',
                    },
                    scale: 'interval',
                    sourceField: 'order_date',
                  },
                  '2b41b3d8-2f62-407a-a866-960f254c679d': {
                    customLabel: true,
                    dataType: 'number',
                    isBucketed: false,
                    label: 'Total items',
                    operationType: 'sum',
                    scale: 'ratio',
                    sourceField: 'products.quantity',
                  },
                  '5e31e5d3-2aaa-4475-a130-3b69bf2f748a': {
                    customLabel: true,
                    dataType: 'number',
                    isBucketed: false,
                    label: 'Tx. last week',
                    operationType: 'count',
                    scale: 'ratio',
                    sourceField: '___records___',
                    timeShift: '1w',
                  },
                  'ddc92e50-4d5c-413e-b91b-3e504889fa65': {
                    customLabel: true,
                    dataType: 'number',
                    isBucketed: false,
                    label: 'Transactions',
                    operationType: 'count',
                    scale: 'ratio',
                    sourceField: '___records___',
                  },
                  'eadae280-2da3-4d1d-a0e1-f9733f89c15b': {
                    customLabel: true,
                    dataType: 'number',
                    isBucketed: false,
                    label: 'Last week',
                    operationType: 'sum',
                    scale: 'ratio',
                    sourceField: 'products.quantity',
                    timeShift: '1w',
                  },
                },
                incompleteColumns: {},
              },
            },
          },
        },
        filters: [],
        query: {
          language: 'kuery',
          query: '',
        },
        visualization: {
          axisTitlesVisibilitySettings: {
            x: false,
            yLeft: false,
            yRight: true,
          },
          curveType: 'LINEAR',
          fittingFunction: 'None',
          gridlinesVisibilitySettings: {
            x: true,
            yLeft: true,
            yRight: true,
          },
          layers: [
            {
              accessors: [
                '2b41b3d8-2f62-407a-a866-960f254c679d',
                'eadae280-2da3-4d1d-a0e1-f9733f89c15b',
                '5e31e5d3-2aaa-4475-a130-3b69bf2f748a',
                'ddc92e50-4d5c-413e-b91b-3e504889fa65',
              ],
              layerId: 'b6093a53-884f-42c2-9fcc-ba56cfb66c53',
              position: 'top',
              seriesType: 'line',
              showGridlines: false,
              xAccessor: '15c45f89-a149-443a-a830-aa8c3a9317db',
              yConfig: [
                {
                  color: '#b6e0d5',
                  forAccessor: 'eadae280-2da3-4d1d-a0e1-f9733f89c15b',
                },
                {
                  color: '#edafc4',
                  forAccessor: '5e31e5d3-2aaa-4475-a130-3b69bf2f748a',
                },
              ],
            },
          ],
          legend: {
            isVisible: true,
            position: 'right',
          },
          preferredSeriesType: 'line',
          tickLabelsVisibilitySettings: {
            x: true,
            yLeft: true,
            yRight: true,
          },
          valueLabels: 'hide',
          yLeftExtent: {
            mode: 'full',
          },
          yRightExtent: {
            mode: 'full',
          },
        },
      },
      title: 'Transactions per day',
      visualizationType: 'lnsXY',
    },
    coreMigrationVersion: '8.0.0',
    id: 'dde978b0-f5ea-11eb-a78e-83aac3c38a60',
    migrationVersion: {
      lens: '7.14.0',
    },
    references: [
      {
        id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
        name: 'indexpattern-datasource-current-indexpattern',
        type: 'index-pattern',
      },
      {
        id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
        name: 'indexpattern-datasource-layer-b6093a53-884f-42c2-9fcc-ba56cfb66c53',
        type: 'index-pattern',
      },
    ],
    type: 'lens',
    updated_at: '2021-08-05T12:44:25.915Z',
    version: 'WzIwMywxXQ==',
  },
  {
    attributes: {
      state: {
        datasourceStates: {
          indexpattern: {
            layers: {
              '667067a2-7cdf-4f0e-a9fe-eb4f4f1f2f17': {
                columnOrder: ['c52c2003-ae58-4604-bae7-52ba0fb38a01'],
                columns: {
                  'c52c2003-ae58-4604-bae7-52ba0fb38a01': {
                    customLabel: true,
                    dataType: 'number',
                    isBucketed: false,
                    label: 'Avg. items sold',
                    operationType: 'average',
                    params: {
                      format: {
                        id: 'number',
                        params: {
                          decimals: 1,
                        },
                      },
                    },
                    scale: 'ratio',
                    sourceField: 'total_quantity',
                  },
                },
                incompleteColumns: {},
              },
            },
          },
        },
        filters: [],
        query: {
          language: 'kuery',
          query: '',
        },
        visualization: {
          accessor: 'c52c2003-ae58-4604-bae7-52ba0fb38a01',
          layerId: '667067a2-7cdf-4f0e-a9fe-eb4f4f1f2f17',
        },
      },
      title: 'Avg. items sold',
      visualizationType: 'lnsMetric',
    },
    coreMigrationVersion: '8.0.0',
    id: 'e3902840-f5ea-11eb-a78e-83aac3c38a60',
    migrationVersion: {
      lens: '7.14.0',
    },
    references: [
      {
        id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
        name: 'indexpattern-datasource-current-indexpattern',
        type: 'index-pattern',
      },
      {
        id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
        name: 'indexpattern-datasource-layer-667067a2-7cdf-4f0e-a9fe-eb4f4f1f2f17',
        type: 'index-pattern',
      },
    ],
    type: 'lens',
    updated_at: '2021-08-05T12:44:35.396Z',
    version: 'WzIwOSwxXQ==',
  },
  {
    attributes: {
      state: {
        datasourceStates: {
          indexpattern: {
            layers: {
              '97c63ea6-9305-4755-97d1-0f26817c6f9a': {
                columnOrder: [
                  '9f61a7df-198e-4754-b34c-81ed544136ba',
                  'ebcb19af-0900-4439-949f-d8cd9bccde19',
                  '5575214b-7f21-4b6c-8bc1-34433c6a0c58',
                ],
                columns: {
                  '5575214b-7f21-4b6c-8bc1-34433c6a0c58': {
                    dataType: 'number',
                    isBucketed: false,
                    label: 'Count of records',
                    operationType: 'count',
                    scale: 'ratio',
                    sourceField: '___records___',
                  },
                  '9f61a7df-198e-4754-b34c-81ed544136ba': {
                    dataType: 'string',
                    isBucketed: true,
                    label: 'Top values of category.keyword',
                    operationType: 'terms',
                    params: {
                      missingBucket: false,
                      orderBy: {
                        columnId: '5575214b-7f21-4b6c-8bc1-34433c6a0c58',
                        type: 'column',
                      },
                      orderDirection: 'desc',
                      otherBucket: true,
                      size: 10,
                    },
                    scale: 'ordinal',
                    sourceField: 'category.keyword',
                  },
                  'ebcb19af-0900-4439-949f-d8cd9bccde19': {
                    dataType: 'date',
                    isBucketed: true,
                    label: 'order_date',
                    operationType: 'date_histogram',
                    params: {
                      interval: '1d',
                    },
                    scale: 'interval',
                    sourceField: 'order_date',
                  },
                },
                incompleteColumns: {},
              },
            },
          },
        },
        filters: [],
        query: {
          language: 'kuery',
          query: '',
        },
        visualization: {
          axisTitlesVisibilitySettings: {
            x: false,
            yLeft: false,
            yRight: true,
          },
          fittingFunction: 'None',
          gridlinesVisibilitySettings: {
            x: true,
            yLeft: true,
            yRight: true,
          },
          layers: [
            {
              accessors: ['5575214b-7f21-4b6c-8bc1-34433c6a0c58'],
              layerId: '97c63ea6-9305-4755-97d1-0f26817c6f9a',
              position: 'top',
              seriesType: 'bar_percentage_stacked',
              showGridlines: false,
              splitAccessor: '9f61a7df-198e-4754-b34c-81ed544136ba',
              xAccessor: 'ebcb19af-0900-4439-949f-d8cd9bccde19',
            },
          ],
          legend: {
            isVisible: true,
            position: 'right',
          },
          preferredSeriesType: 'bar_percentage_stacked',
          tickLabelsVisibilitySettings: {
            x: true,
            yLeft: true,
            yRight: true,
          },
          valueLabels: 'inside',
          yLeftExtent: {
            mode: 'full',
          },
          yRightExtent: {
            mode: 'full',
          },
        },
      },
      title: 'Breakdown by category',
      visualizationType: 'lnsXY',
    },
    coreMigrationVersion: '8.0.0',
    id: 'eddf7850-f5ea-11eb-a78e-83aac3c38a60',
    migrationVersion: {
      lens: '7.14.0',
    },
    references: [
      {
        id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
        name: 'indexpattern-datasource-current-indexpattern',
        type: 'index-pattern',
      },
      {
        id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
        name: 'indexpattern-datasource-layer-97c63ea6-9305-4755-97d1-0f26817c6f9a',
        type: 'index-pattern',
      },
    ],
    type: 'lens',
    updated_at: '2021-08-05T12:44:52.693Z',
    version: 'WzIxNSwxXQ==',
  },
  {
    attributes: {
      state: {
        datasourceStates: {
          indexpattern: {
            layers: {
              '0731ee8b-31c5-4be9-92d9-69ee760465d7': {
                columnOrder: [
                  '7bf8f089-1542-40bd-b349-45fdfc309ac6',
                  '826b2f39-b616-40b2-a222-972fdc1d7596',
                  'cfd45c47-fc41-430c-9e7a-b71dc0c916b0',
                  'bf51c1af-443e-49f4-a21f-54c87bfc5677',
                  'bf51c1af-443e-49f4-a21f-54c87bfc5677X0',
                  'bf51c1af-443e-49f4-a21f-54c87bfc5677X1',
                  'bf51c1af-443e-49f4-a21f-54c87bfc5677X2',
                ],
                columns: {
                  '7bf8f089-1542-40bd-b349-45fdfc309ac6': {
                    dataType: 'date',
                    isBucketed: true,
                    label: 'order_date',
                    operationType: 'date_histogram',
                    params: {
                      interval: '1d',
                    },
                    scale: 'interval',
                    sourceField: 'order_date',
                  },
                  '826b2f39-b616-40b2-a222-972fdc1d7596': {
                    customLabel: true,
                    dataType: 'number',
                    isBucketed: false,
                    label: 'This week',
                    operationType: 'sum',
                    scale: 'ratio',
                    sourceField: 'taxful_total_price',
                  },
                  'bf51c1af-443e-49f4-a21f-54c87bfc5677': {
                    customLabel: true,
                    dataType: 'number',
                    isBucketed: false,
                    label: 'Difference',
                    operationType: 'formula',
                    params: {
                      format: {
                        id: 'number',
                        params: {
                          decimals: 2,
                        },
                      },
                      formula: "sum(taxful_total_price) - sum(taxful_total_price, shift='1w')",
                      isFormulaBroken: false,
                    },
                    references: ['bf51c1af-443e-49f4-a21f-54c87bfc5677X2'],
                    scale: 'ratio',
                  },
                  'bf51c1af-443e-49f4-a21f-54c87bfc5677X0': {
                    customLabel: true,
                    dataType: 'number',
                    isBucketed: false,
                    label: 'Part of Difference',
                    operationType: 'sum',
                    scale: 'ratio',
                    sourceField: 'taxful_total_price',
                  },
                  'bf51c1af-443e-49f4-a21f-54c87bfc5677X1': {
                    customLabel: true,
                    dataType: 'number',
                    isBucketed: false,
                    label: 'Part of Difference',
                    operationType: 'sum',
                    scale: 'ratio',
                    sourceField: 'taxful_total_price',
                    timeShift: '1w',
                  },
                  'bf51c1af-443e-49f4-a21f-54c87bfc5677X2': {
                    customLabel: true,
                    dataType: 'number',
                    isBucketed: false,
                    label: 'Part of Difference',
                    operationType: 'math',
                    params: {
                      tinymathAst: {
                        args: [
                          'bf51c1af-443e-49f4-a21f-54c87bfc5677X0',
                          'bf51c1af-443e-49f4-a21f-54c87bfc5677X1',
                        ],
                        location: {
                          max: 61,
                          min: 0,
                        },
                        name: 'subtract',
                        text: "sum(taxful_total_price) - sum(taxful_total_price, shift='1w')",
                        type: 'function',
                      },
                    },
                    references: [
                      'bf51c1af-443e-49f4-a21f-54c87bfc5677X0',
                      'bf51c1af-443e-49f4-a21f-54c87bfc5677X1',
                    ],
                    scale: 'ratio',
                  },
                  'cfd45c47-fc41-430c-9e7a-b71dc0c916b0': {
                    customLabel: true,
                    dataType: 'number',
                    isBucketed: false,
                    label: '1 week ago',
                    operationType: 'sum',
                    scale: 'ratio',
                    sourceField: 'taxful_total_price',
                    timeShift: '1w',
                  },
                },
                incompleteColumns: {},
              },
            },
          },
        },
        filters: [],
        query: {
          language: 'kuery',
          query: '',
        },
        visualization: {
          columns: [
            {
              columnId: '7bf8f089-1542-40bd-b349-45fdfc309ac6',
            },
            {
              alignment: 'left',
              columnId: '826b2f39-b616-40b2-a222-972fdc1d7596',
            },
            {
              columnId: 'cfd45c47-fc41-430c-9e7a-b71dc0c916b0',
            },
            {
              colorMode: 'text',
              columnId: 'bf51c1af-443e-49f4-a21f-54c87bfc5677',
              isTransposed: false,
              palette: {
                name: 'custom',
                params: {
                  colorStops: [
                    {
                      color: '#D36086',
                      stop: -10000,
                    },
                    {
                      color: '#209280',
                      stop: 0,
                    },
                  ],
                  continuity: 'above',
                  name: 'custom',
                  rangeMax: 0,
                  rangeMin: -10000,
                  rangeType: 'number',
                  steps: 5,
                  stops: [
                    {
                      color: '#D36086',
                      stop: 0,
                    },
                    {
                      color: '#209280',
                      stop: 2249.03125,
                    },
                  ],
                },
                type: 'palette',
              },
            },
          ],
          layerId: '0731ee8b-31c5-4be9-92d9-69ee760465d7',
        },
      },
      title: 'Daily comparison',
      visualizationType: 'lnsDatatable',
    },
    coreMigrationVersion: '8.0.0',
    id: 'ff6a21b0-f5ea-11eb-a78e-83aac3c38a60',
    migrationVersion: {
      lens: '7.14.0',
    },
    references: [
      {
        id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
        name: 'indexpattern-datasource-current-indexpattern',
        type: 'index-pattern',
      },
      {
        id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
        name: 'indexpattern-datasource-layer-0731ee8b-31c5-4be9-92d9-69ee760465d7',
        type: 'index-pattern',
      },
    ],
    type: 'lens',
    updated_at: '2021-08-05T12:45:22.123Z',
    version: 'WzIyMiwxXQ==',
  },
  {
    attributes: {
      state: {
        datasourceStates: {
          indexpattern: {
            layers: {
              '5ed846c2-a70b-4d9c-a244-f254bef763b8': {
                columnOrder: [
                  'd77cdd24-dedc-48dd-9a4b-d34c6f1a6c46',
                  '7ac31901-277a-46e2-8128-8d684b2c1127',
                ],
                columns: {
                  '7ac31901-277a-46e2-8128-8d684b2c1127': {
                    customLabel: true,
                    dataType: 'number',
                    isBucketed: false,
                    label: 'Items',
                    operationType: 'count',
                    scale: 'ratio',
                    sourceField: '___records___',
                  },
                  'd77cdd24-dedc-48dd-9a4b-d34c6f1a6c46': {
                    customLabel: true,
                    dataType: 'string',
                    isBucketed: true,
                    label: 'Product name',
                    operationType: 'terms',
                    params: {
                      missingBucket: false,
                      orderBy: {
                        columnId: '7ac31901-277a-46e2-8128-8d684b2c1127',
                        type: 'column',
                      },
                      orderDirection: 'desc',
                      otherBucket: false,
                      size: 5,
                    },
                    scale: 'ordinal',
                    sourceField: 'products.product_name.keyword',
                  },
                },
                incompleteColumns: {},
              },
            },
          },
        },
        filters: [],
        query: {
          language: 'kuery',
          query: '',
        },
        visualization: {
          axisTitlesVisibilitySettings: {
            x: false,
            yLeft: true,
            yRight: true,
          },
          fittingFunction: 'None',
          gridlinesVisibilitySettings: {
            x: true,
            yLeft: true,
            yRight: true,
          },
          layers: [
            {
              accessors: ['7ac31901-277a-46e2-8128-8d684b2c1127'],
              layerId: '5ed846c2-a70b-4d9c-a244-f254bef763b8',
              position: 'top',
              seriesType: 'bar_horizontal',
              showGridlines: false,
              xAccessor: 'd77cdd24-dedc-48dd-9a4b-d34c6f1a6c46',
            },
          ],
          legend: {
            isVisible: true,
            position: 'right',
          },
          preferredSeriesType: 'bar_horizontal',
          tickLabelsVisibilitySettings: {
            x: true,
            yLeft: true,
            yRight: true,
          },
          valueLabels: 'inside',
          yLeftExtent: {
            mode: 'full',
          },
          yRightExtent: {
            mode: 'full',
          },
        },
      },
      title: 'Top products this week',
      visualizationType: 'lnsXY',
    },
    coreMigrationVersion: '8.0.0',
    id: '03071e90-f5eb-11eb-a78e-83aac3c38a60',
    migrationVersion: {
      lens: '7.14.0',
    },
    references: [
      {
        id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
        name: 'indexpattern-datasource-current-indexpattern',
        type: 'index-pattern',
      },
      {
        id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
        name: 'indexpattern-datasource-layer-5ed846c2-a70b-4d9c-a244-f254bef763b8',
        type: 'index-pattern',
      },
    ],
    type: 'lens',
    updated_at: '2021-08-05T12:45:28.185Z',
    version: 'WzIyOCwxXQ==',
  },
  {
    attributes: {
      state: {
        datasourceStates: {
          indexpattern: {
            layers: {
              '5ed846c2-a70b-4d9c-a244-f254bef763b8': {
                columnOrder: [
                  'd77cdd24-dedc-48dd-9a4b-d34c6f1a6c46',
                  '7ac31901-277a-46e2-8128-8d684b2c1127',
                ],
                columns: {
                  '7ac31901-277a-46e2-8128-8d684b2c1127': {
                    customLabel: true,
                    dataType: 'number',
                    isBucketed: false,
                    label: 'Items',
                    operationType: 'count',
                    scale: 'ratio',
                    sourceField: '___records___',
                  },
                  'd77cdd24-dedc-48dd-9a4b-d34c6f1a6c46': {
                    customLabel: true,
                    dataType: 'string',
                    isBucketed: true,
                    label: 'Product name',
                    operationType: 'terms',
                    params: {
                      missingBucket: false,
                      orderBy: {
                        columnId: '7ac31901-277a-46e2-8128-8d684b2c1127',
                        type: 'column',
                      },
                      orderDirection: 'desc',
                      otherBucket: false,
                      size: 5,
                    },
                    scale: 'ordinal',
                    sourceField: 'products.product_name.keyword',
                  },
                },
                incompleteColumns: {},
              },
            },
          },
        },
        filters: [],
        query: {
          language: 'kuery',
          query: '',
        },
        visualization: {
          axisTitlesVisibilitySettings: {
            x: false,
            yLeft: true,
            yRight: true,
          },
          fittingFunction: 'None',
          gridlinesVisibilitySettings: {
            x: true,
            yLeft: true,
            yRight: true,
          },
          layers: [
            {
              accessors: ['7ac31901-277a-46e2-8128-8d684b2c1127'],
              layerId: '5ed846c2-a70b-4d9c-a244-f254bef763b8',
              position: 'top',
              seriesType: 'bar_horizontal',
              showGridlines: false,
              xAccessor: 'd77cdd24-dedc-48dd-9a4b-d34c6f1a6c46',
            },
          ],
          legend: {
            isVisible: true,
            position: 'right',
          },
          preferredSeriesType: 'bar_horizontal',
          tickLabelsVisibilitySettings: {
            x: true,
            yLeft: true,
            yRight: true,
          },
          valueLabels: 'inside',
          yLeftExtent: {
            mode: 'full',
          },
          yRightExtent: {
            mode: 'full',
          },
        },
      },
      title: 'Top products last week',
      visualizationType: 'lnsXY',
    },
    coreMigrationVersion: '8.0.0',
    id: '06379e00-f5eb-11eb-a78e-83aac3c38a60',
    migrationVersion: {
      lens: '7.14.0',
    },
    references: [
      {
        id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
        name: 'indexpattern-datasource-current-indexpattern',
        type: 'index-pattern',
      },
      {
        id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
        name: 'indexpattern-datasource-layer-5ed846c2-a70b-4d9c-a244-f254bef763b8',
        type: 'index-pattern',
      },
    ],
    type: 'lens',
    updated_at: '2021-08-05T12:45:33.536Z',
    version: 'WzIzMywxXQ==',
  },
  {
    attributes: {
      description: i18n.translate('home.sampleData.ecommerceSpec.revenueDashboardDescription', {
        defaultMessage: 'Analyze mock eCommerce orders and revenue',
      }),
      hits: 0,
      kibanaSavedObjectMeta: {
        searchSourceJSON: '{"query":{"language":"kuery","query":""},"filter":[]}',
      },
      optionsJSON: '{"hidePanelTitles":false,"useMargins":true}',
      panelsJSON:
        '[{"version":"8.0.0-SNAPSHOT","type":"visualization","gridData":{"x":0,"y":22,"w":24,"h":10,"i":"5"},"panelIndex":"5","embeddableConfig":{"enhancements":{}},"panelRefName":"panel_5"},{"version":"8.0.0-SNAPSHOT","type":"visualization","gridData":{"x":36,"y":15,"w":12,"h":7,"i":"7"},"panelIndex":"7","embeddableConfig":{"enhancements":{}},"panelRefName":"panel_7"},{"version":"8.0.0-SNAPSHOT","type":"search","gridData":{"x":0,"y":55,"w":48,"h":18,"i":"10"},"panelIndex":"10","embeddableConfig":{"enhancements":{}},"panelRefName":"panel_10"},{"version":"8.0.0-SNAPSHOT","type":"map","gridData":{"x":0,"y":32,"w":24,"h":14,"i":"11"},"panelIndex":"11","embeddableConfig":{"isLayerTOCOpen":false,"enhancements":{},"mapCenter":{"lat":45.88578,"lon":-15.07605,"zoom":2.11},"mapBuffer":{"minLon":-135,"minLat":0,"maxLon":90,"maxLat":66.51326},"openTOCDetails":[],"hiddenLayers":[]},"panelRefName":"panel_11"},{"version":"8.0.0-SNAPSHOT","type":"visualization","gridData":{"x":0,"y":0,"w":18,"h":7,"i":"a71cf076-6895-491c-8878-63592e429ed5"},"panelIndex":"a71cf076-6895-491c-8878-63592e429ed5","embeddableConfig":{"enhancements":{}},"panelRefName":"panel_a71cf076-6895-491c-8878-63592e429ed5"},{"version":"8.0.0-SNAPSHOT","type":"visualization","gridData":{"x":18,"y":0,"w":30,"h":7,"i":"adc0a2f4-481c-45eb-b422-0ea59a3e5163"},"panelIndex":"adc0a2f4-481c-45eb-b422-0ea59a3e5163","embeddableConfig":{"enhancements":{}},"panelRefName":"panel_adc0a2f4-481c-45eb-b422-0ea59a3e5163"},{"version":"8.0.0-SNAPSHOT","type":"lens","gridData":{"x":0,"y":7,"w":24,"h":8,"i":"7077b79f-2a99-4fcb-bbd4-456982843278"},"panelIndex":"7077b79f-2a99-4fcb-bbd4-456982843278","embeddableConfig":{"enhancements":{},"hidePanelTitles":false},"title":"% of target revenue ($10k)","panelRefName":"panel_7077b79f-2a99-4fcb-bbd4-456982843278"},{"version":"8.0.0-SNAPSHOT","type":"lens","gridData":{"x":24,"y":7,"w":12,"h":8,"i":"19a3c101-ad2e-4421-a71b-a4734ec1f03e"},"panelIndex":"19a3c101-ad2e-4421-a71b-a4734ec1f03e","embeddableConfig":{"enhancements":{}},"panelRefName":"panel_19a3c101-ad2e-4421-a71b-a4734ec1f03e"},{"version":"8.0.0-SNAPSHOT","type":"lens","gridData":{"x":36,"y":7,"w":12,"h":8,"i":"491469e7-7d24-4216-aeb3-bca00e5c8c1b"},"panelIndex":"491469e7-7d24-4216-aeb3-bca00e5c8c1b","embeddableConfig":{"enhancements":{}},"panelRefName":"panel_491469e7-7d24-4216-aeb3-bca00e5c8c1b"},{"version":"8.0.0-SNAPSHOT","type":"lens","gridData":{"x":0,"y":15,"w":24,"h":7,"i":"a1b03eb9-a36b-4e12-aa1b-bb29b5d6c4ef"},"panelIndex":"a1b03eb9-a36b-4e12-aa1b-bb29b5d6c4ef","embeddableConfig":{"enhancements":{}},"panelRefName":"panel_a1b03eb9-a36b-4e12-aa1b-bb29b5d6c4ef"},{"version":"8.0.0-SNAPSHOT","type":"lens","gridData":{"x":24,"y":15,"w":12,"h":7,"i":"da51079b-952f-43dc-96e6-6f9415a3708b"},"panelIndex":"da51079b-952f-43dc-96e6-6f9415a3708b","embeddableConfig":{"enhancements":{}},"panelRefName":"panel_da51079b-952f-43dc-96e6-6f9415a3708b"},{"version":"8.0.0-SNAPSHOT","type":"lens","gridData":{"x":24,"y":22,"w":24,"h":10,"i":"64fd5dcf-30c5-4f5a-a78c-70b1fbf87e5b"},"panelIndex":"64fd5dcf-30c5-4f5a-a78c-70b1fbf87e5b","embeddableConfig":{"enhancements":{}},"panelRefName":"panel_64fd5dcf-30c5-4f5a-a78c-70b1fbf87e5b"},{"version":"8.0.0-SNAPSHOT","type":"lens","gridData":{"x":24,"y":32,"w":24,"h":14,"i":"bd330ede-2eef-4e2a-8100-22a21abf5038"},"panelIndex":"bd330ede-2eef-4e2a-8100-22a21abf5038","embeddableConfig":{"enhancements":{}},"panelRefName":"panel_bd330ede-2eef-4e2a-8100-22a21abf5038"},{"version":"8.0.0-SNAPSHOT","type":"lens","gridData":{"x":0,"y":46,"w":24,"h":9,"i":"b897d4be-cf83-46fb-a111-c7fbec9ef403"},"panelIndex":"b897d4be-cf83-46fb-a111-c7fbec9ef403","embeddableConfig":{"hidePanelTitles":false,"enhancements":{}},"title":"Top products this week","panelRefName":"panel_b897d4be-cf83-46fb-a111-c7fbec9ef403"},{"version":"8.0.0-SNAPSHOT","type":"lens","gridData":{"x":24,"y":46,"w":24,"h":9,"i":"e0f68f93-30f2-4da7-889a-6cd128a68d3f"},"panelIndex":"e0f68f93-30f2-4da7-889a-6cd128a68d3f","embeddableConfig":{"timeRange":{"from":"now-2w","to":"now-1w"},"hidePanelTitles":false,"enhancements":{}},"title":"Top products last week","panelRefName":"panel_e0f68f93-30f2-4da7-889a-6cd128a68d3f"}]',
      refreshInterval: {
        pause: true,
        value: 0,
      },
      timeFrom: 'now-7d',
      timeRestore: true,
      timeTo: 'now',
      title: i18n.translate('home.sampleData.ecommerceSpec.revenueDashboardTitle', {
        defaultMessage: '[eCommerce] Revenue Dashboard',
      }),
      version: 1,
    },
    coreMigrationVersion: '8.0.0',
    id: '722b74f0-b882-11e8-a6d9-e546fe2bba5f',
    migrationVersion: {
      dashboard: '7.14.0',
    },
    references: [
      {
        id: '45e07720-b890-11e8-a6d9-e546fe2bba5f',
        name: '5:panel_5',
        type: 'visualization',
      },
      {
        id: 'b80e6540-b891-11e8-a6d9-e546fe2bba5f',
        name: '7:panel_7',
        type: 'visualization',
      },
      {
        id: '3ba638e0-b894-11e8-a6d9-e546fe2bba5f',
        name: '10:panel_10',
        type: 'search',
      },
      {
        id: '9c6f83f0-bb4d-11e8-9c84-77068524bcab',
        name: '11:panel_11',
        type: 'visualization',
      },
      {
        id: 'c00d1f90-f5ea-11eb-a78e-83aac3c38a60',
        name: 'a71cf076-6895-491c-8878-63592e429ed5:panel_a71cf076-6895-491c-8878-63592e429ed5',
        type: 'visualization',
      },
      {
        id: 'c3378480-f5ea-11eb-a78e-83aac3c38a60',
        name: 'adc0a2f4-481c-45eb-b422-0ea59a3e5163:panel_adc0a2f4-481c-45eb-b422-0ea59a3e5163',
        type: 'visualization',
      },
      {
        id: 'c762b7a0-f5ea-11eb-a78e-83aac3c38a60',
        name: '7077b79f-2a99-4fcb-bbd4-456982843278:panel_7077b79f-2a99-4fcb-bbd4-456982843278',
        type: 'lens',
      },
      {
        id: 'ce02e260-f5ea-11eb-a78e-83aac3c38a60',
        name: '19a3c101-ad2e-4421-a71b-a4734ec1f03e:panel_19a3c101-ad2e-4421-a71b-a4734ec1f03e',
        type: 'lens',
      },
      {
        id: 'd5f90030-f5ea-11eb-a78e-83aac3c38a60',
        name: '491469e7-7d24-4216-aeb3-bca00e5c8c1b:panel_491469e7-7d24-4216-aeb3-bca00e5c8c1b',
        type: 'lens',
      },
      {
        id: 'dde978b0-f5ea-11eb-a78e-83aac3c38a60',
        name: 'a1b03eb9-a36b-4e12-aa1b-bb29b5d6c4ef:panel_a1b03eb9-a36b-4e12-aa1b-bb29b5d6c4ef',
        type: 'lens',
      },
      {
        id: 'e3902840-f5ea-11eb-a78e-83aac3c38a60',
        name: 'da51079b-952f-43dc-96e6-6f9415a3708b:panel_da51079b-952f-43dc-96e6-6f9415a3708b',
        type: 'lens',
      },
      {
        id: 'eddf7850-f5ea-11eb-a78e-83aac3c38a60',
        name: '64fd5dcf-30c5-4f5a-a78c-70b1fbf87e5b:panel_64fd5dcf-30c5-4f5a-a78c-70b1fbf87e5b',
        type: 'lens',
      },
      {
        id: 'ff6a21b0-f5ea-11eb-a78e-83aac3c38a60',
        name: 'bd330ede-2eef-4e2a-8100-22a21abf5038:panel_bd330ede-2eef-4e2a-8100-22a21abf5038',
        type: 'lens',
      },
      {
        id: '03071e90-f5eb-11eb-a78e-83aac3c38a60',
        name: 'b897d4be-cf83-46fb-a111-c7fbec9ef403:panel_b897d4be-cf83-46fb-a111-c7fbec9ef403',
        type: 'lens',
      },
      {
        id: '06379e00-f5eb-11eb-a78e-83aac3c38a60',
        name: 'e0f68f93-30f2-4da7-889a-6cd128a68d3f:panel_e0f68f93-30f2-4da7-889a-6cd128a68d3f',
        type: 'lens',
      },
    ],
    type: 'dashboard',
    updated_at: '2021-08-05T12:45:46.525Z',
    version: 'WzIzOSwxXQ==',
  },
];
