/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
    id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
    coreMigrationVersion: '8.8.0',
    typeMigrationVersion: '7.11.0',
    managed: false,
    references: [],
    type: 'index-pattern',
    updated_at: '2021-08-05T12:23:57.577Z',
    version: 'WzI1LDFd',
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
    id: '3ba638e0-b894-11e8-a6d9-e546fe2bba5f',
    coreMigrationVersion: '8.8.0',
    typeMigrationVersion: '7.9.3',
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
    coreMigrationVersion: '8.8.0',
    typeMigrationVersion: '8.0.0',
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
        '{"title":"[eCommerce] Markdown","type":"markdown","params":{"fontSize":12,"openLinksInNewTab":false,"markdown":"## Sample eCommerce Data\\nThis dashboard contains sample data for you to play with. You can view it, search it, and interact with the visualizations. For more information about Kibana, check our [docs](https://www.elastic.co/guide/en/kibana/current/index.html)."},"aggs":[]}',
    },
    id: 'c00d1f90-f5ea-11eb-a78e-83aac3c38a60',
    coreMigrationVersion: '8.8.0',
    typeMigrationVersion: '7.14.0',
    references: [],
    type: 'visualization',
    updated_at: '2021-08-05T12:43:35.817Z',
    version: 'WzE3MSwxXQ==',
  },
  {
    id: '722b74f0-b882-11e8-a6d9-e546fe2bba5f',
    type: 'dashboard',
    namespaces: ['default'],
    updated_at: '2023-03-24T09:35:21.334Z',
    created_at: '2023-03-24T09:35:21.334Z',
    version: 'WzE3OCwxXQ==',
    attributes: {
      controlGroupInput: {
        controlStyle: 'oneLine',
        chainingSystem: 'HIERARCHICAL',
        panelsJSON:
          '{"1ee1617f-fd8e-45e4-bc6a-d5736710ea20":{"order":0,"width":"small","grow":true,"type":"optionsListControl","explicitInput":{"title":"Manufacturer","fieldName":"manufacturer.keyword","parentFieldName":"manufacturer","id":"1ee1617f-fd8e-45e4-bc6a-d5736710ea20","enhancements":{}}},"afa9fa0f-a002-41a5-bab9-b738316d2590":{"order":1,"width":"small","grow":true,"type":"optionsListControl","explicitInput":{"title":"Category","fieldName":"category.keyword","parentFieldName":"category","id":"afa9fa0f-a002-41a5-bab9-b738316d2590","enhancements":{}}},"d3f766cb-5f96-4a12-8d3c-034e08be8855":{"order":2,"width":"small","grow":true,"type":"rangeSliderControl","explicitInput":{"title":"Quantity","fieldName":"total_quantity","id":"d3f766cb-5f96-4a12-8d3c-034e08be8855","enhancements":{}}}}',
        ignoreParentSettingsJSON:
          '{"ignoreFilters":false,"ignoreQuery":false,"ignoreTimerange":false,"ignoreValidations":false}',
      },
      kibanaSavedObjectMeta: {
        searchSourceJSON: '{"query":{"language":"kuery","query":""},"filter":[]}',
      },
      description: 'Analyze mock eCommerce orders and revenue',
      refreshInterval: {
        pause: true,
        value: 60000,
      },
      timeRestore: true,
      optionsJSON:
        '{"useMargins":true,"syncColors":false,"syncCursor":true,"syncTooltips":false,"hidePanelTitles":false}',
      panelsJSON:
        '[{"version":"8.11.0","type":"lens","gridData":{"x":0,"y":21,"w":24,"h":10,"i":"5"},"panelIndex":"5","embeddableConfig":{"attributes":{"title":"[eCommerce] Promotion Tracking (converted)","visualizationType":"lnsXY","type":"lens","references":[{"type":"index-pattern","id":"ff959d40-b880-11e8-a6d9-e546fe2bba5f","name":"indexpattern-datasource-layer-e3b3cb5c-e3b1-497f-a5d5-fddb0dabc94e"},{"type":"index-pattern","id":"ff959d40-b880-11e8-a6d9-e546fe2bba5f","name":"indexpattern-datasource-layer-1d08a43c-8913-4692-a3e0-8d77902f6e46"},{"type":"index-pattern","id":"ff959d40-b880-11e8-a6d9-e546fe2bba5f","name":"indexpattern-datasource-layer-9725cdbd-a9f3-479f-a349-0f11244e5239"},{"type":"index-pattern","id":"ff959d40-b880-11e8-a6d9-e546fe2bba5f","name":"indexpattern-datasource-layer-2031d0f8-01fc-4009-b1ad-a7b7ca9266c0"},{"type":"index-pattern","id":"ff959d40-b880-11e8-a6d9-e546fe2bba5f","name":"xy-visualization-layer-192ad2e4-2bb7-44a9-b345-e96045fa6ccd"}],"state":{"visualization":{"legend":{"isVisible":true,"showSingleSeries":true,"position":"bottom","shouldTruncate":true,"maxLines":1},"valueLabels":"hide","fittingFunction":"None","fillOpacity":0,"yLeftExtent":{"mode":"full"},"yRightExtent":{"mode":"full"},"yLeftScale":"linear","yRightScale":"linear","axisTitlesVisibilitySettings":{"x":true,"yLeft":true,"yRight":true},"tickLabelsVisibilitySettings":{"x":true,"yLeft":true,"yRight":true},"labelsOrientation":{"x":0,"yLeft":0,"yRight":0},"gridlinesVisibilitySettings":{"x":true,"yLeft":true,"yRight":true},"preferredSeriesType":"bar_stacked","layers":[{"seriesType":"line","layerType":"data","layerId":"e3b3cb5c-e3b1-497f-a5d5-fddb0dabc94e","accessors":["a69956c9-43cd-4756-a3c0-e93cb1502a0b"],"yConfig":[{"forAccessor":"a69956c9-43cd-4756-a3c0-e93cb1502a0b","color":"rgba(211,96,134,1)","axisMode":"left"}],"xAccessor":"f3cc8168-6360-4727-a410-a57f5a325091","palette":{"name":"default","type":"palette"}},{"seriesType":"line","layerType":"data","layerId":"1d08a43c-8913-4692-a3e0-8d77902f6e46","accessors":["9a3d8abd-81a5-40ae-9616-020d5a5b2ee2"],"yConfig":[{"forAccessor":"9a3d8abd-81a5-40ae-9616-020d5a5b2ee2","color":"rgba(84,179,153,1)","axisMode":"left"}],"xAccessor":"644b06ea-73a3-47b1-9b40-3035844c4621","palette":{"name":"default","type":"palette"}},{"seriesType":"line","layerType":"data","layerId":"9725cdbd-a9f3-479f-a349-0f11244e5239","accessors":["b5588228-9c46-4a4b-92ee-d140c327bca0"],"yConfig":[{"forAccessor":"b5588228-9c46-4a4b-92ee-d140c327bca0","color":"rgba(96,146,192,1)","axisMode":"left"}],"xAccessor":"6749b404-4784-4fd6-8bf6-5712e84c7310","palette":{"name":"default","type":"palette"}},{"seriesType":"line","layerType":"data","layerId":"2031d0f8-01fc-4009-b1ad-a7b7ca9266c0","accessors":["985e05c0-3a0b-4e55-84bb-1f02128388a9"],"yConfig":[{"forAccessor":"985e05c0-3a0b-4e55-84bb-1f02128388a9","color":"rgba(202,142,174,1)","axisMode":"left"}],"xAccessor":"1b199cb1-b47f-48e6-b209-74eb81b303f5","palette":{"name":"default","type":"palette"}},{"layerId":"192ad2e4-2bb7-44a9-b345-e96045fa6ccd","layerType":"annotations","ignoreGlobalFilters":true,"annotations":[{"type":"query","id":"c8c30be0-b88f-11e8-a451-f37365e9f268","label":"Event","key":{"type":"point_in_time"},"color":"#194D33","timeField":"order_date","icon":"bell","filter":{"type":"kibana_query","query":"taxful_total_price:>250","language":"lucene"},"extraFields":["taxful_total_price"]}]}]},"query":{"query":"","language":"kuery"},"filters":[],"datasourceStates":{"formBased":{"layers":{"e3b3cb5c-e3b1-497f-a5d5-fddb0dabc94e":{"columns":{"f3cc8168-6360-4727-a410-a57f5a325091":{"label":"order_date","dataType":"date","operationType":"date_histogram","sourceField":"order_date","isBucketed":true,"scale":"interval","params":{"interval":"12h","includeEmptyRows":true,"dropPartials":false}},"a69956c9-43cd-4756-a3c0-e93cb1502a0b":{"label":"Revenue Trousers","dataType":"number","operationType":"sum","sourceField":"taxful_total_price","isBucketed":false,"scale":"ratio","filter":{"query":"products.product_name:*trouser*","language":"lucene"},"params":{"format":{"id":"number"},"emptyAsNull":true},"customLabel":true}},"columnOrder":["f3cc8168-6360-4727-a410-a57f5a325091","a69956c9-43cd-4756-a3c0-e93cb1502a0b"],"incompleteColumns":{}},"1d08a43c-8913-4692-a3e0-8d77902f6e46":{"columns":{"644b06ea-73a3-47b1-9b40-3035844c4621":{"label":"order_date","dataType":"date","operationType":"date_histogram","sourceField":"order_date","isBucketed":true,"scale":"interval","params":{"interval":"12h","includeEmptyRows":true,"dropPartials":false}},"9a3d8abd-81a5-40ae-9616-020d5a5b2ee2":{"label":"Revenue Watches","dataType":"number","operationType":"sum","sourceField":"taxful_total_price","isBucketed":false,"scale":"ratio","filter":{"query":"products.product_name:*watch*","language":"lucene"},"params":{"format":{"id":"number"},"emptyAsNull":true},"customLabel":true}},"columnOrder":["644b06ea-73a3-47b1-9b40-3035844c4621","9a3d8abd-81a5-40ae-9616-020d5a5b2ee2"],"incompleteColumns":{}},"9725cdbd-a9f3-479f-a349-0f11244e5239":{"columns":{"6749b404-4784-4fd6-8bf6-5712e84c7310":{"label":"order_date","dataType":"date","operationType":"date_histogram","sourceField":"order_date","isBucketed":true,"scale":"interval","params":{"interval":"12h","includeEmptyRows":true,"dropPartials":false}},"b5588228-9c46-4a4b-92ee-d140c327bca0":{"label":"Revenue Bags","dataType":"number","operationType":"sum","sourceField":"taxful_total_price","isBucketed":false,"scale":"ratio","filter":{"query":"products.product_name:*bag*","language":"lucene"},"params":{"format":{"id":"number"},"emptyAsNull":true},"customLabel":true}},"columnOrder":["6749b404-4784-4fd6-8bf6-5712e84c7310","b5588228-9c46-4a4b-92ee-d140c327bca0"],"incompleteColumns":{}},"2031d0f8-01fc-4009-b1ad-a7b7ca9266c0":{"columns":{"1b199cb1-b47f-48e6-b209-74eb81b303f5":{"label":"order_date","dataType":"date","operationType":"date_histogram","sourceField":"order_date","isBucketed":true,"scale":"interval","params":{"interval":"12h","includeEmptyRows":true,"dropPartials":false}},"985e05c0-3a0b-4e55-84bb-1f02128388a9":{"label":"Revenue Cocktail Dresses","dataType":"number","operationType":"sum","sourceField":"taxful_total_price","isBucketed":false,"scale":"ratio","filter":{"query":"products.product_name:*cocktail dress*","language":"lucene"},"params":{"format":{"id":"number"},"emptyAsNull":true},"customLabel":true}},"columnOrder":["1b199cb1-b47f-48e6-b209-74eb81b303f5","985e05c0-3a0b-4e55-84bb-1f02128388a9"],"incompleteColumns":{}}}},"textBased":{"layers":{}}},"internalReferences":[],"adHocDataViews":{}}},"hidePanelTitles":false,"enhancements":{}},"title":"[eCommerce] Promotion Tracking"},{"version":"8.11.0","type":"lens","gridData":{"x":36,"y":7,"w":12,"h":7,"i":"7"},"panelIndex":"7","embeddableConfig":{"attributes":{"title":"Sold Products per Day","description":"","visualizationType":"lnsMetric","type":"lens","references":[{"type":"index-pattern","id":"ff959d40-b880-11e8-a6d9-e546fe2bba5f","name":"indexpattern-datasource-layer-037375ae-9e23-4dd5-a4f0-5f117bb7dac1"}],"state":{"visualization":{"layerId":"037375ae-9e23-4dd5-a4f0-5f117bb7dac1","layerType":"data","metricAccessor":"c27bd77c-68e2-4d75-8fda-41c45d22f8d4","maxAccessor":"ce816876-e92d-4b1a-bbb0-ed7637fc0eea","showBar":true,"color":"#68BC00"},"query":{"query":"","language":"kuery"},"filters":[],"datasourceStates":{"formBased":{"layers":{"037375ae-9e23-4dd5-a4f0-5f117bb7dac1":{"ignoreGlobalFilters":false,"columns":{"c27bd77c-68e2-4d75-8fda-41c45d22f8d4X0":{"label":"Part of count() / (time_range() / 1000 / 60 / 60 / 24)","dataType":"number","operationType":"count","isBucketed":false,"scale":"ratio","sourceField":"___records___","params":{"emptyAsNull":false},"customLabel":true},"c27bd77c-68e2-4d75-8fda-41c45d22f8d4X1":{"label":"Part of count() / (time_range() / 1000 / 60 / 60 / 24)","dataType":"number","operationType":"time_range","isBucketed":false,"scale":"ratio","references":[],"customLabel":true},"c27bd77c-68e2-4d75-8fda-41c45d22f8d4X2":{"label":"Part of count() / (time_range() / 1000 / 60 / 60 / 24)","dataType":"number","operationType":"math","isBucketed":false,"scale":"ratio","params":{"tinymathAst":{"type":"function","name":"divide","args":["c27bd77c-68e2-4d75-8fda-41c45d22f8d4X0",{"type":"function","name":"divide","args":[{"type":"function","name":"divide","args":[{"type":"function","name":"divide","args":[{"type":"function","name":"divide","args":["c27bd77c-68e2-4d75-8fda-41c45d22f8d4X1",1000]},60]},60]},24],"location":{"min":11,"max":45},"text":"time_range() / 1000 / 60 / 60 / 24"}],"location":{"min":0,"max":46},"text":"count() / (time_range() / 1000 / 60 / 60 / 24)"}},"references":["c27bd77c-68e2-4d75-8fda-41c45d22f8d4X0","c27bd77c-68e2-4d75-8fda-41c45d22f8d4X1"],"customLabel":true},"c27bd77c-68e2-4d75-8fda-41c45d22f8d4":{"label":"Trxns / day","dataType":"number","operationType":"formula","isBucketed":false,"scale":"ratio","params":{"format":{"id":"number"},"formula":"count() / (time_range() / 1000 / 60 / 60 / 24)","isFormulaBroken":false},"references":["c27bd77c-68e2-4d75-8fda-41c45d22f8d4X2"],"customLabel":true},"ce816876-e92d-4b1a-bbb0-ed7637fc0eea":{"label":"Static value: 300","dataType":"number","operationType":"static_value","isStaticValue":true,"isBucketed":false,"scale":"ratio","params":{"value":"300"},"references":[]}},"columnOrder":["c27bd77c-68e2-4d75-8fda-41c45d22f8d4X0","c27bd77c-68e2-4d75-8fda-41c45d22f8d4X1","c27bd77c-68e2-4d75-8fda-41c45d22f8d4X2","c27bd77c-68e2-4d75-8fda-41c45d22f8d4","ce816876-e92d-4b1a-bbb0-ed7637fc0eea"],"incompleteColumns":{}}}},"indexpattern":{"layers":{}},"textBased":{"layers":{}}},"internalReferences":[],"adHocDataViews":{}}},"timeRange":{"from":"now-7d","to":"now"},"enhancements":{}}},{"version":"8.11.0","type":"search","gridData":{"x":0,"y":54,"w":48,"h":18,"i":"10"},"panelIndex":"10","embeddableConfig":{"enhancements":{}},"panelRefName":"panel_10"},{"version":"8.11.0","type":"map","gridData":{"x":0,"y":31,"w":24,"h":14,"i":"11"},"panelIndex":"11","embeddableConfig":{"isLayerTOCOpen":false,"hiddenLayers":[],"mapCenter":{"lat":45.88578,"lon":-15.07605,"zoom":2.11},"openTOCDetails":[],"enhancements":{}},"panelRefName":"panel_11"},{"version":"8.11.0","type":"visualization","gridData":{"x":0,"y":0,"w":24,"h":7,"i":"a71cf076-6895-491c-8878-63592e429ed5"},"panelIndex":"a71cf076-6895-491c-8878-63592e429ed5","embeddableConfig":{"enhancements":{}},"panelRefName":"panel_a71cf076-6895-491c-8878-63592e429ed5"},{"version":"8.11.0","type":"lens","gridData":{"x":24,"y":0,"w":12,"h":7,"i":"75283285-dffd-48a7-a0c2-2235184b5282"},"panelIndex":"75283285-dffd-48a7-a0c2-2235184b5282","embeddableConfig":{"enhancements":{},"attributes":{"visualizationType":"lnsMetric","state":{"visualization":{"layerId":"c7478794-6767-4286-9d65-1c0ecd909dd8","layerType":"data","metricAccessor":"041db33b-5c9c-47f3-a5d3-ef5e255d1663"},"query":{"language":"kuery","query":""},"filters":[],"datasourceStates":{"formBased":{"layers":{"c7478794-6767-4286-9d65-1c0ecd909dd8":{"columnOrder":["041db33b-5c9c-47f3-a5d3-ef5e255d1663"],"columns":{"041db33b-5c9c-47f3-a5d3-ef5e255d1663":{"customLabel":true,"dataType":"number","isBucketed":false,"label":"Sum of revenue","operationType":"sum","scale":"ratio","sourceField":"taxful_total_price","params":{}}},"incompleteColumns":{}}}}},"internalReferences":[],"adHocDataViews":{}},"references":[{"type":"index-pattern","id":"ff959d40-b880-11e8-a6d9-e546fe2bba5f","name":"indexpattern-datasource-layer-c7478794-6767-4286-9d65-1c0ecd909dd8"}]},"hidePanelTitles":true},"title":"Sum of revenue"},{"version":"8.11.0","type":"lens","gridData":{"x":36,"y":0,"w":12,"h":7,"i":"58774330-b1b3-42dd-a04c-fbce9cc4d288"},"panelIndex":"58774330-b1b3-42dd-a04c-fbce9cc4d288","embeddableConfig":{"enhancements":{},"attributes":{"title":"Median spending","visualizationType":"lnsMetric","type":"lens","references":[{"type":"index-pattern","id":"ff959d40-b880-11e8-a6d9-e546fe2bba5f","name":"indexpattern-datasource-layer-4fb42a8e-b133-43c8-805c-a38472053938"}],"state":{"visualization":{"layerId":"4fb42a8e-b133-43c8-805c-a38472053938","layerType":"data","metricAccessor":"020bbfdf-9ef8-4802-aa9e-342d2ea0bebf"},"query":{"language":"kuery","query":""},"filters":[],"datasourceStates":{"formBased":{"layers":{"4fb42a8e-b133-43c8-805c-a38472053938":{"columnOrder":["020bbfdf-9ef8-4802-aa9e-342d2ea0bebf"],"columns":{"020bbfdf-9ef8-4802-aa9e-342d2ea0bebf":{"customLabel":true,"dataType":"number","isBucketed":false,"label":"Median spending","operationType":"median","scale":"ratio","sourceField":"taxful_total_price","params":{}}},"incompleteColumns":{}}}}},"internalReferences":[],"adHocDataViews":{}}},"hidePanelTitles":true},"title":"Median spending"},{"version":"8.11.0","type":"lens","gridData":{"x":24,"y":7,"w":12,"h":7,"i":"b63ec47d-aace-4980-b928-6be8adafa5a4"},"panelIndex":"b63ec47d-aace-4980-b928-6be8adafa5a4","embeddableConfig":{"enhancements":{},"attributes":{"visualizationType":"lnsMetric","state":{"visualization":{"layerId":"667067a2-7cdf-4f0e-a9fe-eb4f4f1f2f17","layerType":"data","metricAccessor":"c52c2003-ae58-4604-bae7-52ba0fb38a01"},"query":{"language":"kuery","query":""},"filters":[],"datasourceStates":{"formBased":{"layers":{"667067a2-7cdf-4f0e-a9fe-eb4f4f1f2f17":{"columnOrder":["c52c2003-ae58-4604-bae7-52ba0fb38a01"],"columns":{"c52c2003-ae58-4604-bae7-52ba0fb38a01":{"customLabel":true,"dataType":"number","isBucketed":false,"label":"Avg. items sold","operationType":"average","params":{"format":{"id":"number","params":{"decimals":1,"compact":true}}},"scale":"ratio","sourceField":"total_quantity"}},"incompleteColumns":{}}}}},"internalReferences":[],"adHocDataViews":{}},"references":[{"type":"index-pattern","id":"ff959d40-b880-11e8-a6d9-e546fe2bba5f","name":"indexpattern-datasource-layer-667067a2-7cdf-4f0e-a9fe-eb4f4f1f2f17"}]},"hidePanelTitles":true},"title":"Avg. items sold"},{"version":"8.11.0","type":"lens","gridData":{"x":0,"y":14,"w":24,"h":7,"i":"d9495793-80ba-4a9a-b0e3-d1155ec99b09"},"panelIndex":"d9495793-80ba-4a9a-b0e3-d1155ec99b09","embeddableConfig":{"enhancements":{},"attributes":{"state":{"datasourceStates":{"formBased":{"layers":{"b6093a53-884f-42c2-9fcc-ba56cfb66c53":{"columnOrder":["15c45f89-a149-443a-a830-aa8c3a9317db","2b41b3d8-2f62-407a-a866-960f254c679d","eadae280-2da3-4d1d-a0e1-f9733f89c15b","ddc92e50-4d5c-413e-b91b-3e504889fa65","5e31e5d3-2aaa-4475-a130-3b69bf2f748a"],"columns":{"15c45f89-a149-443a-a830-aa8c3a9317db":{"dataType":"date","isBucketed":true,"label":"order_date","operationType":"date_histogram","params":{"interval":"1d","includeEmptyRows":true},"scale":"interval","sourceField":"order_date"},"2b41b3d8-2f62-407a-a866-960f254c679d":{"customLabel":true,"dataType":"number","isBucketed":false,"label":"Total items","operationType":"sum","scale":"ratio","sourceField":"products.quantity"},"5e31e5d3-2aaa-4475-a130-3b69bf2f748a":{"customLabel":true,"dataType":"number","isBucketed":false,"label":"Tx. last week","operationType":"count","scale":"ratio","sourceField":"___records___","timeShift":"1w"},"ddc92e50-4d5c-413e-b91b-3e504889fa65":{"customLabel":true,"dataType":"number","isBucketed":false,"label":"Transactions","operationType":"count","scale":"ratio","sourceField":"___records___"},"eadae280-2da3-4d1d-a0e1-f9733f89c15b":{"customLabel":true,"dataType":"number","isBucketed":false,"label":"Last week","operationType":"sum","scale":"ratio","sourceField":"products.quantity","timeShift":"1w"}},"incompleteColumns":{}}}}},"filters":[],"query":{"language":"kuery","query":""},"visualization":{"axisTitlesVisibilitySettings":{"x":false,"yLeft":false,"yRight":true},"curveType":"LINEAR","fittingFunction":"None","gridlinesVisibilitySettings":{"x":true,"yLeft":true,"yRight":true},"layers":[{"accessors":["2b41b3d8-2f62-407a-a866-960f254c679d","eadae280-2da3-4d1d-a0e1-f9733f89c15b","5e31e5d3-2aaa-4475-a130-3b69bf2f748a","ddc92e50-4d5c-413e-b91b-3e504889fa65"],"layerId":"b6093a53-884f-42c2-9fcc-ba56cfb66c53","position":"top","seriesType":"line","showGridlines":false,"xAccessor":"15c45f89-a149-443a-a830-aa8c3a9317db","yConfig":[{"color":"#b6e0d5","forAccessor":"eadae280-2da3-4d1d-a0e1-f9733f89c15b"},{"color":"#edafc4","forAccessor":"5e31e5d3-2aaa-4475-a130-3b69bf2f748a"}],"layerType":"data"}],"legend":{"isVisible":true,"position":"right","legendSize":"auto"},"preferredSeriesType":"line","tickLabelsVisibilitySettings":{"x":true,"yLeft":true,"yRight":true},"valueLabels":"hide","yLeftExtent":{"mode":"full"},"yRightExtent":{"mode":"full"}}},"visualizationType":"lnsXY","references":[{"id":"ff959d40-b880-11e8-a6d9-e546fe2bba5f","name":"indexpattern-datasource-current-indexpattern","type":"index-pattern"},{"id":"ff959d40-b880-11e8-a6d9-e546fe2bba5f","name":"indexpattern-datasource-layer-b6093a53-884f-42c2-9fcc-ba56cfb66c53","type":"index-pattern"}]}},"title":"Transactions per day"},{"version":"8.11.0","type":"lens","gridData":{"x":24,"y":31,"w":24,"h":14,"i":"bda054f7-2d06-4936-b461-365d1be621fa"},"panelIndex":"bda054f7-2d06-4936-b461-365d1be621fa","embeddableConfig":{"enhancements":{},"attributes":{"state":{"datasourceStates":{"formBased":{"layers":{"0731ee8b-31c5-4be9-92d9-69ee760465d7":{"columnOrder":["7bf8f089-1542-40bd-b349-45fdfc309ac6","826b2f39-b616-40b2-a222-972fdc1d7596","cfd45c47-fc41-430c-9e7a-b71dc0c916b0","bf51c1af-443e-49f4-a21f-54c87bfc5677","bf51c1af-443e-49f4-a21f-54c87bfc5677X0","bf51c1af-443e-49f4-a21f-54c87bfc5677X1","bf51c1af-443e-49f4-a21f-54c87bfc5677X2"],"columns":{"7bf8f089-1542-40bd-b349-45fdfc309ac6":{"dataType":"date","isBucketed":true,"label":"order_date","operationType":"date_histogram","params":{"interval":"1d","includeEmptyRows":true},"scale":"interval","sourceField":"order_date"},"826b2f39-b616-40b2-a222-972fdc1d7596":{"customLabel":true,"dataType":"number","isBucketed":false,"label":"This week","operationType":"sum","scale":"ratio","sourceField":"taxful_total_price"},"bf51c1af-443e-49f4-a21f-54c87bfc5677":{"customLabel":true,"dataType":"number","isBucketed":false,"label":"Difference","operationType":"formula","params":{"format":{"id":"number","params":{"decimals":2}},"formula":"sum(taxful_total_price) - sum(taxful_total_price, shift=\'1w\')","isFormulaBroken":false},"references":["bf51c1af-443e-49f4-a21f-54c87bfc5677X2"],"scale":"ratio"},"bf51c1af-443e-49f4-a21f-54c87bfc5677X0":{"customLabel":true,"dataType":"number","isBucketed":false,"label":"Part of Difference","operationType":"sum","scale":"ratio","sourceField":"taxful_total_price"},"bf51c1af-443e-49f4-a21f-54c87bfc5677X1":{"customLabel":true,"dataType":"number","isBucketed":false,"label":"Part of Difference","operationType":"sum","scale":"ratio","sourceField":"taxful_total_price","timeShift":"1w"},"bf51c1af-443e-49f4-a21f-54c87bfc5677X2":{"customLabel":true,"dataType":"number","isBucketed":false,"label":"Part of Difference","operationType":"math","params":{"tinymathAst":{"args":["bf51c1af-443e-49f4-a21f-54c87bfc5677X0","bf51c1af-443e-49f4-a21f-54c87bfc5677X1"],"location":{"max":61,"min":0},"name":"subtract","text":"sum(taxful_total_price) - sum(taxful_total_price, shift=\'1w\')","type":"function"}},"references":["bf51c1af-443e-49f4-a21f-54c87bfc5677X0","bf51c1af-443e-49f4-a21f-54c87bfc5677X1"],"scale":"ratio"},"cfd45c47-fc41-430c-9e7a-b71dc0c916b0":{"customLabel":true,"dataType":"number","isBucketed":false,"label":"1 week ago","operationType":"sum","scale":"ratio","sourceField":"taxful_total_price","timeShift":"1w"}},"incompleteColumns":{}}}}},"filters":[],"query":{"language":"kuery","query":""},"visualization":{"columns":[{"columnId":"7bf8f089-1542-40bd-b349-45fdfc309ac6"},{"alignment":"left","columnId":"826b2f39-b616-40b2-a222-972fdc1d7596"},{"columnId":"cfd45c47-fc41-430c-9e7a-b71dc0c916b0"},{"colorMode":"text","columnId":"bf51c1af-443e-49f4-a21f-54c87bfc5677","isTransposed":false,"palette":{"name":"custom","params":{"colorStops":[{"color":"#D36086","stop":-10000},{"color":"#209280","stop":0}],"continuity":"above","name":"custom","rangeMax":0,"rangeMin":-10000,"rangeType":"number","steps":5,"stops":[{"color":"#D36086","stop":0},{"color":"#209280","stop":2249.03125}]},"type":"palette"}}],"layerId":"0731ee8b-31c5-4be9-92d9-69ee760465d7","layerType":"data","rowHeight":"single","rowHeightLines":1}},"visualizationType":"lnsDatatable","references":[{"id":"ff959d40-b880-11e8-a6d9-e546fe2bba5f","name":"indexpattern-datasource-current-indexpattern","type":"index-pattern"},{"id":"ff959d40-b880-11e8-a6d9-e546fe2bba5f","name":"indexpattern-datasource-layer-0731ee8b-31c5-4be9-92d9-69ee760465d7","type":"index-pattern"}]}},"title":"Daily comparison"},{"version":"8.11.0","type":"lens","gridData":{"x":0,"y":45,"w":24,"h":9,"i":"d68e91dd-1539-48b0-9279-b43bba2054fe"},"panelIndex":"d68e91dd-1539-48b0-9279-b43bba2054fe","embeddableConfig":{"hidePanelTitles":false,"enhancements":{},"attributes":{"state":{"datasourceStates":{"formBased":{"layers":{"5ed846c2-a70b-4d9c-a244-f254bef763b8":{"columnOrder":["d77cdd24-dedc-48dd-9a4b-d34c6f1a6c46","7ac31901-277a-46e2-8128-8d684b2c1127"],"columns":{"7ac31901-277a-46e2-8128-8d684b2c1127":{"customLabel":true,"dataType":"number","isBucketed":false,"label":"Items","operationType":"count","scale":"ratio","sourceField":"___records___"},"d77cdd24-dedc-48dd-9a4b-d34c6f1a6c46":{"customLabel":true,"dataType":"string","isBucketed":true,"label":"Product name","operationType":"terms","params":{"missingBucket":false,"orderBy":{"columnId":"7ac31901-277a-46e2-8128-8d684b2c1127","type":"column"},"orderDirection":"desc","otherBucket":false,"size":5,"parentFormat":{"id":"terms"}},"scale":"ordinal","sourceField":"products.product_name.keyword"}},"incompleteColumns":{}}}}},"filters":[],"query":{"language":"kuery","query":""},"visualization":{"axisTitlesVisibilitySettings":{"x":false,"yLeft":true,"yRight":true},"fittingFunction":"None","gridlinesVisibilitySettings":{"x":true,"yLeft":true,"yRight":true},"layers":[{"accessors":["7ac31901-277a-46e2-8128-8d684b2c1127"],"layerId":"5ed846c2-a70b-4d9c-a244-f254bef763b8","position":"top","seriesType":"bar_horizontal","showGridlines":false,"xAccessor":"d77cdd24-dedc-48dd-9a4b-d34c6f1a6c46","layerType":"data"}],"legend":{"isVisible":true,"position":"right","legendSize":"auto"},"preferredSeriesType":"bar_horizontal","tickLabelsVisibilitySettings":{"x":true,"yLeft":true,"yRight":true},"valueLabels":"show","yLeftExtent":{"mode":"full"},"yRightExtent":{"mode":"full"}}},"visualizationType":"lnsXY","references":[{"id":"ff959d40-b880-11e8-a6d9-e546fe2bba5f","name":"indexpattern-datasource-current-indexpattern","type":"index-pattern"},{"id":"ff959d40-b880-11e8-a6d9-e546fe2bba5f","name":"indexpattern-datasource-layer-5ed846c2-a70b-4d9c-a244-f254bef763b8","type":"index-pattern"}]}},"title":"Top products this week"},{"version":"8.11.0","type":"lens","gridData":{"x":24,"y":45,"w":24,"h":9,"i":"39d96714-152f-414b-992c-ce2492fc69f3"},"panelIndex":"39d96714-152f-414b-992c-ce2492fc69f3","embeddableConfig":{"timeRange":{"from":"now-2w","to":"now-1w"},"hidePanelTitles":false,"enhancements":{},"attributes":{"state":{"datasourceStates":{"formBased":{"layers":{"5ed846c2-a70b-4d9c-a244-f254bef763b8":{"columnOrder":["d77cdd24-dedc-48dd-9a4b-d34c6f1a6c46","7ac31901-277a-46e2-8128-8d684b2c1127"],"columns":{"7ac31901-277a-46e2-8128-8d684b2c1127":{"customLabel":true,"dataType":"number","isBucketed":false,"label":"Items","operationType":"count","scale":"ratio","sourceField":"___records___"},"d77cdd24-dedc-48dd-9a4b-d34c6f1a6c46":{"customLabel":true,"dataType":"string","isBucketed":true,"label":"Product name","operationType":"terms","params":{"missingBucket":false,"orderBy":{"columnId":"7ac31901-277a-46e2-8128-8d684b2c1127","type":"column"},"orderDirection":"desc","otherBucket":false,"size":5,"parentFormat":{"id":"terms"}},"scale":"ordinal","sourceField":"products.product_name.keyword"}},"incompleteColumns":{}}}}},"filters":[],"query":{"language":"kuery","query":""},"visualization":{"axisTitlesVisibilitySettings":{"x":false,"yLeft":true,"yRight":true},"fittingFunction":"None","gridlinesVisibilitySettings":{"x":true,"yLeft":true,"yRight":true},"layers":[{"accessors":["7ac31901-277a-46e2-8128-8d684b2c1127"],"layerId":"5ed846c2-a70b-4d9c-a244-f254bef763b8","position":"top","seriesType":"bar_horizontal","showGridlines":false,"xAccessor":"d77cdd24-dedc-48dd-9a4b-d34c6f1a6c46","layerType":"data"}],"legend":{"isVisible":true,"position":"right","legendSize":"auto"},"preferredSeriesType":"bar_horizontal","tickLabelsVisibilitySettings":{"x":true,"yLeft":true,"yRight":true},"valueLabels":"show","yLeftExtent":{"mode":"full"},"yRightExtent":{"mode":"full"}}},"visualizationType":"lnsXY","references":[{"id":"ff959d40-b880-11e8-a6d9-e546fe2bba5f","name":"indexpattern-datasource-current-indexpattern","type":"index-pattern"},{"id":"ff959d40-b880-11e8-a6d9-e546fe2bba5f","name":"indexpattern-datasource-layer-5ed846c2-a70b-4d9c-a244-f254bef763b8","type":"index-pattern"}]}},"title":"Top products last week"},{"version":"8.11.0","type":"lens","gridData":{"x":24,"y":14,"w":24,"h":17,"i":"cd47b7cb-0ac0-43e0-b8c6-53489648bdef"},"panelIndex":"cd47b7cb-0ac0-43e0-b8c6-53489648bdef","embeddableConfig":{"enhancements":{},"attributes":{"state":{"datasourceStates":{"formBased":{"layers":{"97c63ea6-9305-4755-97d1-0f26817c6f9a":{"columnOrder":["9f61a7df-198e-4754-b34c-81ed544136ba","ebcb19af-0900-4439-949f-d8cd9bccde19","5575214b-7f21-4b6c-8bc1-34433c6a0c58"],"columns":{"5575214b-7f21-4b6c-8bc1-34433c6a0c58":{"dataType":"number","isBucketed":false,"label":"Count of records","operationType":"count","scale":"ratio","sourceField":"___records___"},"9f61a7df-198e-4754-b34c-81ed544136ba":{"dataType":"string","isBucketed":true,"label":"Top values of category.keyword","operationType":"terms","params":{"missingBucket":false,"orderBy":{"columnId":"5575214b-7f21-4b6c-8bc1-34433c6a0c58","type":"column"},"orderDirection":"desc","otherBucket":true,"size":10,"parentFormat":{"id":"terms"}},"scale":"ordinal","sourceField":"category.keyword"},"ebcb19af-0900-4439-949f-d8cd9bccde19":{"dataType":"date","isBucketed":true,"label":"order_date","operationType":"date_histogram","params":{"interval":"1d","includeEmptyRows":true},"scale":"interval","sourceField":"order_date"}},"incompleteColumns":{}}}}},"filters":[],"query":{"language":"kuery","query":""},"visualization":{"axisTitlesVisibilitySettings":{"x":false,"yLeft":false,"yRight":true},"fittingFunction":"None","gridlinesVisibilitySettings":{"x":true,"yLeft":true,"yRight":true},"layers":[{"accessors":["5575214b-7f21-4b6c-8bc1-34433c6a0c58"],"layerId":"97c63ea6-9305-4755-97d1-0f26817c6f9a","position":"top","seriesType":"bar_percentage_stacked","showGridlines":false,"splitAccessor":"9f61a7df-198e-4754-b34c-81ed544136ba","xAccessor":"ebcb19af-0900-4439-949f-d8cd9bccde19","layerType":"data"}],"legend":{"isVisible":true,"position":"right","legendSize":"auto"},"preferredSeriesType":"bar_percentage_stacked","tickLabelsVisibilitySettings":{"x":true,"yLeft":true,"yRight":true},"valueLabels":"show","yLeftExtent":{"mode":"full"},"yRightExtent":{"mode":"full"}}},"visualizationType":"lnsXY","references":[{"id":"ff959d40-b880-11e8-a6d9-e546fe2bba5f","name":"indexpattern-datasource-current-indexpattern","type":"index-pattern"},{"id":"ff959d40-b880-11e8-a6d9-e546fe2bba5f","name":"indexpattern-datasource-layer-97c63ea6-9305-4755-97d1-0f26817c6f9a","type":"index-pattern"}]}},"title":"Breakdown by category"},{"version":"8.11.0","type":"lens","gridData":{"x":0,"y":7,"w":24,"h":7,"i":"bdb525ab-270b-46f1-a847-dd29be19aadb"},"panelIndex":"bdb525ab-270b-46f1-a847-dd29be19aadb","embeddableConfig":{"enhancements":{},"hidePanelTitles":false,"attributes":{"state":{"datasourceStates":{"formBased":{"layers":{"c7478794-6767-4286-9d65-1c0ecd909dd8":{"columnOrder":["8289349e-6d1b-4abf-b164-0208183d2c34","041db33b-5c9c-47f3-a5d3-ef5e255d1663","041db33b-5c9c-47f3-a5d3-ef5e255d1663X0","041db33b-5c9c-47f3-a5d3-ef5e255d1663X1"],"columns":{"041db33b-5c9c-47f3-a5d3-ef5e255d1663":{"customLabel":true,"dataType":"number","isBucketed":false,"label":"% of target ($10k)","operationType":"formula","params":{"format":{"id":"percent","params":{"decimals":0}},"formula":"sum(taxful_total_price) / 10000 - 1","isFormulaBroken":false},"references":["041db33b-5c9c-47f3-a5d3-ef5e255d1663X1"],"scale":"ratio"},"041db33b-5c9c-47f3-a5d3-ef5e255d1663X0":{"customLabel":true,"dataType":"number","isBucketed":false,"label":"Part of Weekly revenue","operationType":"sum","scale":"ratio","sourceField":"taxful_total_price"},"041db33b-5c9c-47f3-a5d3-ef5e255d1663X1":{"customLabel":true,"dataType":"number","isBucketed":false,"label":"Part of Weekly revenue","operationType":"math","params":{"tinymathAst":{"args":[{"args":["041db33b-5c9c-47f3-a5d3-ef5e255d1663X0",10000],"location":{"max":32,"min":0},"name":"divide","text":"sum(taxful_total_price) / 10000 ","type":"function"},1],"location":{"max":35,"min":0},"name":"subtract","text":"sum(taxful_total_price) / 10000 - 1","type":"function"}},"references":["041db33b-5c9c-47f3-a5d3-ef5e255d1663X0"],"scale":"ratio"},"8289349e-6d1b-4abf-b164-0208183d2c34":{"dataType":"date","isBucketed":true,"label":"order_date","operationType":"date_histogram","params":{"interval":"1d","includeEmptyRows":true},"scale":"interval","sourceField":"order_date"}},"incompleteColumns":{}}}}},"filters":[],"query":{"language":"kuery","query":""},"visualization":{"axisTitlesVisibilitySettings":{"x":false,"yLeft":false,"yRight":true},"fittingFunction":"None","gridlinesVisibilitySettings":{"x":true,"yLeft":true,"yRight":true},"layers":[{"accessors":["041db33b-5c9c-47f3-a5d3-ef5e255d1663"],"layerId":"c7478794-6767-4286-9d65-1c0ecd909dd8","seriesType":"bar_stacked","xAccessor":"8289349e-6d1b-4abf-b164-0208183d2c34","layerType":"data"}],"legend":{"isVisible":true,"position":"right","legendSize":"auto"},"preferredSeriesType":"bar_stacked","tickLabelsVisibilitySettings":{"x":true,"yLeft":true,"yRight":true},"valueLabels":"hide","yLeftExtent":{"mode":"full"},"yRightExtent":{"mode":"full"}}},"visualizationType":"lnsXY","references":[{"id":"ff959d40-b880-11e8-a6d9-e546fe2bba5f","name":"indexpattern-datasource-current-indexpattern","type":"index-pattern"},{"id":"ff959d40-b880-11e8-a6d9-e546fe2bba5f","name":"indexpattern-datasource-layer-c7478794-6767-4286-9d65-1c0ecd909dd8","type":"index-pattern"}]}},"title":"% of target revenue ($10k)"}]',
      timeFrom: 'now-7d',
      title: '[eCommerce] Revenue Dashboard',
      timeTo: 'now',
      version: 1,
    },
    references: [
      {
        type: 'index-pattern',
        id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
        name: '5:indexpattern-datasource-layer-e3b3cb5c-e3b1-497f-a5d5-fddb0dabc94e',
      },
      {
        type: 'index-pattern',
        id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
        name: '5:indexpattern-datasource-layer-1d08a43c-8913-4692-a3e0-8d77902f6e46',
      },
      {
        type: 'index-pattern',
        id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
        name: '5:indexpattern-datasource-layer-9725cdbd-a9f3-479f-a349-0f11244e5239',
      },
      {
        type: 'index-pattern',
        id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
        name: '5:indexpattern-datasource-layer-2031d0f8-01fc-4009-b1ad-a7b7ca9266c0',
      },
      {
        type: 'index-pattern',
        id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
        name: '5:xy-visualization-layer-192ad2e4-2bb7-44a9-b345-e96045fa6ccd',
      },
      {
        type: 'index-pattern',
        id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
        name: '7:indexpattern-datasource-layer-037375ae-9e23-4dd5-a4f0-5f117bb7dac1',
      },
      {
        name: '10:panel_10',
        type: 'search',
        id: '3ba638e0-b894-11e8-a6d9-e546fe2bba5f',
      },
      {
        name: '11:panel_11',
        type: 'visualization',
        id: '9c6f83f0-bb4d-11e8-9c84-77068524bcab',
      },
      {
        name: 'a71cf076-6895-491c-8878-63592e429ed5:panel_a71cf076-6895-491c-8878-63592e429ed5',
        type: 'visualization',
        id: 'c00d1f90-f5ea-11eb-a78e-83aac3c38a60',
      },
      {
        type: 'index-pattern',
        id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
        name: '75283285-dffd-48a7-a0c2-2235184b5282:indexpattern-datasource-layer-c7478794-6767-4286-9d65-1c0ecd909dd8',
      },
      {
        type: 'index-pattern',
        id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
        name: '58774330-b1b3-42dd-a04c-fbce9cc4d288:indexpattern-datasource-layer-4fb42a8e-b133-43c8-805c-a38472053938',
      },
      {
        type: 'index-pattern',
        id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
        name: 'b63ec47d-aace-4980-b928-6be8adafa5a4:indexpattern-datasource-layer-667067a2-7cdf-4f0e-a9fe-eb4f4f1f2f17',
      },
      {
        id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
        name: 'd9495793-80ba-4a9a-b0e3-d1155ec99b09:indexpattern-datasource-current-indexpattern',
        type: 'index-pattern',
      },
      {
        id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
        name: 'd9495793-80ba-4a9a-b0e3-d1155ec99b09:indexpattern-datasource-layer-b6093a53-884f-42c2-9fcc-ba56cfb66c53',
        type: 'index-pattern',
      },
      {
        id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
        name: 'bda054f7-2d06-4936-b461-365d1be621fa:indexpattern-datasource-current-indexpattern',
        type: 'index-pattern',
      },
      {
        id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
        name: 'bda054f7-2d06-4936-b461-365d1be621fa:indexpattern-datasource-layer-0731ee8b-31c5-4be9-92d9-69ee760465d7',
        type: 'index-pattern',
      },
      {
        id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
        name: 'd68e91dd-1539-48b0-9279-b43bba2054fe:indexpattern-datasource-current-indexpattern',
        type: 'index-pattern',
      },
      {
        id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
        name: 'd68e91dd-1539-48b0-9279-b43bba2054fe:indexpattern-datasource-layer-5ed846c2-a70b-4d9c-a244-f254bef763b8',
        type: 'index-pattern',
      },
      {
        id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
        name: '39d96714-152f-414b-992c-ce2492fc69f3:indexpattern-datasource-current-indexpattern',
        type: 'index-pattern',
      },
      {
        id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
        name: '39d96714-152f-414b-992c-ce2492fc69f3:indexpattern-datasource-layer-5ed846c2-a70b-4d9c-a244-f254bef763b8',
        type: 'index-pattern',
      },
      {
        id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
        name: 'cd47b7cb-0ac0-43e0-b8c6-53489648bdef:indexpattern-datasource-current-indexpattern',
        type: 'index-pattern',
      },
      {
        id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
        name: 'cd47b7cb-0ac0-43e0-b8c6-53489648bdef:indexpattern-datasource-layer-97c63ea6-9305-4755-97d1-0f26817c6f9a',
        type: 'index-pattern',
      },
      {
        id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
        name: 'bdb525ab-270b-46f1-a847-dd29be19aadb:indexpattern-datasource-current-indexpattern',
        type: 'index-pattern',
      },
      {
        id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
        name: 'bdb525ab-270b-46f1-a847-dd29be19aadb:indexpattern-datasource-layer-c7478794-6767-4286-9d65-1c0ecd909dd8',
        type: 'index-pattern',
      },
      {
        name: 'controlGroup_1ee1617f-fd8e-45e4-bc6a-d5736710ea20:optionsListDataView',
        type: 'index-pattern',
        id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
      },
      {
        name: 'controlGroup_afa9fa0f-a002-41a5-bab9-b738316d2590:optionsListDataView',
        type: 'index-pattern',
        id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
      },
      {
        name: 'controlGroup_d3f766cb-5f96-4a12-8d3c-034e08be8855:rangeSliderDataView',
        type: 'index-pattern',
        id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
      },
    ],
    coreMigrationVersion: '8.8.0',
    typeMigrationVersion: '8.7.0',
  },
];
