/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

/* eslint max-len: 0 */
/* eslint-disable */

import { i18n } from '@kbn/i18n';
import { SavedObject } from 'kibana/server';

export const getSavedObjects = (): SavedObject[] => [
  {
    id: '37cc8650-b882-11e8-a6d9-e546fe2bba5f',
    type: 'visualization',
    updated_at: '2018-10-01T15:13:03.270Z',
    version: '1',
    migrationVersion: {},
    attributes: {
      title: i18n.translate('home.sampleData.ecommerceSpec.salesByCategoryTitle', {
        defaultMessage: '[eCommerce] Sales by Category',
      }),
      visState:
        '{"title":"[eCommerce] Sales by Category","type":"area","params":{"type":"area","grid":{"categoryLines":false,"style":{"color":"#eee"}},"categoryAxes":[{"id":"CategoryAxis-1","type":"category","position":"bottom","show":true,"style":{},"scale":{"type":"linear"},"labels":{"show":true,"truncate":100},"title":{}}],"valueAxes":[{"id":"ValueAxis-1","name":"LeftAxis-1","type":"value","position":"left","show":true,"style":{},"scale":{"type":"linear","mode":"normal"},"labels":{"show":true,"rotate":0,"filter":false,"truncate":100},"title":{"text":"Sum of total_quantity"}}],"seriesParams":[{"show":"true","type":"area","mode":"stacked","data":{"label":"Sum of total_quantity","id":"1"},"drawLinesBetweenPoints":true,"showCircles":true,"interpolate":"linear","valueAxis":"ValueAxis-1"}],"addTooltip":true,"addLegend":true,"legendPosition":"top","times":[],"addTimeMarker":false},"aggs":[{"id":"1","enabled":true,"type":"sum","schema":"metric","params":{"field":"total_quantity"}},{"id":"2","enabled":true,"type":"date_histogram","schema":"segment","params":{"field":"order_date","interval":"auto","time_zone":"America/New_York","drop_partials":false,"customInterval":"2h","min_doc_count":1,"extended_bounds":{}}},{"id":"3","enabled":true,"type":"terms","schema":"group","params":{"field":"category.keyword","size":5,"order":"desc","orderBy":"1","otherBucket":false,"otherBucketLabel":"Other","missingBucket":false,"missingBucketLabel":"Missing"}}]}',
      uiStateJSON: '{}',
      description: '',
      version: 1,
      kibanaSavedObjectMeta: {
        searchSourceJSON:
          '{"index":"ff959d40-b880-11e8-a6d9-e546fe2bba5f","query":{"query":"","language":"kuery"},"filter":[]}',
      },
    },
    references: [],
  },
  {
    id: 'ed8436b0-b88b-11e8-a6d9-e546fe2bba5f',
    type: 'visualization',
    updated_at: '2018-10-01T15:13:03.270Z',
    version: '1',
    migrationVersion: {},
    attributes: {
      title: i18n.translate('home.sampleData.ecommerceSpec.salesByGenderTitle', {
        defaultMessage: '[eCommerce] Sales by Gender',
      }),
      visState:
        '{"title":"[eCommerce] Sales by Gender","type":"pie","params":{"type":"pie","addTooltip":true,"addLegend":true,"legendPosition":"right","isDonut":true,"labels":{"show":true,"values":true,"last_level":true,"truncate":100}},"aggs":[{"id":"1","enabled":true,"type":"count","schema":"metric","params":{}},{"id":"2","enabled":true,"type":"terms","schema":"segment","params":{"field":"customer_gender","size":5,"order":"desc","orderBy":"1","otherBucket":false,"otherBucketLabel":"Other","missingBucket":false,"missingBucketLabel":"Missing"}}]}',
      uiStateJSON: '{}',
      description: '',
      version: 1,
      kibanaSavedObjectMeta: {
        searchSourceJSON:
          '{"index":"ff959d40-b880-11e8-a6d9-e546fe2bba5f","query":{"query":"","language":"kuery"},"filter":[]}',
      },
    },
    references: [],
  },
  {
    id: '09ffee60-b88c-11e8-a6d9-e546fe2bba5f',
    type: 'visualization',
    updated_at: '2018-10-01T15:13:03.270Z',
    version: '1',
    migrationVersion: {},
    attributes: {
      title: i18n.translate('home.sampleData.ecommerceSpec.markdownTitle', {
        defaultMessage: '[eCommerce] Markdown',
      }),
      visState:
        '{"title":"[eCommerce] Markdown","type":"markdown","params":{"fontSize":12,"openLinksInNewTab":false,"markdown":"### Sample eCommerce Data\\nThis dashboard contains sample data for you to play with. You can view it, search it, and interact with the visualizations. For more information about Kibana, check our [docs](https://www.elastic.co/guide/en/kibana/current/index.html)."},"aggs":[]}',
      uiStateJSON: '{}',
      description: '',
      version: 1,
      kibanaSavedObjectMeta: {
        searchSourceJSON: '{"query":{"query":"","language":"kuery"},"filter":[]}',
      },
    },
    references: [],
  },
  {
    id: '1c389590-b88d-11e8-a6d9-e546fe2bba5f',
    type: 'visualization',
    updated_at: '2018-10-01T15:13:03.270Z',
    version: '1',
    migrationVersion: {},
    attributes: {
      title: i18n.translate('home.sampleData.ecommerceSpec.controlsTitle', {
        defaultMessage: '[eCommerce] Controls',
      }),
      visState:
        '{"title":"[eCommerce] Controls","type":"input_control_vis","params":{"controls":[{"id":"1536977437774","indexPattern":"ff959d40-b880-11e8-a6d9-e546fe2bba5f","fieldName":"manufacturer.keyword","parent":"","label":"Manufacturer","type":"list","options":{"type":"terms","multiselect":true,"dynamicOptions":true,"size":5,"order":"desc"}},{"id":"1536977465554","indexPattern":"ff959d40-b880-11e8-a6d9-e546fe2bba5f","fieldName":"category.keyword","parent":"","label":"Category","type":"list","options":{"type":"terms","multiselect":true,"dynamicOptions":true,"size":5,"order":"desc"}},{"id":"1536977596163","indexPattern":"ff959d40-b880-11e8-a6d9-e546fe2bba5f","fieldName":"total_quantity","parent":"","label":"Quantity","type":"range","options":{"decimalPlaces":0,"step":1}}],"updateFiltersOnChange":false,"useTimeFilter":true,"pinFilters":false},"aggs":[]}',
      uiStateJSON: '{}',
      description: '',
      version: 1,
      kibanaSavedObjectMeta: {
        searchSourceJSON: '{"query":{"query":"","language":"kuery"},"filter":[]}',
      },
    },
    references: [],
  },
  {
    id: '45e07720-b890-11e8-a6d9-e546fe2bba5f',
    type: 'visualization',
    updated_at: '2018-10-01T15:17:30.755Z',
    version: '2',
    migrationVersion: {},
    attributes: {
      title: i18n.translate('home.sampleData.ecommerceSpec.promotionTrackingTitle', {
        defaultMessage: '[eCommerce] Promotion Tracking',
      }),
      visState:
        '{"title":"[eCommerce] Promotion Tracking","type":"metrics","params":{"id":"61ca57f0-469d-11e7-af02-69e470af7417","type":"timeseries","series":[{"id":"ea20ae70-b88d-11e8-a451-f37365e9f268","color":"rgba(240,138,217,1)","split_mode":"everything","metrics":[{"id":"ea20ae71-b88d-11e8-a451-f37365e9f268","type":"sum","field":"taxful_total_price"}],"separate_axis":0,"axis_position":"right","formatter":"number","chart_type":"line","line_width":1,"point_size":1,"fill":"0.7","stacked":"none","filter":"products.product_name:*trouser*","label":"Revenue Trousers","value_template":"${{value}}"},{"id":"062d77b0-b88e-11e8-a451-f37365e9f268","color":"rgba(191,240,129,1)","split_mode":"everything","metrics":[{"id":"062d77b1-b88e-11e8-a451-f37365e9f268","type":"sum","field":"taxful_total_price"}],"separate_axis":0,"axis_position":"right","formatter":"number","chart_type":"line","line_width":1,"point_size":1,"fill":"0.7","stacked":"none","filter":"products.product_name:*watch*","label":"Revenue Watches","value_template":"${{value}}"},{"id":"61ca57f1-469d-11e7-af02-69e470af7417","color":"rgba(23,233,230,1)","split_mode":"everything","metrics":[{"id":"61ca57f2-469d-11e7-af02-69e470af7417","type":"sum","field":"taxful_total_price"}],"separate_axis":0,"axis_position":"right","formatter":"number","chart_type":"line","line_width":1,"point_size":1,"fill":"0.7","stacked":"none","filter":"products.product_name:*bag*","label":"Revenue Bags","value_template":"${{value}}"},{"id":"faa2c170-b88d-11e8-a451-f37365e9f268","color":"rgba(235,186,180,1)","split_mode":"everything","metrics":[{"id":"faa2c171-b88d-11e8-a451-f37365e9f268","type":"sum","field":"taxful_total_price"}],"separate_axis":0,"axis_position":"right","formatter":"number","chart_type":"line","line_width":1,"point_size":1,"fill":"0.7","stacked":"none","filter":"products.product_name:*cocktail dress*","label":"Revenue Cocktail Dresses","value_template":"${{value}}"}],"time_field":"order_date","index_pattern":"kibana_sample_data_ecommerce","interval":">=12h","axis_position":"left","axis_formatter":"number","axis_scale":"normal","show_legend":1,"show_grid":1,"legend_position":"bottom","annotations":[{"fields":"taxful_total_price","template":"Ring the bell! ${{taxful_total_price}}","index_pattern":"kibana_sample_data_ecommerce","query_string":"taxful_total_price:>250","id":"c8c30be0-b88f-11e8-a451-f37365e9f268","color":"rgba(25,77,51,1)","time_field":"order_date","icon":"fa-bell","ignore_global_filters":1,"ignore_panel_filters":1}]},"aggs":[]}',
      uiStateJSON: '{}',
      description: '',
      version: 1,
      kibanaSavedObjectMeta: {
        searchSourceJSON: '{"query":{"query":"","language":"kuery"},"filter":[]}',
      },
    },
    references: [],
  },
  {
    id: '10f1a240-b891-11e8-a6d9-e546fe2bba5f',
    type: 'visualization',
    updated_at: '2018-10-01T15:13:03.270Z',
    version: '1',
    migrationVersion: {},
    attributes: {
      title: i18n.translate('home.sampleData.ecommerceSpec.totalRevenueTitle', {
        defaultMessage: '[eCommerce] Total Revenue',
      }),
      visState:
        '{"title":"[eCommerce] Total Revenue","type":"metric","params":{"addTooltip":true,"addLegend":false,"type":"metric","metric":{"percentageMode":false,"useRanges":false,"colorSchema":"Green to Red","metricColorMode":"None","colorsRange":[{"from":0,"to":10000}],"labels":{"show":false},"invertColors":false,"style":{"bgFill":"#000","bgColor":false,"labelColor":false,"subText":"","fontSize":36}}},"aggs":[{"id":"1","enabled":true,"type":"sum","schema":"metric","params":{"field":"taxful_total_price","customLabel":"Total Revenue"}}]}',
      uiStateJSON: '{}',
      description: '',
      version: 1,
      kibanaSavedObjectMeta: {
        searchSourceJSON:
          '{"index":"ff959d40-b880-11e8-a6d9-e546fe2bba5f","query":{"query":"","language":"kuery"},"filter":[]}',
      },
    },
    references: [],
  },
  {
    id: 'b80e6540-b891-11e8-a6d9-e546fe2bba5f',
    type: 'visualization',
    updated_at: '2018-10-01T15:13:03.270Z',
    version: '1',
    migrationVersion: {},
    attributes: {
      title: i18n.translate('home.sampleData.ecommerceSpec.soldProductsPerDayTitle', {
        defaultMessage: '[eCommerce] Sold Products per Day',
      }),
      visState:
        '{"title":"[eCommerce] Sold Products per Day","type":"metrics","params":{"id":"61ca57f0-469d-11e7-af02-69e470af7417","type":"gauge","series":[{"id":"61ca57f1-469d-11e7-af02-69e470af7417","color":"#68BC00","split_mode":"everything","metrics":[{"id":"61ca57f2-469d-11e7-af02-69e470af7417","type":"count"}],"separate_axis":0,"axis_position":"right","formatter":"number","chart_type":"line","line_width":1,"point_size":1,"fill":0.5,"stacked":"none","label":"Trxns / day"}],"time_field":"order_date","index_pattern":"kibana_sample_data_ecommerce","interval":"1d","axis_position":"left","axis_formatter":"number","axis_scale":"normal","show_legend":1,"show_grid":1,"gauge_color_rules":[{"value":150,"id":"6da070c0-b891-11e8-b645-195edeb9de84","gauge":"rgba(104,188,0,1)","operator":"gte"},{"value":150,"id":"9b0cdbc0-b891-11e8-b645-195edeb9de84","gauge":"rgba(244,78,59,1)","operator":"lt"}],"gauge_width":"15","gauge_inner_width":10,"gauge_style":"half","filter":"","gauge_max":"300"},"aggs":[]}',
      uiStateJSON: '{}',
      description: '',
      version: 1,
      kibanaSavedObjectMeta: {
        searchSourceJSON: '{"query":{"query":"","language":"kuery"},"filter":[]}',
      },
    },
    references: [],
  },
  {
    id: '4b3ec120-b892-11e8-a6d9-e546fe2bba5f',
    type: 'visualization',
    updated_at: '2018-10-01T15:13:03.270Z',
    version: '1',
    migrationVersion: {},
    attributes: {
      title: i18n.translate('home.sampleData.ecommerceSpec.averageSalesPriceTitle', {
        defaultMessage: '[eCommerce] Average Sales Price',
      }),
      visState:
        '{"title":"[eCommerce] Average Sales Price","type":"gauge","params":{"type":"gauge","addTooltip":true,"addLegend":true,"isDisplayWarning":false,"gauge":{"verticalSplit":false,"extendRange":true,"percentageMode":false,"gaugeType":"Circle","gaugeStyle":"Full","backStyle":"Full","orientation":"vertical","colorSchema":"Green to Red","gaugeColorMode":"Labels","colorsRange":[{"from":0,"to":50},{"from":50,"to":75},{"from":75,"to":100}],"invertColors":true,"labels":{"show":true,"color":"black"},"scale":{"show":false,"labels":false,"color":"#333"},"type":"meter","style":{"bgWidth":0.9,"width":0.9,"mask":false,"bgMask":false,"maskBars":50,"bgFill":"#eee","bgColor":false,"subText":"per order","fontSize":60,"labelColor":true},"minAngle":0,"maxAngle":6.283185307179586}},"aggs":[{"id":"1","enabled":true,"type":"avg","schema":"metric","params":{"field":"taxful_total_price","customLabel":"average spend"}}]}',
      uiStateJSON:
        '{"vis":{"defaultColors":{"0 - 50":"rgb(165,0,38)","50 - 75":"rgb(255,255,190)","75 - 100":"rgb(0,104,55)"}}}',
      description: '',
      version: 1,
      kibanaSavedObjectMeta: {
        searchSourceJSON:
          '{"index":"ff959d40-b880-11e8-a6d9-e546fe2bba5f","query":{"query":"","language":"kuery"},"filter":[]}',
      },
    },
    references: [],
  },
  {
    id: '9ca7aa90-b892-11e8-a6d9-e546fe2bba5f',
    type: 'visualization',
    updated_at: '2018-10-01T15:13:03.270Z',
    version: '1',
    migrationVersion: {},
    attributes: {
      title: i18n.translate('home.sampleData.ecommerceSpec.averageSoldQuantityTitle', {
        defaultMessage: '[eCommerce] Average Sold Quantity',
      }),
      visState:
        '{"title":"[eCommerce] Average Sold Quantity","type":"gauge","params":{"type":"gauge","addTooltip":true,"addLegend":true,"isDisplayWarning":false,"gauge":{"verticalSplit":false,"extendRange":true,"percentageMode":false,"gaugeType":"Circle","gaugeStyle":"Full","backStyle":"Full","orientation":"vertical","colorSchema":"Green to Red","gaugeColorMode":"Labels","colorsRange":[{"from":0,"to":2},{"from":2,"to":3},{"from":3,"to":4}],"invertColors":true,"labels":{"show":true,"color":"black"},"scale":{"show":false,"labels":false,"color":"#333"},"type":"meter","style":{"bgWidth":0.9,"width":0.9,"mask":false,"bgMask":false,"maskBars":50,"bgFill":"#eee","bgColor":false,"subText":"per order","fontSize":60,"labelColor":true},"minAngle":0,"maxAngle":6.283185307179586}},"aggs":[{"id":"1","enabled":true,"type":"avg","schema":"metric","params":{"field":"total_quantity","customLabel":"average items"}}]}',
      uiStateJSON:
        '{"vis":{"defaultColors":{"0 - 2":"rgb(165,0,38)","2 - 3":"rgb(255,255,190)","3 - 4":"rgb(0,104,55)"}}}',
      description: '',
      version: 1,
      kibanaSavedObjectMeta: {
        searchSourceJSON:
          '{"index":"ff959d40-b880-11e8-a6d9-e546fe2bba5f","query":{"query":"","language":"kuery"},"filter":[]}',
      },
    },
    references: [],
  },
  {
    id: '3ba638e0-b894-11e8-a6d9-e546fe2bba5f',
    type: 'search',
    updated_at: '2018-10-01T15:13:03.270Z',
    version: '1',
    migrationVersion: {},
    attributes: {
      title: i18n.translate('home.sampleData.ecommerceSpec.ordersTitle', {
        defaultMessage: '[eCommerce] Orders',
      }),
      description: '',
      hits: 0,
      columns: ['category', 'sku', 'taxful_total_price', 'total_quantity'],
      sort: [['order_date', 'desc']],
      version: 1,
      kibanaSavedObjectMeta: {
        searchSourceJSON:
          '{"index":"ff959d40-b880-11e8-a6d9-e546fe2bba5f","highlightAll":true,"version":true,"query":{"query":"","language":"kuery"},"filter":[]}',
      },
    },
    references: [],
  },
  {
    id: '9c6f83f0-bb4d-11e8-9c84-77068524bcab',
    type: 'visualization',
    updated_at: '2018-10-01T15:13:03.270Z',
    version: '1',
    migrationVersion: {},
    attributes: {
      title: i18n.translate('home.sampleData.ecommerceSpec.averageSalesPerRegionTitle', {
        defaultMessage: '[eCommerce] Average Sales Per Region',
      }),
      visState:
        '{"title":"[eCommerce] Average Sales Per Region","type":"region_map","params":{"legendPosition":"bottomright","addTooltip":true,"colorSchema":"Blues","selectedLayer":{"attribution":"<p><a href=\\"http://www.naturalearthdata.com/about/terms-of-use\\">Made with NaturalEarth</a>|<a href=\\"https://www.elastic.co/elastic-maps-service\\">Elastic Maps Service</a></p>&#10;","weight":1,"name":"World Countries","url":"https://vector.maps.elastic.co/blob/5659313586569216?elastic_tile_service_tos=agree&my_app_version=7.0.0-alpha1&license=f6c534b8-91b9-4499-8804-a2e9789ecc95","format":{"type":"geojson"},"fields":[{"name":"iso2","description":"Two letter abbreviation"},{"name":"name","description":"Country name"},{"name":"iso3","description":"Three letter abbreviation"}],"created_at":"2017-04-26T17:12:15.978370","tags":[],"id":5659313586569216,"layerId":"elastic_maps_service.World Countries","isEMS":true},"emsHotLink":"https://maps.elastic.co/v2#file/World Countries","selectedJoinField":{"name":"iso2","description":"Two letter abbreviation"},"isDisplayWarning":true,"wms":{"enabled":false,"options":{"format":"image/png","transparent":true}},"mapZoom":2,"mapCenter":[0,0],"outlineWeight":1,"showAllShapes":true},"aggs":[{"id":"1","enabled":true,"type":"avg","schema":"metric","params":{"field":"taxful_total_price","customLabel":"Average Sale"}},{"id":"2","enabled":true,"type":"terms","schema":"segment","params":{"field":"geoip.country_iso_code","size":100,"order":"desc","orderBy":"1","otherBucket":false,"otherBucketLabel":"Other","missingBucket":false,"missingBucketLabel":"Missing"}}]}',
      uiStateJSON: '{}',
      description: '',
      version: 1,
      kibanaSavedObjectMeta: {
        searchSourceJSON:
          '{"index":"ff959d40-b880-11e8-a6d9-e546fe2bba5f","query":{"query":"","language":"kuery"},"filter":[]}',
      },
    },
    references: [],
  },
  {
    id: 'b72dd430-bb4d-11e8-9c84-77068524bcab',
    type: 'visualization',
    updated_at: '2018-10-01T15:13:03.270Z',
    version: '1',
    migrationVersion: {},
    attributes: {
      title: i18n.translate('home.sampleData.ecommerceSpec.topSellingProductsTitle', {
        defaultMessage: '[eCommerce] Top Selling Products',
      }),
      visState:
        '{"title":"[eCommerce] Top Selling Products","type":"tagcloud","params":{"scale":"linear","orientation":"single","minFontSize":18,"maxFontSize":72,"showLabel":false},"aggs":[{"id":"1","enabled":true,"type":"count","schema":"metric","params":{}},{"id":"2","enabled":true,"type":"terms","schema":"segment","params":{"field":"products.product_name.keyword","size":7,"order":"desc","orderBy":"1","otherBucket":false,"otherBucketLabel":"Other","missingBucket":false,"missingBucketLabel":"Missing"}}]}',
      uiStateJSON: '{}',
      description: '',
      version: 1,
      kibanaSavedObjectMeta: {
        searchSourceJSON:
          '{"index":"ff959d40-b880-11e8-a6d9-e546fe2bba5f","query":{"query":"","language":"kuery"},"filter":[]}',
      },
    },
    references: [],
  },
  {
    id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
    type: 'index-pattern',
    updated_at: '2018-10-01T15:13:03.270Z',
    version: '1',
    migrationVersion: {},
    attributes: {
      title: 'kibana_sample_data_ecommerce',
      timeFieldName: 'order_date',
      fields:
        '[{"name":"_id","type":"string","esTypes":["_id"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":false},{"name":"_index","type":"string","esTypes":["_index"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":false},{"name":"_score","type":"number","count":0,"scripted":false,"searchable":false,"aggregatable":false,"readFromDocValues":false},{"name":"_source","type":"_source","esTypes":["_source"],"count":0,"scripted":false,"searchable":false,"aggregatable":false,"readFromDocValues":false},{"name":"_type","type":"string","esTypes":["_type"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":false},{"name":"category","type":"string","esTypes":["text"],"count":0,"scripted":false,"searchable":true,"aggregatable":false,"readFromDocValues":false},{"name":"category.keyword","type":"string","esTypes":["keyword"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true,"subType":{"multi":{"parent": "category"}}},{"name":"currency","type":"string","esTypes":["keyword"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"customer_birth_date","type":"date","esTypes":["date"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"customer_first_name","type":"string","esTypes":["text"],"count":0,"scripted":false,"searchable":true,"aggregatable":false,"readFromDocValues":false},{"name":"customer_first_name.keyword","type":"string","esTypes":["keyword"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true,"subType":{"multi":{"parent": "customer_first_name"}}},{"name":"customer_full_name","type":"string","esTypes":["text"],"count":0,"scripted":false,"searchable":true,"aggregatable":false,"readFromDocValues":false},{"name":"customer_full_name.keyword","type":"string","esTypes":["keyword"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true,"subType":{"multi":{"parent": "customer_full_name"}}},{"name":"customer_gender","type":"string","esTypes":["keyword"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"customer_id","type":"string","esTypes":["keyword"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"customer_last_name","type":"string","esTypes":["text"],"count":0,"scripted":false,"searchable":true,"aggregatable":false,"readFromDocValues":false},{"name":"customer_last_name.keyword","type":"string","esTypes":["keyword"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true,"subType":{"multi":{"parent": "customer_last_name"}}},{"name":"customer_phone","type":"string","esTypes":["keyword"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"day_of_week","type":"string","esTypes":["keyword"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"day_of_week_i","type":"number","esTypes":["integer"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"email","type":"string","esTypes":["keyword"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"geoip.city_name","type":"string","esTypes":["keyword"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"geoip.continent_name","type":"string","esTypes":["keyword"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"geoip.country_iso_code","type":"string","esTypes":["keyword"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"geoip.location","type":"geo_point","esTypes":["geo_point"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"geoip.region_name","type":"string","esTypes":["keyword"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"manufacturer","type":"string","esTypes":["text"],"count":0,"scripted":false,"searchable":true,"aggregatable":false,"readFromDocValues":false},{"name":"manufacturer.keyword","type":"string","esTypes":["keyword"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true,"subType":{"multi":{"parent": "manufacturer"}}},{"name":"order_date","type":"date","esTypes":["date"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"order_id","type":"string","esTypes":["keyword"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"products._id","type":"string","esTypes":["text"],"count":0,"scripted":false,"searchable":true,"aggregatable":false,"readFromDocValues":false},{"name":"products._id.keyword","type":"string","esTypes":["keyword"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true,"subType":{"multi":{"parent": "products._id"}}},{"name":"products.base_price","type":"number","esTypes":["half_float"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"products.base_unit_price","type":"number","esTypes":["half_float"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"products.category","type":"string","esTypes":["text"],"count":0,"scripted":false,"searchable":true,"aggregatable":false,"readFromDocValues":false},{"name":"products.category.keyword","type":"string","esTypes":["keyword"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true,"subType":{"multi":{"parent": "products.category"}}},{"name":"products.created_on","type":"date","esTypes":["date"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"products.discount_amount","type":"number","esTypes":["half_float"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"products.discount_percentage","type":"number","esTypes":["half_float"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"products.manufacturer","type":"string","esTypes":["text"],"count":0,"scripted":false,"searchable":true,"aggregatable":false,"readFromDocValues":false},{"name":"products.manufacturer.keyword","type":"string","esTypes":["keyword"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true,"subType":{"multi":{"parent": "products.manufacturer"}}},{"name":"products.min_price","type":"number","esTypes":["half_float"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"products.price","type":"number","esTypes":["half_float"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"products.product_id","type":"number","esTypes":["long"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"products.product_name","type":"string","esTypes":["text"],"count":0,"scripted":false,"searchable":true,"aggregatable":false,"readFromDocValues":false},{"name":"products.product_name.keyword","type":"string","esTypes":["keyword"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true,"subType":{"multi":{"parent": "products.product_name"}}},{"name":"products.quantity","type":"number","esTypes":["integer"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"products.sku","type":"string","esTypes":["keyword"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"products.tax_amount","type":"number","esTypes":["half_float"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"products.taxful_price","type":"number","esTypes":["half_float"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"products.taxless_price","type":"number","esTypes":["half_float"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"products.unit_discount_amount","type":"number","esTypes":["half_float"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"sku","type":"string","esTypes":["keyword"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"taxful_total_price","type":"number","esTypes":["half_float"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"taxless_total_price","type":"number","esTypes":["half_float"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"total_quantity","type":"number","esTypes":["integer"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"total_unique_products","type":"number","esTypes":["integer"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"type","type":"string","esTypes":["keyword"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"user","type":"string","esTypes":["keyword"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true}]',
      fieldFormatMap: '{"taxful_total_price":{"id":"number","params":{"pattern":"$0,0.[00]"}}}',
    },
    references: [],
  },
  {
    id: '722b74f0-b882-11e8-a6d9-e546fe2bba5f',
    type: 'dashboard',
    updated_at: '2018-10-01T15:13:03.270Z',
    version: '1',
    references: [
      {
        name: 'panel_0',
        type: 'visualization',
        id: '37cc8650-b882-11e8-a6d9-e546fe2bba5f',
      },
      {
        name: 'panel_1',
        type: 'visualization',
        id: 'ed8436b0-b88b-11e8-a6d9-e546fe2bba5f',
      },
      {
        name: 'panel_2',
        type: 'visualization',
        id: '09ffee60-b88c-11e8-a6d9-e546fe2bba5f',
      },
      {
        name: 'panel_3',
        type: 'visualization',
        id: '1c389590-b88d-11e8-a6d9-e546fe2bba5f',
      },
      {
        name: 'panel_4',
        type: 'visualization',
        id: '45e07720-b890-11e8-a6d9-e546fe2bba5f',
      },
      {
        name: 'panel_5',
        type: 'visualization',
        id: '10f1a240-b891-11e8-a6d9-e546fe2bba5f',
      },
      {
        name: 'panel_6',
        type: 'visualization',
        id: 'b80e6540-b891-11e8-a6d9-e546fe2bba5f',
      },
      {
        name: 'panel_7',
        type: 'visualization',
        id: '4b3ec120-b892-11e8-a6d9-e546fe2bba5f',
      },
      {
        name: 'panel_8',
        type: 'visualization',
        id: '9ca7aa90-b892-11e8-a6d9-e546fe2bba5f',
      },
      {
        name: 'panel_9',
        type: 'search',
        id: '3ba638e0-b894-11e8-a6d9-e546fe2bba5f',
      },
      {
        name: 'panel_10',
        type: 'visualization',
        id: '9c6f83f0-bb4d-11e8-9c84-77068524bcab',
      },
      {
        name: 'panel_11',
        type: 'visualization',
        id: 'b72dd430-bb4d-11e8-9c84-77068524bcab',
      },
    ],
    migrationVersion: {
      dashboard: '7.0.0',
    },
    attributes: {
      title: i18n.translate('home.sampleData.ecommerceSpec.revenueDashboardTitle', {
        defaultMessage: '[eCommerce] Revenue Dashboard',
      }),
      hits: 0,
      description: i18n.translate('home.sampleData.ecommerceSpec.revenueDashboardDescription', {
        defaultMessage: 'Analyze mock eCommerce orders and revenue',
      }),
      panelsJSON:
        '[{"embeddableConfig":{"vis":{"colors":{"Men\'s Accessories":"#82B5D8","Men\'s Clothing":"#F9BA8F","Men\'s Shoes":"#F29191","Women\'s Accessories":"#F4D598","Women\'s Clothing":"#70DBED","Women\'s Shoes":"#B7DBAB"}}},"gridData":{"x":12,"y":18,"w":36,"h":10,"i":"1"},"panelIndex":"1","version":"7.0.0-alpha1","panelRefName":"panel_0"},{"embeddableConfig":{"vis":{"colors":{"FEMALE":"#6ED0E0","MALE":"#447EBC"},"legendOpen":false}},"gridData":{"x":12,"y":7,"w":12,"h":11,"i":"2"},"panelIndex":"2","version":"7.0.0-alpha1","panelRefName":"panel_1"},{"embeddableConfig":{},"gridData":{"x":0,"y":0,"w":18,"h":7,"i":"3"},"panelIndex":"3","version":"7.0.0-alpha1","panelRefName":"panel_2"},{"embeddableConfig":{},"gridData":{"x":18,"y":0,"w":30,"h":7,"i":"4"},"panelIndex":"4","version":"7.0.0-alpha1","panelRefName":"panel_3"},{"embeddableConfig":{},"gridData":{"x":0,"y":28,"w":48,"h":11,"i":"5"},"panelIndex":"5","version":"7.0.0-alpha1","panelRefName":"panel_4"},{"embeddableConfig":{},"gridData":{"x":0,"y":18,"w":12,"h":10,"i":"6"},"panelIndex":"6","version":"7.0.0-alpha1","panelRefName":"panel_5"},{"embeddableConfig":{},"gridData":{"x":0,"y":7,"w":12,"h":11,"i":"7"},"panelIndex":"7","version":"7.0.0-alpha1","panelRefName":"panel_6"},{"embeddableConfig":{"vis":{"colors":{"0 - 50":"#E24D42","50 - 75":"#EAB839","75 - 100":"#7EB26D"},"defaultColors":{"0 - 50":"rgb(165,0,38)","50 - 75":"rgb(255,255,190)","75 - 100":"rgb(0,104,55)"},"legendOpen":false}},"gridData":{"x":24,"y":7,"w":12,"h":11,"i":"8"},"panelIndex":"8","version":"7.0.0-alpha1","panelRefName":"panel_7"},{"embeddableConfig":{"vis":{"colors":{"0 - 2":"#E24D42","2 - 3":"#F2C96D","3 - 4":"#9AC48A"},"defaultColors":{"0 - 2":"rgb(165,0,38)","2 - 3":"rgb(255,255,190)","3 - 4":"rgb(0,104,55)"},"legendOpen":false}},"gridData":{"x":36,"y":7,"w":12,"h":11,"i":"9"},"panelIndex":"9","version":"7.0.0-alpha1","panelRefName":"panel_8"},{"embeddableConfig":{},"gridData":{"x":0,"y":54,"w":48,"h":18,"i":"10"},"panelIndex":"10","version":"7.0.0-alpha1","panelRefName":"panel_9"},{"embeddableConfig":{"mapZoom":2,"mapCenter":[28.304380682962783,-22.148437500000004]},"gridData":{"x":0,"y":39,"w":24,"h":15,"i":"11"},"panelIndex":"11","version":"7.0.0-alpha1","panelRefName":"panel_10"},{"embeddableConfig":{},"gridData":{"x":24,"y":39,"w":24,"h":15,"i":"12"},"panelIndex":"12","version":"7.0.0-alpha1","panelRefName":"panel_11"}]',
      optionsJSON: '{"hidePanelTitles":false,"useMargins":true}',
      version: 1,
      timeRestore: true,
      timeTo: 'now',
      timeFrom: 'now-7d',
      refreshInterval: {
        pause: false,
        value: 900000,
      },
      kibanaSavedObjectMeta: {
        searchSourceJSON: '{"query":{"language":"kuery","query":""},"filter":[]}',
      },
    },
  },
];
