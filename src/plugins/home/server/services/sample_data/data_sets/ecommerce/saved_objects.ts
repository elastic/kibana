/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/* eslint max-len: 0 */

import { i18n } from '@kbn/i18n';
import { SavedObject } from 'kibana/server';

export const getSavedObjects = (): SavedObject[] => [
  {
    id: '45e07720-b890-11e8-a6d9-e546fe2bba5f',
    type: 'visualization',
    updated_at: '2021-07-16T20:14:25.894Z',
    version: '3',
    migrationVersion: {
      visualization: '7.14.0',
    },
    attributes: {
      title: i18n.translate('home.sampleData.ecommerceSpec.promotionTrackingTitle', {
        defaultMessage: '[eCommerce] Promotion Tracking',
      }),
      visState:
        '{"title":"[eCommerce] Promotion Tracking","type":"metrics","aggs":[],"params":{"time_range_mode":"entire_time_range","id":"61ca57f0-469d-11e7-af02-69e470af7417","type":"timeseries","series":[{"id":"ea20ae70-b88d-11e8-a451-f37365e9f268","color":"rgba(211,96,134,1)","split_mode":"everything","metrics":[{"id":"ea20ae71-b88d-11e8-a451-f37365e9f268","type":"sum","field":"taxful_total_price"}],"separate_axis":0,"axis_position":"right","formatter":"number","chart_type":"line","line_width":"2","point_size":"5","fill":"0","stacked":"none","filter":{"query":"products.product_name:*trouser*","language":"lucene"},"label":"Revenue Trousers","value_template":"${{value}}","split_color_mode":"gradient"},{"id":"062d77b0-b88e-11e8-a451-f37365e9f268","color":"rgba(84,179,153,1)","split_mode":"everything","metrics":[{"id":"062d77b1-b88e-11e8-a451-f37365e9f268","type":"sum","field":"taxful_total_price"}],"separate_axis":0,"axis_position":"right","formatter":"number","chart_type":"line","line_width":"2","point_size":"05","fill":"0","stacked":"none","filter":{"query":"products.product_name:*watch*","language":"lucene"},"label":"Revenue Watches","value_template":"${{value}}","split_color_mode":"gradient"},{"id":"61ca57f1-469d-11e7-af02-69e470af7417","color":"rgba(96,146,192,1)","split_mode":"everything","metrics":[{"id":"61ca57f2-469d-11e7-af02-69e470af7417","type":"sum","field":"taxful_total_price"}],"separate_axis":0,"axis_position":"right","formatter":"number","chart_type":"line","line_width":"2","point_size":"5","fill":"0","stacked":"none","filter":{"query":"products.product_name:*bag*","language":"lucene"},"label":"Revenue Bags","value_template":"${{value}}","split_color_mode":"gradient"},{"id":"faa2c170-b88d-11e8-a451-f37365e9f268","color":"rgba(202,142,174,1)","split_mode":"everything","metrics":[{"id":"faa2c171-b88d-11e8-a451-f37365e9f268","type":"sum","field":"taxful_total_price"}],"separate_axis":0,"axis_position":"right","formatter":"number","chart_type":"line","line_width":"2","point_size":"5","fill":"0","stacked":"none","filter":{"query":"products.product_name:*cocktail dress*","language":"lucene"},"label":"Revenue Cocktail Dresses","value_template":"${{value}}","split_color_mode":"gradient"}],"time_field":"order_date","interval":"12h","use_kibana_indexes":true,"axis_position":"left","axis_formatter":"number","axis_scale":"normal","show_legend":1,"show_grid":1,"legend_position":"bottom","annotations":[{"fields":"taxful_total_price","template":"Ring the bell! ${{taxful_total_price}}","query_string":{"query":"taxful_total_price:>250","language":"lucene"},"id":"c8c30be0-b88f-11e8-a451-f37365e9f268","color":"rgba(25,77,51,1)","time_field":"order_date","icon":"fa-bell","ignore_global_filters":1,"ignore_panel_filters":1,"index_pattern_ref_name":"metrics_1_index_pattern"}],"tooltip_mode":"show_all","drop_last_bucket":0,"isModelInvalid":false,"index_pattern_ref_name":"metrics_0_index_pattern"}}',
      uiStateJSON: '{}',
      description: '',
      version: 1,
      kibanaSavedObjectMeta: {
        searchSourceJSON: '{"query":{"query":"","language":"kuery"},"filter":[]}',
      },
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
  },
  {
    id: 'b80e6540-b891-11e8-a6d9-e546fe2bba5f',
    type: 'visualization',
    updated_at: '2021-07-14T20:45:27.899Z',
    version: '2',
    migrationVersion: {
      visualization: '7.14.0',
    },
    attributes: {
      title: i18n.translate('home.sampleData.ecommerceSpec.soldProductsPerDayTitle', {
        defaultMessage: '[eCommerce] Sold Products per Day',
      }),
      visState:
        '{"title":"[eCommerce] Sold Products per Day","type":"metrics","aggs":[],"params":{"time_range_mode":"entire_time_range","id":"61ca57f0-469d-11e7-af02-69e470af7417","type":"gauge","series":[{"id":"61ca57f1-469d-11e7-af02-69e470af7417","color":"#68BC00","split_mode":"everything","metrics":[{"id":"61ca57f2-469d-11e7-af02-69e470af7417","type":"count"},{"id":"fd1e1b90-e4e3-11eb-8234-cb7bfd534fce","type":"math","variables":[{"id":"00374270-e4e4-11eb-8234-cb7bfd534fce","name":"c","field":"61ca57f2-469d-11e7-af02-69e470af7417"}],"script":"params.c / (params._interval / 1000 / 60 / 60 / 24)"}],"separate_axis":0,"axis_position":"right","formatter":"0.0","chart_type":"line","line_width":1,"point_size":1,"fill":0.5,"stacked":"none","label":"Trxns / day","split_color_mode":"gradient","value_template":""}],"time_field":"order_date","interval":"1d","axis_position":"left","axis_formatter":"number","axis_scale":"normal","show_legend":1,"show_grid":1,"gauge_color_rules":[{"value":150,"id":"6da070c0-b891-11e8-b645-195edeb9de84","gauge":"rgba(104,188,0,1)","operator":"gte"},{"value":150,"id":"9b0cdbc0-b891-11e8-b645-195edeb9de84","gauge":"rgba(244,78,59,1)","operator":"lt"}],"gauge_width":"15","gauge_inner_width":"10","gauge_style":"half","filter":"","gauge_max":"300","use_kibana_indexes":true,"hide_last_value_indicator":true,"tooltip_mode":"show_all","drop_last_bucket":0,"isModelInvalid":false,"index_pattern_ref_name":"metrics_0_index_pattern"}}',
      uiStateJSON: '{}',
      description: '',
      version: 1,
      kibanaSavedObjectMeta: {
        searchSourceJSON: '{"query":{"query":"","language":"kuery"},"filter":[]}',
      },
    },
    references: [
      {
        id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
        name: 'metrics_0_index_pattern',
        type: 'index-pattern',
      },
    ],
  },
  {
    id: '3ba638e0-b894-11e8-a6d9-e546fe2bba5f',
    type: 'search',
    updated_at: '2021-07-16T20:05:53.880Z',
    version: '2',
    migrationVersion: {
      search: '7.9.3',
    },
    attributes: {
      title: i18n.translate('home.sampleData.ecommerceSpec.ordersTitle', {
        defaultMessage: '[eCommerce] Orders',
      }),
      description: '',
      hits: 0,
      columns: [
        'category',
        'taxful_total_price',
        'products.price',
        'products.product_name',
        'products.manufacturer',
        'sku',
      ],
      sort: [['order_date', 'desc']],
      version: 1,
      kibanaSavedObjectMeta: {
        searchSourceJSON:
          '{"highlightAll":true,"version":true,"query":{"query":"","language":"kuery"},"filter":[],"indexRefName":"kibanaSavedObjectMeta.searchSourceJSON.index"}',
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
    id: '9c6f83f0-bb4d-11e8-9c84-77068524bcab',
    type: 'visualization',
    updated_at: '2018-10-01T15:13:03.270Z',
    version: '1',
    migrationVersion: {},
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
          '{"version":true,"query":{"query":"","language":"kuery"},"filter":[],"indexRefName":"kibanaSavedObjectMeta.searchSourceJSON.index"}',
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
    id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
    type: 'index-pattern',
    updated_at: '2021-07-16T20:08:12.675Z',
    version: '2',
    migrationVersion: {
      'index-pattern': '7.11.0',
    },
    attributes: {
      title: 'kibana_sample_data_ecommerce',
      timeFieldName: 'order_date',
      fieldAttrs:
        '{"products.manufacturer":{"count":1},"products.price":{"count":1},"products.product_name":{"count":1},"total_quantity":{"count":1}}',
      fieldFormatMap:
        '{"taxful_total_price":{"id":"number","params":{"pattern":"$0,0.[00]"}},"products.price":{"id":"number","params":{"pattern":"$0,0.00"}},"taxless_total_price":{"id":"number","params":{"pattern":"$0,0.00"}},"products.taxless_price":{"id":"number","params":{"pattern":"$0,0.00"}},"products.taxful_price":{"id":"number","params":{"pattern":"$0,0.00"}},"products.min_price":{"id":"number","params":{"pattern":"$0,0.00"}},"products.base_unit_price":{"id":"number","params":{"pattern":"$0,0.00"}},"products.base_price":{"id":"number","params":{"pattern":"$0,0.00"}}}',
      fields: '[]',
      runtimeFieldMap: '{}',
      typeMeta: '{}',
    },
    references: [],
  },
  {
    id: '722b74f0-b882-11e8-a6d9-e546fe2bba5f',
    type: 'dashboard',
    updated_at: '2021-07-16T20:43:03.136Z',
    version: '2',
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
        type: 'map',
      },
      {
        id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
        name:
          'a5914d17-81fe-4f27-b240-23ac529c1499:control_a5914d17-81fe-4f27-b240-23ac529c1499_0_index_pattern',
        type: 'index-pattern',
      },
      {
        id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
        name:
          'a5914d17-81fe-4f27-b240-23ac529c1499:control_a5914d17-81fe-4f27-b240-23ac529c1499_1_index_pattern',
        type: 'index-pattern',
      },
      {
        id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
        name:
          'a5914d17-81fe-4f27-b240-23ac529c1499:control_a5914d17-81fe-4f27-b240-23ac529c1499_2_index_pattern',
        type: 'index-pattern',
      },
      {
        id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
        name: 'c65434d6-fe64-460f-b07a-c7d267c856ff:indexpattern-datasource-current-indexpattern',
        type: 'index-pattern',
      },
      {
        id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
        name:
          'c65434d6-fe64-460f-b07a-c7d267c856ff:indexpattern-datasource-layer-c7478794-6767-4286-9d65-1c0ecd909dd8',
        type: 'index-pattern',
      },
      {
        id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
        name: '2e6ef14d-7b03-46d4-a6b8-a962ee36a805:indexpattern-datasource-current-indexpattern',
        type: 'index-pattern',
      },
      {
        id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
        name:
          '2e6ef14d-7b03-46d4-a6b8-a962ee36a805:indexpattern-datasource-layer-c7478794-6767-4286-9d65-1c0ecd909dd8',
        type: 'index-pattern',
      },
      {
        id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
        name: '5108a3bc-d1cf-4255-8c95-2df52577b956:indexpattern-datasource-current-indexpattern',
        type: 'index-pattern',
      },
      {
        id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
        name:
          '5108a3bc-d1cf-4255-8c95-2df52577b956:indexpattern-datasource-layer-4fb42a8e-b133-43c8-805c-a38472053938',
        type: 'index-pattern',
      },
      {
        id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
        name: '6bc3fa4a-8f1b-436f-afc1-f3516ee531ce:indexpattern-datasource-current-indexpattern',
        type: 'index-pattern',
      },
      {
        id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
        name:
          '6bc3fa4a-8f1b-436f-afc1-f3516ee531ce:indexpattern-datasource-layer-b6093a53-884f-42c2-9fcc-ba56cfb66c53',
        type: 'index-pattern',
      },
      {
        id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
        name: '222c1f05-ca21-4e62-a04a-9a059b4534a7:indexpattern-datasource-current-indexpattern',
        type: 'index-pattern',
      },
      {
        id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
        name:
          '222c1f05-ca21-4e62-a04a-9a059b4534a7:indexpattern-datasource-layer-667067a2-7cdf-4f0e-a9fe-eb4f4f1f2f17',
        type: 'index-pattern',
      },
      {
        id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
        name: 'a885226c-6830-4731-88a0-8c1d1047841e:indexpattern-datasource-current-indexpattern',
        type: 'index-pattern',
      },
      {
        id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
        name:
          'a885226c-6830-4731-88a0-8c1d1047841e:indexpattern-datasource-layer-0731ee8b-31c5-4be9-92d9-69ee760465d7',
        type: 'index-pattern',
      },
      {
        id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
        name: '003bdfc7-4d9e-4bd0-b088-3b18f79588d1:indexpattern-datasource-current-indexpattern',
        type: 'index-pattern',
      },
      {
        id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
        name:
          '003bdfc7-4d9e-4bd0-b088-3b18f79588d1:indexpattern-datasource-layer-97c63ea6-9305-4755-97d1-0f26817c6f9a',
        type: 'index-pattern',
      },
      {
        id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
        name: 'b1697063-c817-4847-aa0d-5bed47137b7e:indexpattern-datasource-current-indexpattern',
        type: 'index-pattern',
      },
      {
        id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
        name:
          'b1697063-c817-4847-aa0d-5bed47137b7e:indexpattern-datasource-layer-5ed846c2-a70b-4d9c-a244-f254bef763b8',
        type: 'index-pattern',
      },
      {
        id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
        name: '562bb4bd-16b5-4c7e-9dfa-0f24cae6d1ba:indexpattern-datasource-current-indexpattern',
        type: 'index-pattern',
      },
      {
        id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
        name:
          '562bb4bd-16b5-4c7e-9dfa-0f24cae6d1ba:indexpattern-datasource-layer-5ed846c2-a70b-4d9c-a244-f254bef763b8',
        type: 'index-pattern',
      },
    ],
    migrationVersion: {
      dashboard: '7.14.0',
    },
    attributes: {
      title: i18n.translate('home.sampleData.ecommerceSpec.revenueDashboardTitle', {
        defaultMessage: '[eCommerce] Revenue Dashboard',
      }),
      hits: 0,
      description: i18n.translate('home.sampleData.ecommerceSpec.revenueDashboardDescription', {
        defaultMessage: 'Analyze mock eCommerce orders and revenue',
      }),
      optionsJSON: '{"hidePanelTitles":false,"useMargins":true}',
      panelsJSON:
        '[{"version":"7.14.0","type":"visualization","gridData":{"x":0,"y":22,"w":24,"h":10,"i":"5"},"panelIndex":"5","embeddableConfig":{"enhancements":{}},"panelRefName":"panel_5"},{"version":"7.14.0","type":"visualization","gridData":{"x":36,"y":15,"w":12,"h":7,"i":"7"},"panelIndex":"7","embeddableConfig":{"enhancements":{}},"panelRefName":"panel_7"},{"version":"7.14.0","type":"search","gridData":{"x":0,"y":55,"w":48,"h":18,"i":"10"},"panelIndex":"10","embeddableConfig":{"enhancements":{}},"panelRefName":"panel_10"},{"version":"7.14.0","type":"map","gridData":{"x":0,"y":32,"w":24,"h":14,"i":"11"},"panelIndex":"11","embeddableConfig":{"isLayerTOCOpen":false,"enhancements":{},"mapCenter":{"lat":45.88578,"lon":-15.07605,"zoom":2.11},"mapBuffer":{"minLon":-90,"minLat":0,"maxLon":45,"maxLat":66.51326},"openTOCDetails":[],"hiddenLayers":[]},"panelRefName":"panel_11"},{"version":"7.14.0","type":"visualization","gridData":{"x":0,"y":0,"w":18,"h":7,"i":"585b11d3-3461-49a7-8f5b-f56521b9dc8b"},"panelIndex":"585b11d3-3461-49a7-8f5b-f56521b9dc8b","embeddableConfig":{"savedVis":{"title":"[eCommerce] Markdown","description":"","type":"markdown","params":{"fontSize":12,"openLinksInNewTab":false,"markdown":"### Sample eCommerce Data\\nThis dashboard contains sample data for you to play with. You can view it, search it, and interact with the visualizations. For more information about Kibana, check our [docs](https://www.elastic.co/guide/en/kibana/current/index.html)."},"uiState":{},"data":{"aggs":[],"searchSource":{"query":{"query":"","language":"kuery"},"filter":[]}}},"enhancements":{}}},{"version":"7.14.0","type":"visualization","gridData":{"x":18,"y":0,"w":30,"h":7,"i":"a5914d17-81fe-4f27-b240-23ac529c1499"},"panelIndex":"a5914d17-81fe-4f27-b240-23ac529c1499","embeddableConfig":{"savedVis":{"title":"[eCommerce] Controls","description":"","type":"input_control_vis","params":{"controls":[{"id":"1536977437774","fieldName":"manufacturer.keyword","parent":"","label":"Manufacturer","type":"list","options":{"type":"terms","multiselect":true,"dynamicOptions":true,"size":5,"order":"desc"},"indexPatternRefName":"control_a5914d17-81fe-4f27-b240-23ac529c1499_0_index_pattern"},{"id":"1536977465554","fieldName":"category.keyword","parent":"","label":"Category","type":"list","options":{"type":"terms","multiselect":true,"dynamicOptions":true,"size":5,"order":"desc"},"indexPatternRefName":"control_a5914d17-81fe-4f27-b240-23ac529c1499_1_index_pattern"},{"id":"1536977596163","fieldName":"total_quantity","parent":"","label":"Quantity","type":"range","options":{"decimalPlaces":0,"step":1},"indexPatternRefName":"control_a5914d17-81fe-4f27-b240-23ac529c1499_2_index_pattern"}],"updateFiltersOnChange":false,"useTimeFilter":true,"pinFilters":false},"uiState":{},"data":{"aggs":[],"searchSource":{"query":{"query":"","language":"kuery"},"filter":[]}}},"enhancements":{}}},{"version":"7.14.0","type":"lens","gridData":{"x":0,"y":7,"w":24,"h":8,"i":"c65434d6-fe64-460f-b07a-c7d267c856ff"},"panelIndex":"c65434d6-fe64-460f-b07a-c7d267c856ff","embeddableConfig":{"attributes":{"title":"","type":"lens","visualizationType":"lnsXY","state":{"datasourceStates":{"indexpattern":{"layers":{"c7478794-6767-4286-9d65-1c0ecd909dd8":{"columns":{"8289349e-6d1b-4abf-b164-0208183d2c34":{"label":"order_date","dataType":"date","operationType":"date_histogram","sourceField":"order_date","isBucketed":true,"scale":"interval","params":{"interval":"1d"}},"041db33b-5c9c-47f3-a5d3-ef5e255d1663X0":{"label":"Part of Weekly revenue","dataType":"number","operationType":"sum","sourceField":"taxful_total_price","isBucketed":false,"scale":"ratio","customLabel":true},"041db33b-5c9c-47f3-a5d3-ef5e255d1663X1":{"label":"Part of Weekly revenue","dataType":"number","operationType":"math","isBucketed":false,"scale":"ratio","params":{"tinymathAst":{"type":"function","name":"subtract","args":[{"type":"function","name":"divide","args":["041db33b-5c9c-47f3-a5d3-ef5e255d1663X0",10000],"location":{"min":0,"max":32},"text":"sum(taxful_total_price) / 10000 "},1],"location":{"min":0,"max":35},"text":"sum(taxful_total_price) / 10000 - 1"}},"references":["041db33b-5c9c-47f3-a5d3-ef5e255d1663X0"],"customLabel":true},"041db33b-5c9c-47f3-a5d3-ef5e255d1663":{"label":"% of target ($10k)","dataType":"number","operationType":"formula","isBucketed":false,"scale":"ratio","params":{"formula":"sum(taxful_total_price) / 10000 - 1","isFormulaBroken":false,"format":{"id":"percent","params":{"decimals":0}}},"references":["041db33b-5c9c-47f3-a5d3-ef5e255d1663X1"],"customLabel":true}},"columnOrder":["8289349e-6d1b-4abf-b164-0208183d2c34","041db33b-5c9c-47f3-a5d3-ef5e255d1663","041db33b-5c9c-47f3-a5d3-ef5e255d1663X0","041db33b-5c9c-47f3-a5d3-ef5e255d1663X1"],"incompleteColumns":{}}}}},"visualization":{"legend":{"isVisible":true,"position":"right"},"valueLabels":"hide","fittingFunction":"None","yLeftExtent":{"mode":"full"},"yRightExtent":{"mode":"full"},"axisTitlesVisibilitySettings":{"x":false,"yLeft":false,"yRight":true},"tickLabelsVisibilitySettings":{"x":true,"yLeft":true,"yRight":true},"gridlinesVisibilitySettings":{"x":true,"yLeft":true,"yRight":true},"preferredSeriesType":"bar_stacked","layers":[{"layerId":"c7478794-6767-4286-9d65-1c0ecd909dd8","seriesType":"bar_stacked","xAccessor":"8289349e-6d1b-4abf-b164-0208183d2c34","accessors":["041db33b-5c9c-47f3-a5d3-ef5e255d1663"]}]},"query":{"query":"","language":"kuery"},"filters":[]},"references":[{"type":"index-pattern","id":"ff959d40-b880-11e8-a6d9-e546fe2bba5f","name":"indexpattern-datasource-current-indexpattern"},{"type":"index-pattern","id":"ff959d40-b880-11e8-a6d9-e546fe2bba5f","name":"indexpattern-datasource-layer-c7478794-6767-4286-9d65-1c0ecd909dd8"}]},"enhancements":{},"hidePanelTitles":false},"title":"% of target revenue ($10k)"},{"version":"7.14.0","type":"lens","gridData":{"x":24,"y":7,"w":12,"h":8,"i":"2e6ef14d-7b03-46d4-a6b8-a962ee36a805"},"panelIndex":"2e6ef14d-7b03-46d4-a6b8-a962ee36a805","embeddableConfig":{"attributes":{"title":"","type":"lens","visualizationType":"lnsMetric","state":{"datasourceStates":{"indexpattern":{"layers":{"c7478794-6767-4286-9d65-1c0ecd909dd8":{"columns":{"041db33b-5c9c-47f3-a5d3-ef5e255d1663":{"label":"Sum of revenue","dataType":"number","operationType":"sum","sourceField":"taxful_total_price","isBucketed":false,"scale":"ratio","customLabel":true}},"columnOrder":["041db33b-5c9c-47f3-a5d3-ef5e255d1663"],"incompleteColumns":{}}}}},"visualization":{"layerId":"c7478794-6767-4286-9d65-1c0ecd909dd8","accessor":"041db33b-5c9c-47f3-a5d3-ef5e255d1663"},"query":{"query":"","language":"kuery"},"filters":[]},"references":[{"type":"index-pattern","id":"ff959d40-b880-11e8-a6d9-e546fe2bba5f","name":"indexpattern-datasource-current-indexpattern"},{"type":"index-pattern","id":"ff959d40-b880-11e8-a6d9-e546fe2bba5f","name":"indexpattern-datasource-layer-c7478794-6767-4286-9d65-1c0ecd909dd8"}]},"enhancements":{}}},{"version":"7.14.0","type":"lens","gridData":{"x":36,"y":7,"w":12,"h":8,"i":"5108a3bc-d1cf-4255-8c95-2df52577b956"},"panelIndex":"5108a3bc-d1cf-4255-8c95-2df52577b956","embeddableConfig":{"attributes":{"title":"","type":"lens","visualizationType":"lnsMetric","state":{"datasourceStates":{"indexpattern":{"layers":{"4fb42a8e-b133-43c8-805c-a38472053938":{"columns":{"020bbfdf-9ef8-4802-aa9e-342d2ea0bebf":{"label":"Median spending","dataType":"number","operationType":"median","sourceField":"taxful_total_price","isBucketed":false,"scale":"ratio","customLabel":true}},"columnOrder":["020bbfdf-9ef8-4802-aa9e-342d2ea0bebf"],"incompleteColumns":{}}}}},"visualization":{"layerId":"4fb42a8e-b133-43c8-805c-a38472053938","accessor":"020bbfdf-9ef8-4802-aa9e-342d2ea0bebf"},"query":{"query":"","language":"kuery"},"filters":[]},"references":[{"type":"index-pattern","id":"ff959d40-b880-11e8-a6d9-e546fe2bba5f","name":"indexpattern-datasource-current-indexpattern"},{"type":"index-pattern","id":"ff959d40-b880-11e8-a6d9-e546fe2bba5f","name":"indexpattern-datasource-layer-4fb42a8e-b133-43c8-805c-a38472053938"}]},"enhancements":{}}},{"version":"7.14.0","type":"lens","gridData":{"x":0,"y":15,"w":24,"h":7,"i":"6bc3fa4a-8f1b-436f-afc1-f3516ee531ce"},"panelIndex":"6bc3fa4a-8f1b-436f-afc1-f3516ee531ce","embeddableConfig":{"attributes":{"title":"","type":"lens","visualizationType":"lnsXY","state":{"datasourceStates":{"indexpattern":{"layers":{"b6093a53-884f-42c2-9fcc-ba56cfb66c53":{"columns":{"15c45f89-a149-443a-a830-aa8c3a9317db":{"label":"order_date","dataType":"date","operationType":"date_histogram","sourceField":"order_date","isBucketed":true,"scale":"interval","params":{"interval":"1d"}},"2b41b3d8-2f62-407a-a866-960f254c679d":{"label":"Total items","dataType":"number","operationType":"sum","sourceField":"products.quantity","isBucketed":false,"scale":"ratio","customLabel":true},"ddc92e50-4d5c-413e-b91b-3e504889fa65":{"label":"Transactions","dataType":"number","operationType":"count","isBucketed":false,"scale":"ratio","sourceField":"Records","customLabel":true},"eadae280-2da3-4d1d-a0e1-f9733f89c15b":{"label":"Last week","dataType":"number","operationType":"sum","sourceField":"products.quantity","isBucketed":false,"scale":"ratio","timeShift":"1w","customLabel":true},"5e31e5d3-2aaa-4475-a130-3b69bf2f748a":{"label":"Tx. last week","dataType":"number","operationType":"count","isBucketed":false,"scale":"ratio","sourceField":"Records","timeShift":"1w","customLabel":true}},"columnOrder":["15c45f89-a149-443a-a830-aa8c3a9317db","2b41b3d8-2f62-407a-a866-960f254c679d","eadae280-2da3-4d1d-a0e1-f9733f89c15b","ddc92e50-4d5c-413e-b91b-3e504889fa65","5e31e5d3-2aaa-4475-a130-3b69bf2f748a"],"incompleteColumns":{}}}}},"visualization":{"legend":{"isVisible":true,"position":"right"},"valueLabels":"hide","fittingFunction":"None","yLeftExtent":{"mode":"full"},"yRightExtent":{"mode":"full"},"axisTitlesVisibilitySettings":{"x":false,"yLeft":false,"yRight":true},"tickLabelsVisibilitySettings":{"x":true,"yLeft":true,"yRight":true},"gridlinesVisibilitySettings":{"x":true,"yLeft":true,"yRight":true},"preferredSeriesType":"line","layers":[{"layerId":"b6093a53-884f-42c2-9fcc-ba56cfb66c53","accessors":["2b41b3d8-2f62-407a-a866-960f254c679d","eadae280-2da3-4d1d-a0e1-f9733f89c15b","5e31e5d3-2aaa-4475-a130-3b69bf2f748a","ddc92e50-4d5c-413e-b91b-3e504889fa65"],"position":"top","seriesType":"line","showGridlines":false,"xAccessor":"15c45f89-a149-443a-a830-aa8c3a9317db","yConfig":[{"forAccessor":"eadae280-2da3-4d1d-a0e1-f9733f89c15b","color":"#b6e0d5"},{"forAccessor":"5e31e5d3-2aaa-4475-a130-3b69bf2f748a","color":"#edafc4"}]}],"curveType":"LINEAR"},"query":{"query":"","language":"kuery"},"filters":[]},"references":[{"type":"index-pattern","id":"ff959d40-b880-11e8-a6d9-e546fe2bba5f","name":"indexpattern-datasource-current-indexpattern"},{"type":"index-pattern","id":"ff959d40-b880-11e8-a6d9-e546fe2bba5f","name":"indexpattern-datasource-layer-b6093a53-884f-42c2-9fcc-ba56cfb66c53"}]},"enhancements":{}}},{"version":"7.14.0","type":"lens","gridData":{"x":24,"y":15,"w":12,"h":7,"i":"222c1f05-ca21-4e62-a04a-9a059b4534a7"},"panelIndex":"222c1f05-ca21-4e62-a04a-9a059b4534a7","embeddableConfig":{"attributes":{"title":"","type":"lens","visualizationType":"lnsMetric","state":{"datasourceStates":{"indexpattern":{"layers":{"667067a2-7cdf-4f0e-a9fe-eb4f4f1f2f17":{"columns":{"c52c2003-ae58-4604-bae7-52ba0fb38a01":{"label":"Avg. items sold","dataType":"number","operationType":"average","sourceField":"total_quantity","isBucketed":false,"scale":"ratio","params":{"format":{"id":"number","params":{"decimals":1}}},"customLabel":true}},"columnOrder":["c52c2003-ae58-4604-bae7-52ba0fb38a01"],"incompleteColumns":{}}}}},"visualization":{"layerId":"667067a2-7cdf-4f0e-a9fe-eb4f4f1f2f17","accessor":"c52c2003-ae58-4604-bae7-52ba0fb38a01"},"query":{"query":"","language":"kuery"},"filters":[]},"references":[{"type":"index-pattern","id":"ff959d40-b880-11e8-a6d9-e546fe2bba5f","name":"indexpattern-datasource-current-indexpattern"},{"type":"index-pattern","id":"ff959d40-b880-11e8-a6d9-e546fe2bba5f","name":"indexpattern-datasource-layer-667067a2-7cdf-4f0e-a9fe-eb4f4f1f2f17"}]},"enhancements":{}}},{"version":"7.14.0","type":"lens","gridData":{"x":24,"y":22,"w":24,"h":10,"i":"003bdfc7-4d9e-4bd0-b088-3b18f79588d1"},"panelIndex":"003bdfc7-4d9e-4bd0-b088-3b18f79588d1","embeddableConfig":{"attributes":{"title":"","type":"lens","visualizationType":"lnsXY","state":{"datasourceStates":{"indexpattern":{"layers":{"97c63ea6-9305-4755-97d1-0f26817c6f9a":{"columns":{"9f61a7df-198e-4754-b34c-81ed544136ba":{"label":"Top values of category.keyword","dataType":"string","operationType":"terms","scale":"ordinal","sourceField":"category.keyword","isBucketed":true,"params":{"size":10,"orderBy":{"type":"column","columnId":"5575214b-7f21-4b6c-8bc1-34433c6a0c58"},"orderDirection":"desc","otherBucket":true,"missingBucket":false}},"ebcb19af-0900-4439-949f-d8cd9bccde19":{"label":"order_date","dataType":"date","operationType":"date_histogram","sourceField":"order_date","isBucketed":true,"scale":"interval","params":{"interval":"1d"}},"5575214b-7f21-4b6c-8bc1-34433c6a0c58":{"label":"Count of records","dataType":"number","operationType":"count","isBucketed":false,"scale":"ratio","sourceField":"Records"}},"columnOrder":["9f61a7df-198e-4754-b34c-81ed544136ba","ebcb19af-0900-4439-949f-d8cd9bccde19","5575214b-7f21-4b6c-8bc1-34433c6a0c58"],"incompleteColumns":{}}}}},"visualization":{"legend":{"isVisible":true,"position":"right"},"valueLabels":"inside","fittingFunction":"None","yLeftExtent":{"mode":"full"},"yRightExtent":{"mode":"full"},"axisTitlesVisibilitySettings":{"x":false,"yLeft":false,"yRight":true},"tickLabelsVisibilitySettings":{"x":true,"yLeft":true,"yRight":true},"gridlinesVisibilitySettings":{"x":true,"yLeft":true,"yRight":true},"preferredSeriesType":"bar_percentage_stacked","layers":[{"layerId":"97c63ea6-9305-4755-97d1-0f26817c6f9a","accessors":["5575214b-7f21-4b6c-8bc1-34433c6a0c58"],"position":"top","seriesType":"bar_percentage_stacked","showGridlines":false,"xAccessor":"ebcb19af-0900-4439-949f-d8cd9bccde19","splitAccessor":"9f61a7df-198e-4754-b34c-81ed544136ba"}]},"query":{"query":"","language":"kuery"},"filters":[]},"references":[{"type":"index-pattern","id":"ff959d40-b880-11e8-a6d9-e546fe2bba5f","name":"indexpattern-datasource-current-indexpattern"},{"type":"index-pattern","id":"ff959d40-b880-11e8-a6d9-e546fe2bba5f","name":"indexpattern-datasource-layer-97c63ea6-9305-4755-97d1-0f26817c6f9a"}]},"enhancements":{}}},{"version":"7.14.0","type":"lens","gridData":{"x":24,"y":32,"w":24,"h":14,"i":"a885226c-6830-4731-88a0-8c1d1047841e"},"panelIndex":"a885226c-6830-4731-88a0-8c1d1047841e","embeddableConfig":{"attributes":{"title":"","type":"lens","visualizationType":"lnsDatatable","state":{"datasourceStates":{"indexpattern":{"layers":{"0731ee8b-31c5-4be9-92d9-69ee760465d7":{"columns":{"7bf8f089-1542-40bd-b349-45fdfc309ac6":{"label":"order_date","dataType":"date","operationType":"date_histogram","sourceField":"order_date","isBucketed":true,"scale":"interval","params":{"interval":"1d"}},"826b2f39-b616-40b2-a222-972fdc1d7596":{"label":"This week","dataType":"number","operationType":"sum","sourceField":"taxful_total_price","isBucketed":false,"scale":"ratio","customLabel":true},"cfd45c47-fc41-430c-9e7a-b71dc0c916b0":{"label":"1 week ago","dataType":"number","operationType":"sum","sourceField":"taxful_total_price","isBucketed":false,"scale":"ratio","timeShift":"1w","customLabel":true},"bf51c1af-443e-49f4-a21f-54c87bfc5677X0":{"label":"Part of Difference","dataType":"number","operationType":"sum","sourceField":"taxful_total_price","isBucketed":false,"scale":"ratio","customLabel":true},"bf51c1af-443e-49f4-a21f-54c87bfc5677X1":{"label":"Part of Difference","dataType":"number","operationType":"sum","sourceField":"taxful_total_price","isBucketed":false,"scale":"ratio","timeShift":"1w","customLabel":true},"bf51c1af-443e-49f4-a21f-54c87bfc5677X2":{"label":"Part of Difference","dataType":"number","operationType":"math","isBucketed":false,"scale":"ratio","params":{"tinymathAst":{"type":"function","name":"subtract","args":["bf51c1af-443e-49f4-a21f-54c87bfc5677X0","bf51c1af-443e-49f4-a21f-54c87bfc5677X1"],"location":{"min":0,"max":61},"text":"sum(taxful_total_price) - sum(taxful_total_price, shift=\'1w\')"}},"references":["bf51c1af-443e-49f4-a21f-54c87bfc5677X0","bf51c1af-443e-49f4-a21f-54c87bfc5677X1"],"customLabel":true},"bf51c1af-443e-49f4-a21f-54c87bfc5677":{"label":"Difference","dataType":"number","operationType":"formula","isBucketed":false,"scale":"ratio","params":{"formula":"sum(taxful_total_price) - sum(taxful_total_price, shift=\'1w\')","isFormulaBroken":false,"format":{"id":"number","params":{"decimals":2}}},"references":["bf51c1af-443e-49f4-a21f-54c87bfc5677X2"],"customLabel":true}},"columnOrder":["7bf8f089-1542-40bd-b349-45fdfc309ac6","826b2f39-b616-40b2-a222-972fdc1d7596","cfd45c47-fc41-430c-9e7a-b71dc0c916b0","bf51c1af-443e-49f4-a21f-54c87bfc5677","bf51c1af-443e-49f4-a21f-54c87bfc5677X0","bf51c1af-443e-49f4-a21f-54c87bfc5677X1","bf51c1af-443e-49f4-a21f-54c87bfc5677X2"],"incompleteColumns":{}}}}},"visualization":{"layerId":"0731ee8b-31c5-4be9-92d9-69ee760465d7","columns":[{"columnId":"7bf8f089-1542-40bd-b349-45fdfc309ac6"},{"columnId":"826b2f39-b616-40b2-a222-972fdc1d7596","alignment":"left"},{"columnId":"cfd45c47-fc41-430c-9e7a-b71dc0c916b0"},{"columnId":"bf51c1af-443e-49f4-a21f-54c87bfc5677","isTransposed":false,"colorMode":"text","palette":{"name":"custom","type":"palette","params":{"steps":5,"stops":[{"color":"#D36086","stop":0},{"color":"#209280","stop":2249.03125}],"continuity":"above","rangeType":"number","colorStops":[{"color":"#D36086","stop":-10000},{"color":"#209280","stop":0}],"rangeMin":-10000,"rangeMax":0,"name":"custom"}}}]},"query":{"query":"","language":"kuery"},"filters":[]},"references":[{"type":"index-pattern","id":"ff959d40-b880-11e8-a6d9-e546fe2bba5f","name":"indexpattern-datasource-current-indexpattern"},{"type":"index-pattern","id":"ff959d40-b880-11e8-a6d9-e546fe2bba5f","name":"indexpattern-datasource-layer-0731ee8b-31c5-4be9-92d9-69ee760465d7"}]},"enhancements":{}}},{"version":"7.14.0","type":"lens","gridData":{"x":24,"y":46,"w":24,"h":9,"i":"562bb4bd-16b5-4c7e-9dfa-0f24cae6d1ba"},"panelIndex":"562bb4bd-16b5-4c7e-9dfa-0f24cae6d1ba","embeddableConfig":{"attributes":{"title":"","type":"lens","visualizationType":"lnsXY","state":{"datasourceStates":{"indexpattern":{"layers":{"5ed846c2-a70b-4d9c-a244-f254bef763b8":{"columns":{"d77cdd24-dedc-48dd-9a4b-d34c6f1a6c46":{"label":"Product name","dataType":"string","operationType":"terms","scale":"ordinal","sourceField":"products.product_name.keyword","isBucketed":true,"params":{"size":5,"orderBy":{"type":"column","columnId":"7ac31901-277a-46e2-8128-8d684b2c1127"},"orderDirection":"desc","otherBucket":false,"missingBucket":false},"customLabel":true},"7ac31901-277a-46e2-8128-8d684b2c1127":{"label":"Items","dataType":"number","operationType":"count","isBucketed":false,"scale":"ratio","sourceField":"Records","customLabel":true}},"columnOrder":["d77cdd24-dedc-48dd-9a4b-d34c6f1a6c46","7ac31901-277a-46e2-8128-8d684b2c1127"],"incompleteColumns":{}}}}},"visualization":{"legend":{"isVisible":true,"position":"right"},"valueLabels":"inside","fittingFunction":"None","yLeftExtent":{"mode":"full"},"yRightExtent":{"mode":"full"},"axisTitlesVisibilitySettings":{"x":false,"yLeft":true,"yRight":true},"tickLabelsVisibilitySettings":{"x":true,"yLeft":true,"yRight":true},"gridlinesVisibilitySettings":{"x":true,"yLeft":true,"yRight":true},"preferredSeriesType":"bar_horizontal","layers":[{"layerId":"5ed846c2-a70b-4d9c-a244-f254bef763b8","accessors":["7ac31901-277a-46e2-8128-8d684b2c1127"],"position":"top","seriesType":"bar_horizontal","showGridlines":false,"xAccessor":"d77cdd24-dedc-48dd-9a4b-d34c6f1a6c46"}]},"query":{"query":"","language":"kuery"},"filters":[]},"references":[{"type":"index-pattern","id":"ff959d40-b880-11e8-a6d9-e546fe2bba5f","name":"indexpattern-datasource-current-indexpattern"},{"type":"index-pattern","id":"ff959d40-b880-11e8-a6d9-e546fe2bba5f","name":"indexpattern-datasource-layer-5ed846c2-a70b-4d9c-a244-f254bef763b8"}]},"timeRange":{"from":"now-2w","to":"now-1w"},"hidePanelTitles":false,"enhancements":{}},"title":"Top products last week"},{"version":"7.14.0","type":"lens","gridData":{"x":0,"y":46,"w":24,"h":9,"i":"b1697063-c817-4847-aa0d-5bed47137b7e"},"panelIndex":"b1697063-c817-4847-aa0d-5bed47137b7e","embeddableConfig":{"attributes":{"title":"","type":"lens","visualizationType":"lnsXY","state":{"datasourceStates":{"indexpattern":{"layers":{"5ed846c2-a70b-4d9c-a244-f254bef763b8":{"columns":{"d77cdd24-dedc-48dd-9a4b-d34c6f1a6c46":{"label":"Product name","dataType":"string","operationType":"terms","scale":"ordinal","sourceField":"products.product_name.keyword","isBucketed":true,"params":{"size":5,"orderBy":{"type":"column","columnId":"7ac31901-277a-46e2-8128-8d684b2c1127"},"orderDirection":"desc","otherBucket":false,"missingBucket":false},"customLabel":true},"7ac31901-277a-46e2-8128-8d684b2c1127":{"label":"Items","dataType":"number","operationType":"count","isBucketed":false,"scale":"ratio","sourceField":"Records","customLabel":true}},"columnOrder":["d77cdd24-dedc-48dd-9a4b-d34c6f1a6c46","7ac31901-277a-46e2-8128-8d684b2c1127"],"incompleteColumns":{}}}}},"visualization":{"legend":{"isVisible":true,"position":"right"},"valueLabels":"inside","fittingFunction":"None","yLeftExtent":{"mode":"full"},"yRightExtent":{"mode":"full"},"axisTitlesVisibilitySettings":{"x":false,"yLeft":true,"yRight":true},"tickLabelsVisibilitySettings":{"x":true,"yLeft":true,"yRight":true},"gridlinesVisibilitySettings":{"x":true,"yLeft":true,"yRight":true},"preferredSeriesType":"bar_horizontal","layers":[{"layerId":"5ed846c2-a70b-4d9c-a244-f254bef763b8","accessors":["7ac31901-277a-46e2-8128-8d684b2c1127"],"position":"top","seriesType":"bar_horizontal","showGridlines":false,"xAccessor":"d77cdd24-dedc-48dd-9a4b-d34c6f1a6c46"}]},"query":{"query":"","language":"kuery"},"filters":[]},"references":[{"type":"index-pattern","id":"ff959d40-b880-11e8-a6d9-e546fe2bba5f","name":"indexpattern-datasource-current-indexpattern"},{"type":"index-pattern","id":"ff959d40-b880-11e8-a6d9-e546fe2bba5f","name":"indexpattern-datasource-layer-5ed846c2-a70b-4d9c-a244-f254bef763b8"}]},"hidePanelTitles":false,"enhancements":{}},"title":"Top products this week"}]',
      version: 1,
      timeRestore: true,
      timeTo: 'now',
      timeFrom: 'now-7d',
      refreshInterval: {
        pause: true,
        value: 0,
      },
      kibanaSavedObjectMeta: {
        searchSourceJSON: '{"query":{"language":"kuery","query":""},"filter":[]}',
      },
    },
  },
];
