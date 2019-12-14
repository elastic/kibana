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

import { i18n } from '@kbn/i18n';

export const getSavedObjects = () => [
  {
    id: 'aeb212e0-4c84-11e8-b3d7-01146121b73d',
    type: 'visualization',
    updated_at: '2018-05-09T15:49:03.736Z',
    version: 1,
    migrationVersion: {},
    attributes: {
      title: i18n.translate('server.sampleData.flightsSpec.controlsTitle', {
        defaultMessage: '[Flights] Controls',
      }),
      visState:
        '{"title":"[Flights] Controls","type":"input_control_vis","params":{"controls":[{"id":"1525098134264","indexPattern":"d3d7af60-4c81-11e8-b3d7-01146121b73d","fieldName":"OriginCityName","parent":"","label":"Origin City","type":"list","options":{"type":"terms","multiselect":true,"size":100,"order":"desc"}},{"id":"1525099277699","indexPattern":"d3d7af60-4c81-11e8-b3d7-01146121b73d","fieldName":"DestCityName","parent":"1525098134264","label":"Destination City","type":"list","options":{"type":"terms","multiselect":true,"size":100,"order":"desc"}},{"id":"1525099307278","indexPattern":"d3d7af60-4c81-11e8-b3d7-01146121b73d","fieldName":"AvgTicketPrice","parent":"","label":"Average Ticket Price","type":"range","options":{"decimalPlaces":0,"step":10}}],"updateFiltersOnChange":false,"useTimeFilter":true,"pinFilters":false},"aggs":[]}',
      uiStateJSON: '{}',
      description: '',
      version: 1,
      kibanaSavedObjectMeta: {
        searchSourceJSON: '{}',
      },
    },
  },
  {
    id: 'c8fc3d30-4c87-11e8-b3d7-01146121b73d',
    type: 'visualization',
    updated_at: '2018-05-09T15:49:03.736Z',
    version: 1,
    migrationVersion: {},
    attributes: {
      title: i18n.translate('server.sampleData.flightsSpec.flightCountAndAverageTicketPriceTitle', {
        defaultMessage: '[Flights] Flight Count and Average Ticket Price',
      }),
      visState:
        '{"title":"[Flights] Flight Count and Average Ticket Price","type":"area","params":{"type":"area","grid":{"categoryLines":false,"style":{"color":"#eee"}},"categoryAxes":[{"id":"CategoryAxis-1","type":"category","position":"bottom","show":true,"style":{},"scale":{"type":"linear"},"labels":{"show":true,"truncate":100},"title":{}}],"valueAxes":[{"id":"ValueAxis-1","name":"LeftAxis-1","type":"value","position":"left","show":true,"style":{},"scale":{"type":"linear","mode":"normal"},"labels":{"show":true,"rotate":0,"filter":false,"truncate":100},"title":{"text":"Average Ticket Price"}},{"id":"ValueAxis-2","name":"RightAxis-1","type":"value","position":"right","show":true,"style":{},"scale":{"type":"linear","mode":"normal"},"labels":{"show":true,"rotate":0,"filter":false,"truncate":100},"title":{"text":"Flight Count"}}],"seriesParams":[{"show":true,"mode":"stacked","type":"area","drawLinesBetweenPoints":true,"showCircles":false,"interpolate":"linear","lineWidth":2,"data":{"id":"5","label":"Flight Count"},"valueAxis":"ValueAxis-2"},{"show":true,"mode":"stacked","type":"line","drawLinesBetweenPoints":false,"showCircles":true,"interpolate":"linear","data":{"id":"4","label":"Average Ticket Price"},"valueAxis":"ValueAxis-1","lineWidth":2}],"addTooltip":true,"addLegend":true,"legendPosition":"right","times":[],"addTimeMarker":false,"radiusRatio":13},"aggs":[{"id":"3","enabled":true,"type":"date_histogram","schema":"segment","params":{"field":"timestamp","interval":"auto","customInterval":"2h","min_doc_count":1,"extended_bounds":{}}},{"id":"5","enabled":true,"type":"count","schema":"metric","params":{"customLabel":"Flight Count"}},{"id":"4","enabled":true,"type":"avg","schema":"metric","params":{"field":"AvgTicketPrice","customLabel":"Average Ticket Price"}},{"id":"2","enabled":true,"type":"avg","schema":"radius","params":{"field":"AvgTicketPrice"}}]}',
      uiStateJSON:
        '{"vis":{"legendOpen":true,"colors":{"Average Ticket Price":"#629E51","Flight Count":"#AEA2E0"}}}',
      description: '',
      version: 1,
      kibanaSavedObjectMeta: {
        searchSourceJSON:
          '{"index":"d3d7af60-4c81-11e8-b3d7-01146121b73d","filter":[],"query":{"query":"","language":"kuery"}}',
      },
    },
  },
  {
    id: '571aaf70-4c88-11e8-b3d7-01146121b73d',
    type: 'search',
    updated_at: '2018-05-09T15:49:03.736Z',
    version: 1,
    migrationVersion: {},
    attributes: {
      title: i18n.translate('server.sampleData.flightsSpec.flightLogTitle', {
        defaultMessage: '[Flights] Flight Log',
      }),
      description: '',
      hits: 0,
      columns: [
        'Carrier',
        'OriginCityName',
        'OriginCountry',
        'DestCityName',
        'DestCountry',
        'FlightTimeMin',
        'AvgTicketPrice',
        'Cancelled',
        'FlightDelayType',
      ],
      sort: [['timestamp', 'desc']],
      version: 1,
      kibanaSavedObjectMeta: {
        searchSourceJSON:
          '{"index":"d3d7af60-4c81-11e8-b3d7-01146121b73d","highlightAll":true,"version":true,"query":{"language":"kuery","query":""},"filter":[]}',
      },
    },
  },
  {
    id: '8f4d0c00-4c86-11e8-b3d7-01146121b73d',
    type: 'visualization',
    updated_at: '2018-05-09T15:49:03.736Z',
    version: 1,
    migrationVersion: {},
    attributes: {
      title: i18n.translate('server.sampleData.flightsSpec.airlineCarrierTitle', {
        defaultMessage: '[Flights] Airline Carrier',
      }),
      visState:
        '{"title":"[Flights] Airline Carrier","type":"pie","params":{"type":"pie","addTooltip":true,"addLegend":true,"legendPosition":"right","isDonut":true,"labels":{"show":true,"values":true,"last_level":true,"truncate":100}},"aggs":[{"id":"1","enabled":true,"type":"count","schema":"metric","params":{}},{"id":"2","enabled":true,"type":"terms","schema":"segment","params":{"field":"Carrier","size":5,"order":"desc","orderBy":"1","otherBucket":false,"otherBucketLabel":"Other","missingBucket":false,"missingBucketLabel":"Missing"}}]}',
      uiStateJSON: '{"vis":{"legendOpen":false}}',
      description: '',
      version: 1,
      kibanaSavedObjectMeta: {
        searchSourceJSON:
          '{"index":"d3d7af60-4c81-11e8-b3d7-01146121b73d","filter":[],"query":{"query":"","language":"kuery"}}',
      },
    },
  },
  {
    id: 'f8290060-4c88-11e8-b3d7-01146121b73d',
    type: 'visualization',
    updated_at: '2018-05-09T15:49:03.736Z',
    version: 1,
    migrationVersion: {},
    attributes: {
      title: i18n.translate('server.sampleData.flightsSpec.delayTypeTitle', {
        defaultMessage: '[Flights] Delay Type',
      }),
      visState:
        '{"title":"[Flights] Delay Type","type":"area","params":{"type":"area","grid":{"categoryLines":false,"style":{"color":"#eee"}},"categoryAxes":[{"id":"CategoryAxis-1","type":"category","position":"bottom","show":true,"style":{},"scale":{"type":"linear"},"labels":{"show":true,"truncate":100},"title":{}}],"valueAxes":[{"id":"ValueAxis-1","name":"LeftAxis-1","type":"value","position":"left","show":true,"style":{},"scale":{"type":"linear","mode":"normal"},"labels":{"show":true,"rotate":0,"filter":false,"truncate":100},"title":{"text":"Count"}}],"seriesParams":[{"show":"true","type":"histogram","mode":"stacked","data":{"label":"Count","id":"1"},"drawLinesBetweenPoints":true,"showCircles":true,"interpolate":"cardinal","valueAxis":"ValueAxis-1"}],"addTooltip":true,"addLegend":true,"legendPosition":"right","times":[],"addTimeMarker":false},"aggs":[{"id":"1","enabled":true,"type":"count","schema":"metric","params":{}},{"id":"2","enabled":true,"type":"date_histogram","schema":"segment","params":{"field":"timestamp","interval":"auto","customInterval":"2h","min_doc_count":1,"extended_bounds":{}}},{"id":"3","enabled":true,"type":"terms","schema":"group","params":{"field":"FlightDelayType","size":5,"order":"desc","orderBy":"1","otherBucket":false,"otherBucketLabel":"Other","missingBucket":false,"missingBucketLabel":"Missing"}}]}',
      uiStateJSON: '{}',
      description: '',
      version: 1,
      kibanaSavedObjectMeta: {
        searchSourceJSON:
          '{"index":"d3d7af60-4c81-11e8-b3d7-01146121b73d","filter":[],"query":{"query":"","language":"kuery"}}',
      },
    },
  },
  {
    id: 'bcb63b50-4c89-11e8-b3d7-01146121b73d',
    type: 'visualization',
    updated_at: '2018-05-09T15:49:03.736Z',
    version: 1,
    migrationVersion: {},
    attributes: {
      title: i18n.translate('server.sampleData.flightsSpec.delaysAndCancellationsTitle', {
        defaultMessage: '[Flights] Delays & Cancellations',
      }),
      visState:
        '{"title":"[Flights] Delays & Cancellations","type":"metrics","params":{"id":"61ca57f0-469d-11e7-af02-69e470af7417","type":"timeseries","series":[{"id":"61ca57f1-469d-11e7-af02-69e470af7417","color":"rgba(0,156,224,1)","split_mode":"everything","metrics":[{"id":"61ca57f2-469d-11e7-af02-69e470af7417","type":"filter_ratio","numerator":"FlightDelay:true"}],"separate_axis":0,"axis_position":"right","formatter":"percent","chart_type":"line","line_width":"2","point_size":"0","fill":0.5,"stacked":"none","label":"Percent Delays"}],"time_field":"timestamp","index_pattern":"kibana_sample_data_flights","interval":">=1h","axis_position":"left","axis_formatter":"number","show_legend":1,"show_grid":1,"annotations":[{"fields":"FlightDelay,Cancelled,Carrier","template":"{{Carrier}}: Flight Delayed and Cancelled!","index_pattern":"kibana_sample_data_flights","query_string":"FlightDelay:true AND Cancelled:true","id":"53b7dff0-4c89-11e8-a66a-6989ad5a0a39","color":"rgba(0,98,177,1)","time_field":"timestamp","icon":"fa-exclamation-triangle","ignore_global_filters":1,"ignore_panel_filters":1}],"legend_position":"bottom"},"aggs":[]}',
      uiStateJSON: '{}',
      description: '',
      version: 1,
      kibanaSavedObjectMeta: {
        searchSourceJSON: '{}',
      },
    },
  },
  {
    id: '9886b410-4c8b-11e8-b3d7-01146121b73d',
    type: 'visualization',
    updated_at: '2018-05-09T15:49:03.736Z',
    version: 1,
    migrationVersion: {},
    attributes: {
      title: i18n.translate('server.sampleData.flightsSpec.delayBucketsTitle', {
        defaultMessage: '[Flights] Delay Buckets',
      }),
      visState:
        '{"title":"[Flights] Delay Buckets","type":"histogram","params":{"type":"histogram","grid":{"categoryLines":false,"style":{"color":"#eee"}},"categoryAxes":[{"id":"CategoryAxis-1","type":"category","position":"bottom","show":true,"style":{},"scale":{"type":"linear"},"labels":{"show":true,"truncate":100},"title":{}}],"valueAxes":[{"id":"ValueAxis-1","name":"LeftAxis-1","type":"value","position":"left","show":true,"style":{},"scale":{"type":"linear","mode":"normal"},"labels":{"show":true,"rotate":0,"filter":false,"truncate":100},"title":{"text":"Count"}}],"seriesParams":[{"show":"true","type":"histogram","mode":"stacked","data":{"label":"Count","id":"1"},"valueAxis":"ValueAxis-1","drawLinesBetweenPoints":true,"showCircles":true}],"addTooltip":true,"addLegend":true,"legendPosition":"right","times":[],"addTimeMarker":false},"aggs":[{"id":"1","enabled":true,"type":"count","schema":"metric","params":{}},{"id":"2","enabled":true,"type":"histogram","schema":"segment","params":{"field":"FlightDelayMin","interval":30,"extended_bounds":{},"customLabel":"Flight Delay Minutes"}}]}',
      uiStateJSON: '{"vis":{"legendOpen":false}}',
      description: '',
      version: 1,
      kibanaSavedObjectMeta: {
        searchSourceJSON:
          '{"index":"d3d7af60-4c81-11e8-b3d7-01146121b73d","filter":[{"meta":{"index":"d3d7af60-4c81-11e8-b3d7-01146121b73d","negate":true,"disabled":false,"alias":null,"type":"phrase","key":"FlightDelayMin","value":"0","params":{"query":0,"type":"phrase"}},"query":{"match":{"FlightDelayMin":{"query":0,"type":"phrase"}}},"$state":{"store":"appState"}}],"query":{"query":"","language":"kuery"}}',
      },
    },
  },
  {
    id: '76e3c090-4c8c-11e8-b3d7-01146121b73d',
    type: 'visualization',
    updated_at: '2018-05-09T15:49:03.736Z',
    version: 1,
    migrationVersion: {},
    attributes: {
      title: i18n.translate('server.sampleData.flightsSpec.flightDelaysTitle', {
        defaultMessage: '[Flights] Flight Delays',
      }),
      visState:
        '{"title":"[Flights] Flight Delays","type":"histogram","params":{"type":"histogram","grid":{"categoryLines":false,"style":{"color":"#eee"}},"categoryAxes":[{"id":"CategoryAxis-1","type":"category","position":"left","show":true,"style":{},"scale":{"type":"linear"},"labels":{"show":true,"truncate":100},"title":{}}],"valueAxes":[{"id":"ValueAxis-1","name":"BottomAxis-1","type":"value","position":"bottom","show":true,"style":{},"scale":{"type":"linear","mode":"normal"},"labels":{"show":true,"rotate":0,"filter":false,"truncate":100},"title":{"text":"Count"}}],"seriesParams":[{"show":"true","type":"histogram","mode":"stacked","data":{"label":"Count","id":"1"},"valueAxis":"ValueAxis-1","drawLinesBetweenPoints":true,"showCircles":true}],"addTooltip":true,"addLegend":true,"legendPosition":"right","times":[],"addTimeMarker":false},"aggs":[{"id":"1","enabled":true,"type":"count","schema":"metric","params":{"customLabel":""}},{"id":"2","enabled":true,"type":"terms","schema":"segment","params":{"field":"FlightDelay","size":5,"order":"desc","orderBy":"1","otherBucket":false,"otherBucketLabel":"Other","missingBucket":false,"missingBucketLabel":"Missing","customLabel":"Flight Delays"}}]}',
      uiStateJSON: '{}',
      description: '',
      version: 1,
      kibanaSavedObjectMeta: {
        searchSourceJSON:
          '{"index":"d3d7af60-4c81-11e8-b3d7-01146121b73d","filter":[],"query":{"query":"","language":"kuery"}}',
      },
    },
  },
  {
    id: '707665a0-4c8c-11e8-b3d7-01146121b73d',
    type: 'visualization',
    updated_at: '2018-05-09T15:49:03.736Z',
    version: 1,
    migrationVersion: {},
    attributes: {
      title: i18n.translate('server.sampleData.flightsSpec.flightCancellationsTitle', {
        defaultMessage: '[Flights] Flight Cancellations',
      }),
      visState:
        '{"title":"[Flights] Flight Cancellations","type":"histogram","params":{"type":"histogram","grid":{"categoryLines":false,"style":{"color":"#eee"}},"categoryAxes":[{"id":"CategoryAxis-1","type":"category","position":"left","show":true,"style":{},"scale":{"type":"linear"},"labels":{"show":true,"truncate":100},"title":{}}],"valueAxes":[{"id":"ValueAxis-1","name":"BottomAxis-1","type":"value","position":"bottom","show":true,"style":{},"scale":{"type":"linear","mode":"normal"},"labels":{"show":true,"rotate":0,"filter":false,"truncate":100},"title":{"text":"Count"}}],"seriesParams":[{"show":"true","type":"histogram","mode":"stacked","data":{"label":"Count","id":"1"},"valueAxis":"ValueAxis-1","drawLinesBetweenPoints":true,"showCircles":true}],"addTooltip":true,"addLegend":true,"legendPosition":"right","times":[],"addTimeMarker":false},"aggs":[{"id":"1","enabled":true,"type":"count","schema":"metric","params":{"customLabel":""}},{"id":"2","enabled":true,"type":"terms","schema":"segment","params":{"field":"Cancelled","size":5,"order":"desc","orderBy":"1","otherBucket":false,"otherBucketLabel":"Other","missingBucket":false,"missingBucketLabel":"Missing","customLabel":"Flight Cancellations"}}]}',
      uiStateJSON: '{}',
      description: '',
      version: 1,
      kibanaSavedObjectMeta: {
        searchSourceJSON:
          '{"index":"d3d7af60-4c81-11e8-b3d7-01146121b73d","filter":[],"query":{"query":"","language":"kuery"}}',
      },
    },
  },
  {
    id: '293b5a30-4c8f-11e8-b3d7-01146121b73d',
    type: 'visualization',
    updated_at: '2018-05-09T15:49:03.736Z',
    version: 1,
    migrationVersion: {},
    attributes: {
      title: i18n.translate('server.sampleData.flightsSpec.destinationWeatherTitle', {
        defaultMessage: '[Flights] Destination Weather',
      }),
      visState:
        '{"title":"[Flights] Destination Weather","type":"tagcloud","params":{"scale":"linear","orientation":"single","minFontSize":18,"maxFontSize":72,"showLabel":false},"aggs":[{"id":"1","enabled":true,"type":"count","schema":"metric","params":{}},{"id":"2","enabled":true,"type":"terms","schema":"segment","params":{"field":"DestWeather","size":10,"order":"desc","orderBy":"1","otherBucket":false,"otherBucketLabel":"Other","missingBucket":false,"missingBucketLabel":"Missing"}}]}',
      uiStateJSON: '{}',
      description: '',
      version: 1,
      kibanaSavedObjectMeta: {
        searchSourceJSON:
          '{"index":"d3d7af60-4c81-11e8-b3d7-01146121b73d","filter":[],"query":{"query":"","language":"kuery"}}',
      },
    },
  },
  {
    id: '129be430-4c93-11e8-b3d7-01146121b73d',
    type: 'visualization',
    updated_at: '2018-05-09T15:49:03.736Z',
    version: 1,
    migrationVersion: {},
    attributes: {
      title: i18n.translate('server.sampleData.flightsSpec.markdownInstructionsTitle', {
        defaultMessage: '[Flights] Markdown Instructions',
      }),
      visState:
        '{"title":"[Flights] Markdown Instructions","type":"markdown","params":{"fontSize":10,"openLinksInNewTab":true,"markdown":"### Sample Flight data\\nThis dashboard contains sample data for you to play with. You can view it, search it, and interact with the visualizations. For more information about Kibana, check our [docs](https://www.elastic.co/guide/en/kibana/current/index.html)."},"aggs":[]}',
      uiStateJSON: '{}',
      description: '',
      version: 1,
      kibanaSavedObjectMeta: {
        searchSourceJSON: '{}',
      },
    },
  },
  {
    id: '334084f0-52fd-11e8-a160-89cc2ad9e8e2',
    type: 'visualization',
    updated_at: '2018-05-09T15:49:03.736Z',
    version: 1,
    migrationVersion: {},
    attributes: {
      title: i18n.translate('server.sampleData.flightsSpec.originCountryTicketPricesTitle', {
        defaultMessage: '[Flights] Origin Country Ticket Prices',
      }),
      visState:
        '{"title":"[Flights] Origin Country Ticket Prices","type":"region_map","params":{"legendPosition":"bottomright","addTooltip":true,"colorSchema":"Blues","selectedLayer":{"attribution":"<p><a href=\\"http://www.naturalearthdata.com/about/terms-of-use\\">Made with NaturalEarth</a> | <a href=\\"https://www.elastic.co/elastic-maps-service\\">Elastic Maps Service</a></p>&#10;","name":"World Countries","weight":1,"format":{"type":"geojson"},"url":"https://vector.maps.elastic.co/blob/5659313586569216?elastic_tile_service_tos=agree&my_app_version=6.3.0&license=686f9ec6-d775-44f0-b334-38caf85da617","fields":[{"name":"iso2","description":"Two letter abbreviation"},{"name":"name","description":"Country name"},{"name":"iso3","description":"Three letter abbreviation"}],"created_at":"2017-04-26T17:12:15.978370","tags":[],"id":5659313586569216,"layerId":"elastic_maps_service.World Countries"},"selectedJoinField":{"name":"iso2","description":"Two letter abbreviation"},"isDisplayWarning":false,"wms":{"enabled":false,"options":{"format":"image/png","transparent":true},"baseLayersAreLoaded":{},"tmsLayers":[{"id":"road_map","url":"https://tiles.maps.elastic.co/v2/default/{z}/{x}/{y}.png?elastic_tile_service_tos=agree&my_app_name=kibana&my_app_version=6.3.0&license=686f9ec6-d775-44f0-b334-38caf85da617","minZoom":0,"maxZoom":18,"attribution":"<p>&#169; <a href=\\"http://www.openstreetmap.org/copyright\\">OpenStreetMap</a> contributors | <a href=\\"https://www.elastic.co/elastic-maps-service\\">Elastic Maps Service</a></p>&#10;","subdomains":[]}],"selectedTmsLayer":{"id":"road_map","url":"https://tiles.maps.elastic.co/v2/default/{z}/{x}/{y}.png?elastic_tile_service_tos=agree&my_app_name=kibana&my_app_version=6.3.0&license=686f9ec6-d775-44f0-b334-38caf85da617","minZoom":0,"maxZoom":18,"attribution":"<p>&#169; <a href=\\"http://www.openstreetmap.org/copyright\\">OpenStreetMap</a> contributors | <a href=\\"https://www.elastic.co/elastic-maps-service\\">Elastic Maps Service</a></p>&#10;","subdomains":[]}},"mapZoom":2,"mapCenter":[0,0],"outlineWeight":1,"showAllShapes":true},"aggs":[{"id":"1","enabled":true,"type":"avg","schema":"metric","params":{"field":"AvgTicketPrice"}},{"id":"2","enabled":true,"type":"terms","schema":"segment","params":{"field":"OriginCountry","size":100,"order":"desc","orderBy":"1","otherBucket":false,"otherBucketLabel":"Other","missingBucket":false,"missingBucketLabel":"Missing"}}]}',
      uiStateJSON: '{}',
      description: '',
      version: 1,
      kibanaSavedObjectMeta: {
        searchSourceJSON:
          '{"index":"d3d7af60-4c81-11e8-b3d7-01146121b73d","filter":[],"query":{"query":"","language":"kuery"}}',
      },
    },
  },
  {
    id: 'f8283bf0-52fd-11e8-a160-89cc2ad9e8e2',
    type: 'visualization',
    updated_at: '2018-05-09T15:49:03.736Z',
    version: 1,
    migrationVersion: {},
    attributes: {
      title: i18n.translate('server.sampleData.flightsSpec.totalFlightDelaysTitle', {
        defaultMessage: '[Flights] Total Flight Delays',
      }),
      visState:
        '{"title":"[Flights] Total Flight Delays","type":"gauge","params":{"type":"gauge","addTooltip":true,"addLegend":true,"isDisplayWarning":false,"gauge":{"verticalSplit":false,"extendRange":true,"percentageMode":false,"gaugeType":"Arc","gaugeStyle":"Full","backStyle":"Full","orientation":"vertical","colorSchema":"Blues","gaugeColorMode":"Labels","colorsRange":[{"from":0,"to":75},{"from":75,"to":150},{"from":150,"to":225},{"from":225,"to":300}],"invertColors":true,"labels":{"show":false,"color":"black"},"scale":{"show":false,"labels":false,"color":"#333"},"type":"meter","style":{"bgWidth":0.9,"width":0.9,"mask":false,"bgMask":false,"maskBars":50,"bgFill":"#eee","bgColor":false,"subText":"","fontSize":60,"labelColor":true}}},"aggs":[{"id":"1","enabled":true,"type":"count","schema":"metric","params":{"customLabel":"Total Delays"}}]}',
      uiStateJSON:
        '{"vis":{"defaultColors":{"0 - 75":"rgb(8,48,107)","75 - 150":"rgb(55,135,192)","150 - 225":"rgb(171,208,230)","225 - 300":"rgb(247,251,255)"}}}',
      description: '',
      version: 1,
      kibanaSavedObjectMeta: {
        searchSourceJSON:
          '{"index":"d3d7af60-4c81-11e8-b3d7-01146121b73d","filter":[{"meta":{"index":"d3d7af60-4c81-11e8-b3d7-01146121b73d","negate":false,"disabled":false,"alias":null,"type":"phrase","key":"FlightDelay","value":"true","params":{"query":true,"type":"phrase"}},"query":{"match":{"FlightDelay":{"query":true,"type":"phrase"}}},"$state":{"store":"appState"}}],"query":{"query":"","language":"kuery"}}',
      },
    },
  },
  {
    id: '08884800-52fe-11e8-a160-89cc2ad9e8e2',
    type: 'visualization',
    updated_at: '2018-05-09T15:49:03.736Z',
    version: 1,
    migrationVersion: {},
    attributes: {
      title: i18n.translate('server.sampleData.flightsSpec.totalFlightCancellationsTitle', {
        defaultMessage: '[Flights] Total Flight Cancellations',
      }),
      visState:
        '{"title":"[Flights] Total Flight Cancellations","type":"gauge","params":{"type":"gauge","addTooltip":true,"addLegend":true,"isDisplayWarning":false,"gauge":{"verticalSplit":false,"extendRange":true,"percentageMode":false,"gaugeType":"Arc","gaugeStyle":"Full","backStyle":"Full","orientation":"vertical","colorSchema":"Blues","gaugeColorMode":"Labels","colorsRange":[{"from":0,"to":75},{"from":75,"to":150},{"from":150,"to":225},{"from":225,"to":300}],"invertColors":true,"labels":{"show":false,"color":"black"},"scale":{"show":false,"labels":false,"color":"#333"},"type":"meter","style":{"bgWidth":0.9,"width":0.9,"mask":false,"bgMask":false,"maskBars":50,"bgFill":"#eee","bgColor":false,"subText":"","fontSize":60,"labelColor":true}}},"aggs":[{"id":"1","enabled":true,"type":"count","schema":"metric","params":{"customLabel":"Total Cancellations"}}]}',
      uiStateJSON:
        '{"vis":{"defaultColors":{"0 - 75":"rgb(8,48,107)","75 - 150":"rgb(55,135,192)","150 - 225":"rgb(171,208,230)","225 - 300":"rgb(247,251,255)"}}}',
      description: '',
      version: 1,
      kibanaSavedObjectMeta: {
        searchSourceJSON:
          '{"index":"d3d7af60-4c81-11e8-b3d7-01146121b73d","filter":[{"meta":{"index":"d3d7af60-4c81-11e8-b3d7-01146121b73d","negate":false,"disabled":false,"alias":null,"type":"phrase","key":"Cancelled","value":"true","params":{"query":true,"type":"phrase"}},"query":{"match":{"Cancelled":{"query":true,"type":"phrase"}}},"$state":{"store":"appState"}}],"query":{"query":"","language":"kuery"}}',
      },
    },
  },
  {
    id: 'e6944e50-52fe-11e8-a160-89cc2ad9e8e2',
    type: 'visualization',
    updated_at: '2018-05-09T15:49:03.736Z',
    version: 1,
    migrationVersion: {},
    attributes: {
      title: i18n.translate('server.sampleData.flightsSpec.originCountryTitle', {
        defaultMessage: '[Flights] Origin Country vs. Destination Country',
      }),
      visState:
        '{"title":"[Flights] Origin Country vs. Destination Country","type":"heatmap","params":{"type":"heatmap","addTooltip":true,"addLegend":true,"enableHover":false,"legendPosition":"right","times":[],"colorsNumber":5,"colorSchema":"Blues","setColorRange":false,"colorsRange":[],"invertColors":false,"percentageMode":false,"valueAxes":[{"show":false,"id":"ValueAxis-1","type":"value","scale":{"type":"linear","defaultYExtents":false},"labels":{"show":false,"rotate":0,"overwriteColor":false,"color":"#555"}}]},"aggs":[{"id":"1","enabled":true,"type":"count","schema":"metric","params":{}},{"id":"2","enabled":true,"type":"terms","schema":"group","params":{"field":"OriginCountry","size":5,"order":"desc","orderBy":"1","otherBucket":false,"otherBucketLabel":"Other","missingBucket":false,"missingBucketLabel":"Missing","customLabel":"Origin Country"}},{"id":"3","enabled":true,"type":"terms","schema":"segment","params":{"field":"DestCountry","size":5,"order":"desc","orderBy":"1","otherBucket":false,"otherBucketLabel":"Other","missingBucket":false,"missingBucketLabel":"Missing","customLabel":"Destination Country"}}]}',
      uiStateJSON:
        '{"vis":{"defaultColors":{"0 - 22":"rgb(247,251,255)","22 - 44":"rgb(208,225,242)","44 - 66":"rgb(148,196,223)","66 - 88":"rgb(74,152,201)","88 - 110":"rgb(23,100,171)"}}}',
      description: '',
      version: 1,
      kibanaSavedObjectMeta: {
        searchSourceJSON:
          '{"index":"d3d7af60-4c81-11e8-b3d7-01146121b73d","filter":[],"query":{"query":"","language":"kuery"}}',
      },
    },
  },
  {
    id: '01c413e0-5395-11e8-99bf-1ba7b1bdaa61',
    type: 'visualization',
    updated_at: '2018-05-09T15:49:03.736Z',
    version: 1,
    migrationVersion: {},
    attributes: {
      title: i18n.translate('server.sampleData.flightsSpec.totalFlightsTitle', {
        defaultMessage: '[Flights] Total Flights',
      }),
      visState:
        '{"title":"[Flights] Total Flights","type":"metric","params":{"addTooltip":true,"addLegend":false,"type":"metric","metric":{"percentageMode":false,"useRanges":false,"colorSchema":"Green to Red","metricColorMode":"None","colorsRange":[{"from":0,"to":10000}],"labels":{"show":true},"invertColors":false,"style":{"bgFill":"#000","bgColor":false,"labelColor":false,"subText":"","fontSize":36}}},"aggs":[{"id":"1","enabled":true,"type":"count","schema":"metric","params":{"customLabel":"Total Flights"}}]}',
      uiStateJSON: '{}',
      description: '',
      version: 1,
      kibanaSavedObjectMeta: {
        searchSourceJSON:
          '{"index":"d3d7af60-4c81-11e8-b3d7-01146121b73d","filter":[],"query":{"query":"","language":"kuery"}}',
      },
    },
  },
  {
    id: '2edf78b0-5395-11e8-99bf-1ba7b1bdaa61',
    type: 'visualization',
    updated_at: '2018-05-09T15:49:03.736Z',
    version: 1,
    migrationVersion: {},
    attributes: {
      title: i18n.translate('server.sampleData.flightsSpec.averageTicketPriceTitle', {
        defaultMessage: '[Flights] Average Ticket Price',
      }),
      visState:
        '{"title":"[Flights] Average Ticket Price","type":"metric","params":{"addTooltip":true,"addLegend":false,"type":"metric","metric":{"percentageMode":false,"useRanges":false,"colorSchema":"Green to Red","metricColorMode":"None","colorsRange":[{"from":0,"to":10000}],"labels":{"show":true},"invertColors":false,"style":{"bgFill":"#000","bgColor":false,"labelColor":false,"subText":"","fontSize":36}}},"aggs":[{"id":"1","enabled":true,"type":"avg","schema":"metric","params":{"field":"AvgTicketPrice","customLabel":"Avg. Ticket Price"}}]}',
      uiStateJSON: '{}',
      description: '',
      version: 1,
      kibanaSavedObjectMeta: {
        searchSourceJSON:
          '{"index":"d3d7af60-4c81-11e8-b3d7-01146121b73d","filter":[],"query":{"query":"","language":"kuery"}}',
      },
    },
  },
  {
    id: 'ed78a660-53a0-11e8-acbd-0be0ad9d822b',
    type: 'visualization',
    updated_at: '2018-05-09T15:55:51.195Z',
    version: 3,
    migrationVersion: {},
    attributes: {
      title: i18n.translate('server.sampleData.flightsSpec.airportConnectionsTitle', {
        defaultMessage: '[Flights] Airport Connections (Hover Over Airport)',
      }),
      visState:
        '{"aggs":[],"params":{"spec":"{\\n  $schema: https://vega.github.io/schema/vega/v3.0.json\\n  config: {\\n    kibana: {type: \\"map\\", latitude: 25, longitude: -70, zoom: 3}\\n  }\\n  data: [\\n    {\\n      name: table\\n      url: {\\n        index: kibana_sample_data_flights\\n        %context%: true\\n        // Uncomment to enable time filtering\\n        // %timefield%: timestamp\\n        body: {\\n          size: 0\\n          aggs: {\\n            origins: {\\n              terms: {field: \\"OriginAirportID\\", size: 10000}\\n              aggs: {\\n                originLocation: {\\n                  top_hits: {\\n                    size: 1\\n                    _source: {\\n                      includes: [\\"OriginLocation\\", \\"Origin\\"]\\n                    }\\n                  }\\n                }\\n                distinations: {\\n                  terms: {field: \\"DestAirportID\\", size: 10000}\\n                  aggs: {\\n                    destLocation: {\\n                      top_hits: {\\n                        size: 1\\n                        _source: {\\n                          includes: [\\"DestLocation\\"]\\n                        }\\n                      }\\n                    }\\n                  }\\n                }\\n              }\\n            }\\n          }\\n        }\\n      }\\n      format: {property: \\"aggregations.origins.buckets\\"}\\n      transform: [\\n        {\\n          type: geopoint\\n          projection: projection\\n          fields: [\\n            originLocation.hits.hits[0]._source.OriginLocation.lon\\n            originLocation.hits.hits[0]._source.OriginLocation.lat\\n          ]\\n        }\\n      ]\\n    }\\n    {\\n      name: selectedDatum\\n      on: [\\n        {trigger: \\"!selected\\", remove: true}\\n        {trigger: \\"selected\\", insert: \\"selected\\"}\\n      ]\\n    }\\n  ]\\n  signals: [\\n    {\\n      name: selected\\n      value: null\\n      on: [\\n        {events: \\"@airport:mouseover\\", update: \\"datum\\"}\\n        {events: \\"@airport:mouseout\\", update: \\"null\\"}\\n      ]\\n    }\\n  ]\\n  scales: [\\n    {\\n      name: airportSize\\n      type: linear\\n      domain: {data: \\"table\\", field: \\"doc_count\\"}\\n      range: [\\n        {signal: \\"zoom*zoom*0.2+1\\"}\\n        {signal: \\"zoom*zoom*10+1\\"}\\n      ]\\n    }\\n  ]\\n  marks: [\\n    {\\n      type: group\\n      from: {\\n        facet: {\\n          name: facetedDatum\\n          data: selectedDatum\\n          field: distinations.buckets\\n        }\\n      }\\n      data: [\\n        {\\n          name: facetDatumElems\\n          source: facetedDatum\\n          transform: [\\n            {\\n              type: geopoint\\n              projection: projection\\n              fields: [\\n                destLocation.hits.hits[0]._source.DestLocation.lon\\n                destLocation.hits.hits[0]._source.DestLocation.lat\\n              ]\\n            }\\n            {type: \\"formula\\", expr: \\"{x:parent.x, y:parent.y}\\", as: \\"source\\"}\\n            {type: \\"formula\\", expr: \\"{x:datum.x, y:datum.y}\\", as: \\"target\\"}\\n            {type: \\"linkpath\\", shape: \\"diagonal\\"}\\n          ]\\n        }\\n      ]\\n      scales: [\\n        {\\n          name: lineThickness\\n          type: linear\\n          domain: {data: \\"facetDatumElems\\", field: \\"doc_count\\"}\\n          range: [1, 8]\\n        }\\n        {\\n          name: lineOpacity\\n          type: linear\\n          domain: {data: \\"facetDatumElems\\", field: \\"doc_count\\"}\\n          range: [0.2, 0.8]\\n        }\\n      ]\\n      marks: [\\n        {\\n          from: {data: \\"facetDatumElems\\"}\\n          type: path\\n          interactive: false\\n          encode: {\\n            update: {\\n              path: {field: \\"path\\"}\\n              stroke: {value: \\"black\\"}\\n              strokeWidth: {scale: \\"lineThickness\\", field: \\"doc_count\\"}\\n              strokeOpacity: {scale: \\"lineOpacity\\", field: \\"doc_count\\"}\\n            }\\n          }\\n        }\\n      ]\\n    }\\n    {\\n      name: airport\\n      type: symbol\\n      from: {data: \\"table\\"}\\n      encode: {\\n        update: {\\n          size: {scale: \\"airportSize\\", field: \\"doc_count\\"}\\n          xc: {signal: \\"datum.x\\"}\\n          yc: {signal: \\"datum.y\\"}\\n          tooltip: {\\n            signal: \\"{title: datum.originLocation.hits.hits[0]._source.Origin + \' (\' + datum.key + \')\', connnections: length(datum.distinations.buckets), flights: datum.doc_count}\\"\\n          }\\n        }\\n      }\\n    }\\n  ]\\n}"},"title":"[Flights] Airport Connections (Hover Over Airport)","type":"vega"}',
      uiStateJSON: '{}',
      description: '',
      version: 1,
      kibanaSavedObjectMeta: {
        searchSourceJSON: '{"query":{"query":"","language":"kuery"},"filter":[]}',
      },
    },
  },
  {
    id: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
    type: 'index-pattern',
    updated_at: '2018-05-09T15:49:03.736Z',
    version: 1,
    migrationVersion: {},
    attributes: {
      title: 'kibana_sample_data_flights',
      timeFieldName: 'timestamp',
      fields:
        '[{"name":"AvgTicketPrice","type":"number","esTypes":["float"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"Cancelled","type":"boolean","esTypes":["boolean"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"Carrier","type":"string","esTypes":["keyword"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"Dest","type":"string","esTypes":["keyword"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"DestAirportID","type":"string","esTypes":["keyword"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"DestCityName","type":"string","esTypes":["keyword"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"DestCountry","type":"string","esTypes":["keyword"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"DestLocation","type":"geo_point","esTypes":["geo_point"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"DestRegion","type":"string","esTypes":["keyword"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"DestWeather","type":"string","esTypes":["keyword"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"DistanceKilometers","type":"number","esTypes":["float"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"DistanceMiles","type":"number","esTypes":["float"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"FlightDelay","type":"boolean","esTypes":["boolean"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"FlightDelayMin","type":"number","esTypes":["integer"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"FlightDelayType","type":"string","esTypes":["keyword"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"FlightNum","type":"string","esTypes":["keyword"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"FlightTimeHour","type":"string","esTypes":["keyword"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"FlightTimeMin","type":"number","esTypes":["float"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"Origin","type":"string","esTypes":["keyword"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"OriginAirportID","type":"string","esTypes":["keyword"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"OriginCityName","type":"string","esTypes":["keyword"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"OriginCountry","type":"string","esTypes":["keyword"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"OriginLocation","type":"geo_point","esTypes":["geo_point"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"OriginRegion","type":"string","esTypes":["keyword"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"OriginWeather","type":"string","esTypes":["keyword"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"_id","type":"string","esTypes":["_id"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":false},{"name":"_index","type":"string","esTypes":["_index"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":false},{"name":"_score","type":"number","count":0,"scripted":false,"searchable":false,"aggregatable":false,"readFromDocValues":false},{"name":"_source","type":"_source","esTypes":["_source"],"count":0,"scripted":false,"searchable":false,"aggregatable":false,"readFromDocValues":false},{"name":"_type","type":"string","esTypes":["_type"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":false},{"name":"dayOfWeek","type":"number","esTypes":["integer"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"timestamp","type":"date","esTypes":["date"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"hour_of_day","type":"number","count":0,"scripted":true,"script":"doc[\'timestamp\'].value.hourOfDay","lang":"painless","searchable":true,"aggregatable":true,"readFromDocValues":false}]',
      fieldFormatMap:
        '{"hour_of_day":{"id":"number","params":{"pattern":"00"}},"AvgTicketPrice":{"id":"number","params":{"pattern":"$0,0.[00]"}}}',
    },
  },
  {
    id: '7adfa750-4c81-11e8-b3d7-01146121b73d',
    type: 'dashboard',
    updated_at: '2018-05-09T15:59:04.578Z',
    version: 4,
    references: [
      {
        name: 'panel_0',
        type: 'visualization',
        id: 'aeb212e0-4c84-11e8-b3d7-01146121b73d',
      },
      {
        name: 'panel_1',
        type: 'visualization',
        id: 'c8fc3d30-4c87-11e8-b3d7-01146121b73d',
      },
      {
        name: 'panel_2',
        type: 'search',
        id: '571aaf70-4c88-11e8-b3d7-01146121b73d',
      },
      {
        name: 'panel_3',
        type: 'visualization',
        id: '8f4d0c00-4c86-11e8-b3d7-01146121b73d',
      },
      {
        name: 'panel_4',
        type: 'visualization',
        id: 'f8290060-4c88-11e8-b3d7-01146121b73d',
      },
      {
        name: 'panel_5',
        type: 'visualization',
        id: 'bcb63b50-4c89-11e8-b3d7-01146121b73d',
      },
      {
        name: 'panel_6',
        type: 'visualization',
        id: '9886b410-4c8b-11e8-b3d7-01146121b73d',
      },
      {
        name: 'panel_7',
        type: 'visualization',
        id: '76e3c090-4c8c-11e8-b3d7-01146121b73d',
      },
      {
        name: 'panel_8',
        type: 'visualization',
        id: '707665a0-4c8c-11e8-b3d7-01146121b73d',
      },
      {
        name: 'panel_10',
        type: 'visualization',
        id: '293b5a30-4c8f-11e8-b3d7-01146121b73d',
      },
      {
        name: 'panel_11',
        type: 'visualization',
        id: '129be430-4c93-11e8-b3d7-01146121b73d',
      },
      {
        name: 'panel_12',
        type: 'visualization',
        id: '334084f0-52fd-11e8-a160-89cc2ad9e8e2',
      },
      {
        name: 'panel_13',
        type: 'visualization',
        id: 'f8283bf0-52fd-11e8-a160-89cc2ad9e8e2',
      },
      {
        name: 'panel_14',
        type: 'visualization',
        id: '08884800-52fe-11e8-a160-89cc2ad9e8e2',
      },
      {
        name: 'panel_15',
        type: 'visualization',
        id: 'e6944e50-52fe-11e8-a160-89cc2ad9e8e2',
      },
      {
        name: 'panel_16',
        type: 'visualization',
        id: '01c413e0-5395-11e8-99bf-1ba7b1bdaa61',
      },
      {
        name: 'panel_17',
        type: 'visualization',
        id: '2edf78b0-5395-11e8-99bf-1ba7b1bdaa61',
      },
      {
        name: 'panel_18',
        type: 'visualization',
        id: 'ed78a660-53a0-11e8-acbd-0be0ad9d822b',
      },
    ],
    migrationVersion: {
      dashboard: '7.0.0',
    },
    attributes: {
      title: i18n.translate('server.sampleData.flightsSpec.globalFlightDashboardTitle', {
        defaultMessage: '[Flights] Global Flight Dashboard',
      }),
      hits: 0,
      description: i18n.translate(
        'server.sampleData.flightsSpec.globalFlightDashboardDescription',
        {
          defaultMessage:
            'Analyze mock flight data for ES-Air, Logstash Airways, Kibana Airlines and JetBeats',
        }
      ),
      panelsJSON:
        '[{"panelIndex":"1","gridData":{"x":0,"y":0,"w":32,"h":7,"i":"1"},"embeddableConfig":{},"version":"6.3.0","panelRefName":"panel_0"},{"panelIndex":"3","gridData":{"x":17,"y":7,"w":23,"h":12,"i":"3"},"embeddableConfig":{"vis":{"colors":{"Average Ticket Price":"#0A50A1","Flight Count":"#82B5D8"},"legendOpen":false}},"version":"6.3.0","panelRefName":"panel_1"},{"panelIndex":"4","gridData":{"x":0,"y":85,"w":48,"h":15,"i":"4"},"embeddableConfig":{},"version":"6.3.0","panelRefName":"panel_2"},{"panelIndex":"5","gridData":{"x":0,"y":7,"w":17,"h":12,"i":"5"},"embeddableConfig":{"vis":{"colors":{"ES-Air":"#447EBC","JetBeats":"#65C5DB","Kibana Airlines":"#BA43A9","Logstash Airways":"#E5AC0E"},"legendOpen":false}},"version":"6.3.0","panelRefName":"panel_3"},{"panelIndex":"6","gridData":{"x":24,"y":33,"w":24,"h":14,"i":"6"},"embeddableConfig":{"vis":{"colors":{"Carrier Delay":"#5195CE","Late Aircraft Delay":"#1F78C1","NAS Delay":"#70DBED","No Delay":"#BADFF4","Security Delay":"#052B51","Weather Delay":"#6ED0E0"}}},"version":"6.3.0","panelRefName":"panel_4"},{"panelIndex":"7","gridData":{"x":24,"y":19,"w":24,"h":14,"i":"7"},"embeddableConfig":{},"version":"6.3.0","panelRefName":"panel_5"},{"panelIndex":"10","gridData":{"x":0,"y":35,"w":24,"h":12,"i":"10"},"embeddableConfig":{"vis":{"colors":{"Count":"#1F78C1"},"legendOpen":false}},"version":"6.3.0","panelRefName":"panel_6"},{"panelIndex":"13","gridData":{"x":10,"y":19,"w":14,"h":8,"i":"13"},"embeddableConfig":{"vis":{"colors":{"Count":"#1F78C1"},"legendOpen":false}},"version":"6.3.0","panelRefName":"panel_7"},{"panelIndex":"14","gridData":{"x":10,"y":27,"w":14,"h":8,"i":"14"},"embeddableConfig":{"vis":{"colors":{"Count":"#1F78C1"},"legendOpen":false}},"version":"6.3.0","panelRefName":"panel_8"},{"panelIndex":"21","gridData":{"x":0,"y":62,"w":48,"h":8,"i":"21"},"embeddableConfig":{},"version":"6.3.0","panelRefName":"panel_10"},{"panelIndex":"22","gridData":{"x":32,"y":0,"w":16,"h":7,"i":"22"},"embeddableConfig":{},"version":"6.3.0","panelRefName":"panel_11"},{"panelIndex":"23","gridData":{"x":0,"y":70,"w":48,"h":15,"i":"23"},"embeddableConfig":{"mapCenter":[42.19556096274418,9.536742995308601e-7],"mapZoom":1},"version":"6.3.0","panelRefName":"panel_12"},{"panelIndex":"25","gridData":{"x":0,"y":19,"w":10,"h":8,"i":"25"},"embeddableConfig":{"vis":{"defaultColors":{"0 - 50":"rgb(247,251,255)","100 - 150":"rgb(107,174,214)","150 - 200":"rgb(33,113,181)","200 - 250":"rgb(8,48,107)","50 - 100":"rgb(198,219,239)"},"legendOpen":false}},"version":"6.3.0","panelRefName":"panel_13"},{"panelIndex":"27","gridData":{"x":0,"y":27,"w":10,"h":8,"i":"27"},"embeddableConfig":{"vis":{"defaultColors":{"0 - 50":"rgb(247,251,255)","100 - 150":"rgb(107,174,214)","150 - 200":"rgb(33,113,181)","200 - 250":"rgb(8,48,107)","50 - 100":"rgb(198,219,239)"},"legendOpen":false}},"version":"6.3.0","panelRefName":"panel_14"},{"panelIndex":"28","gridData":{"x":0,"y":47,"w":24,"h":15,"i":"28"},"embeddableConfig":{"vis":{"defaultColors":{"0 - 11":"rgb(247,251,255)","11 - 22":"rgb(208,225,242)","22 - 33":"rgb(148,196,223)","33 - 44":"rgb(74,152,201)","44 - 55":"rgb(23,100,171)"},"legendOpen":false}},"version":"6.3.0","panelRefName":"panel_15"},{"panelIndex":"29","gridData":{"x":40,"y":7,"w":8,"h":6,"i":"29"},"embeddableConfig":{},"version":"6.3.0","panelRefName":"panel_16"},{"panelIndex":"30","gridData":{"x":40,"y":13,"w":8,"h":6,"i":"30"},"embeddableConfig":{},"version":"6.3.0","panelRefName":"panel_17"},{"panelIndex":"31","gridData":{"x":24,"y":47,"w":24,"h":15,"i":"31"},"embeddableConfig":{},"version":"6.3.0","panelRefName":"panel_18"}]',
      optionsJSON: '{"hidePanelTitles":false,"useMargins":true}',
      version: 1,
      timeRestore: true,
      timeTo: 'now',
      timeFrom: 'now-24h',
      refreshInterval: {
        display: '15 minutes',
        pause: false,
        section: 2,
        value: 900000,
      },
      kibanaSavedObjectMeta: {
        searchSourceJSON:
          '{"query":{"language":"kuery","query":""},"filter":[],"highlightAll":true,"version":true}',
      },
    },
  },
];
