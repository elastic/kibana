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
    id: 'e1d0f010-9ee7-11e7-8711-e7a007dcef99',
    type: 'visualization',
    updated_at: '2018-08-29T13:22:17.617Z',
    version: 1,
    migrationVersion: {},
    attributes: {
      title: i18n.translate('server.sampleData.logsSpec.uniqueVisitorsTitle', {
        defaultMessage: '[Logs] Unique Visitors vs. Average Bytes',
      }),
      visState:
        '{"title":"[Logs] Unique Visitors vs. Average Bytes","type":"area","params":{"type":"area","grid":{"categoryLines":false,"style":{"color":"#eee"}},"categoryAxes":[{"id":"CategoryAxis-1","type":"category","position":"bottom","show":true,"style":{},"scale":{"type":"linear"},"labels":{"show":true,"truncate":100},"title":{}}],"valueAxes":[{"id":"ValueAxis-1","name":"LeftAxis-1","type":"value","position":"left","show":true,"style":{},"scale":{"type":"linear","mode":"normal"},"labels":{"show":true,"rotate":0,"filter":false,"truncate":100},"title":{"text":"Avg. Bytes"}},{"id":"ValueAxis-2","name":"RightAxis-1","type":"value","position":"right","show":true,"style":{},"scale":{"type":"linear","mode":"normal"},"labels":{"show":true,"rotate":0,"filter":false,"truncate":100},"title":{"text":"Unique Visitors"}}],"seriesParams":[{"show":"true","type":"histogram","mode":"stacked","data":{"label":"Avg. Bytes","id":"1"},"drawLinesBetweenPoints":true,"showCircles":true,"interpolate":"linear","valueAxis":"ValueAxis-1"},{"show":true,"mode":"stacked","type":"line","drawLinesBetweenPoints":false,"showCircles":true,"interpolate":"linear","data":{"id":"2","label":"Unique Visitors"},"valueAxis":"ValueAxis-2"}],"addTooltip":true,"addLegend":true,"legendPosition":"right","times":[],"addTimeMarker":false,"radiusRatio":17},"aggs":[{"id":"1","enabled":true,"type":"avg","schema":"metric","params":{"field":"bytes","customLabel":"Avg. Bytes"}},{"id":"2","enabled":true,"type":"cardinality","schema":"metric","params":{"field":"clientip","customLabel":"Unique Visitors"}},{"id":"3","enabled":true,"type":"date_histogram","schema":"segment","params":{"field":"timestamp","interval":"auto","time_zone":"America/Los_Angeles","customInterval":"2h","min_doc_count":1,"extended_bounds":{}}},{"id":"4","enabled":true,"type":"count","schema":"radius","params":{}}]}',
      uiStateJSON: '{"vis":{"colors":{"Avg. Bytes":"#70DBED","Unique Visitors":"#0A437C"}}}',
      description: '',
      version: 1,
      kibanaSavedObjectMeta: {
        searchSourceJSON:
          '{"index":"90943e30-9a47-11e8-b64d-95841ca0b247","filter":[],"query":{"query":"","language":"kuery"}}',
      },
    },
  },
  {
    id: '06cf9c40-9ee8-11e7-8711-e7a007dcef99',
    type: 'visualization',
    updated_at: '2018-08-29T13:22:17.617Z',
    version: 1,
    migrationVersion: {},
    attributes: {
      title: i18n.translate('server.sampleData.logsSpec.uniqueVisitorsByCountryTitle', {
        defaultMessage: '[Logs] Unique Visitors by Country',
      }),
      visState:
        '{"title":"[Logs] Unique Visitors by Country","type":"region_map","params":{"legendPosition":"bottomright","addTooltip":true,"colorSchema":"Reds","selectedLayer":{"attribution":"<p><a href=\\"http://www.naturalearthdata.com/about/terms-of-use\\">Made with NaturalEarth</a> | <a href=\\"https://www.elastic.co/elastic-maps-service\\">Elastic Maps Service</a></p>&#10;","name":"World Countries","weight":1,"format":{"type":"geojson"},"url":"https://vector.maps.elastic.co/blob/5659313586569216?elastic_tile_service_tos=agree&my_app_version=6.2.3&license=77ab0ecf-a521-499d-bd52-fbd740bb81d0","fields":[{"name":"iso2","description":"Two letter abbreviation"},{"name":"name","description":"Country name"},{"name":"iso3","description":"Three letter abbreviation"}],"created_at":"2017-04-26T17:12:15.978370","tags":[],"id":5659313586569216,"layerId":"elastic_maps_service.World Countries"},"selectedJoinField":{"name":"iso2","description":"Two letter abbreviation"},"isDisplayWarning":false,"wms":{"enabled":false,"options":{"format":"image/png","transparent":true},"baseLayersAreLoaded":{},"tmsLayers":[{"id":"road_map","url":"https://tiles.maps.elastic.co/v2/default/{z}/{x}/{y}.png?elastic_tile_service_tos=agree&my_app_name=kibana&my_app_version=6.2.3&license=77ab0ecf-a521-499d-bd52-fbd740bb81d0","minZoom":0,"maxZoom":18,"attribution":"<p>&#169; <a href=\\"http://www.openstreetmap.org/copyright\\">OpenStreetMap</a> contributors | <a href=\\"https://www.elastic.co/elastic-maps-service\\">Elastic Maps Service</a></p>&#10;","subdomains":[]}],"selectedTmsLayer":{"id":"road_map","url":"https://tiles.maps.elastic.co/v2/default/{z}/{x}/{y}.png?elastic_tile_service_tos=agree&my_app_name=kibana&my_app_version=6.2.3&license=77ab0ecf-a521-499d-bd52-fbd740bb81d0","minZoom":0,"maxZoom":18,"attribution":"<p>&#169; <a href=\\"http://www.openstreetmap.org/copyright\\">OpenStreetMap</a> contributors | <a href=\\"https://www.elastic.co/elastic-maps-service\\">Elastic Maps Service</a></p>&#10;","subdomains":[]}},"mapZoom":2,"mapCenter":[0,0],"outlineWeight":1,"showAllShapes":true,"emsHotLink":null},"aggs":[{"id":"1","enabled":true,"type":"cardinality","schema":"metric","params":{"field":"clientip","customLabel":"Unique Visitors"}},{"id":"2","enabled":true,"type":"terms","schema":"segment","params":{"field":"geo.src","size":50,"order":"desc","orderBy":"1","otherBucket":false,"otherBucketLabel":"Other","missingBucket":false,"missingBucketLabel":"Missing"}}]}',
      uiStateJSON: '{}',
      description: '',
      version: 1,
      kibanaSavedObjectMeta: {
        searchSourceJSON:
          '{"index":"90943e30-9a47-11e8-b64d-95841ca0b247","filter":[],"query":{"query":"","language":"kuery"}}',
      },
    },
  },
  {
    id: '935afa20-e0cd-11e7-9d07-1398ccfcefa3',
    type: 'visualization',
    updated_at: '2018-08-29T13:22:17.617Z',
    version: 1,
    migrationVersion: {},
    attributes: {
      title: i18n.translate('server.sampleData.logsSpec.heatmapTitle', {
        defaultMessage: '[Logs] Heatmap',
      }),
      visState:
        '{"title":"[Logs] Heatmap","type":"heatmap","params":{"type":"heatmap","addTooltip":true,"addLegend":true,"enableHover":true,"legendPosition":"right","times":[],"colorsNumber":10,"colorSchema":"Reds","setColorRange":false,"colorsRange":[],"invertColors":false,"percentageMode":false,"valueAxes":[{"show":false,"id":"ValueAxis-1","type":"value","scale":{"type":"linear","defaultYExtents":false},"labels":{"show":false,"rotate":0,"color":"#555","overwriteColor":false}}]},"aggs":[{"id":"1","enabled":true,"type":"cardinality","schema":"metric","params":{"field":"clientip"}},{"id":"3","enabled":true,"type":"terms","schema":"group","params":{"field":"geo.src","size":5,"order":"desc","orderBy":"1","otherBucket":false,"otherBucketLabel":"Other","missingBucket":false,"missingBucketLabel":"Missing","customLabel":"Country Source"}},{"id":"2","enabled":true,"type":"terms","schema":"segment","params":{"field":"hour_of_day","size":25,"order":"asc","orderBy":"_key","otherBucket":false,"otherBucketLabel":"Other","missingBucket":false,"missingBucketLabel":"Missing","customLabel":"Hour of Day"}}]}',
      uiStateJSON:
        '{"vis":{"defaultColors":{"0 - 4":"rgb(255,245,240)","4 - 8":"rgb(254,228,216)","8 - 12":"rgb(253,202,181)","12 - 16":"rgb(252,171,142)","16 - 20":"rgb(252,138,106)","20 - 24":"rgb(251,106,74)","24 - 28":"rgb(241,68,50)","28 - 32":"rgb(217,38,35)","32 - 36":"rgb(188,20,26)","36 - 40":"rgb(152,12,19)"}}}',
      description: '',
      version: 1,
      kibanaSavedObjectMeta: {
        searchSourceJSON:
          '{"index":"90943e30-9a47-11e8-b64d-95841ca0b247","filter":[],"query":{"query":"","language":"kuery"}}',
      },
    },
  },
  {
    id: '4eb6e500-e1c7-11e7-b6d5-4dc382ef7f5b',
    type: 'visualization',
    updated_at: '2018-08-29T13:23:20.897Z',
    version: 2,
    migrationVersion: {},
    attributes: {
      title: i18n.translate('server.sampleData.logsSpec.hostVisitsBytesTableTitle', {
        defaultMessage: '[Logs] Host, Visits and Bytes Table',
      }),
      visState:
        '{"title":"[Logs] Host, Visits and Bytes Table","type":"metrics","params":{"id":"61ca57f0-469d-11e7-af02-69e470af7417","type":"table","series":[{"id":"bd09d600-e5b1-11e7-bfc2-a1f7e71965a1","color":"#68BC00","split_mode":"everything","metrics":[{"id":"bd09d601-e5b1-11e7-bfc2-a1f7e71965a1","type":"sum","field":"bytes"},{"sigma":"","id":"c9514c90-e5b1-11e7-bfc2-a1f7e71965a1","type":"sum_bucket","field":"bd09d601-e5b1-11e7-bfc2-a1f7e71965a1"}],"seperate_axis":0,"axis_position":"right","formatter":"bytes","chart_type":"line","line_width":1,"point_size":1,"fill":0.5,"stacked":"none","color_rules":[{"id":"c0c668d0-e5b1-11e7-bfc2-a1f7e71965a1"}],"label":"Bytes (Total)"},{"id":"b7672c30-a6df-11e8-8b18-1da1dfc50975","color":"#68BC00","split_mode":"everything","metrics":[{"id":"b7672c31-a6df-11e8-8b18-1da1dfc50975","type":"sum","field":"bytes"}],"seperate_axis":0,"axis_position":"right","formatter":"bytes","chart_type":"line","line_width":1,"point_size":1,"fill":0.5,"stacked":"none","color_rules":[{"id":"c0c668d0-e5b1-11e7-bfc2-a1f7e71965a1"}],"label":"Bytes (Last Hour)"},{"id":"f2c20700-a6df-11e8-8b18-1da1dfc50975","color":"#68BC00","split_mode":"everything","metrics":[{"id":"f2c20701-a6df-11e8-8b18-1da1dfc50975","type":"cardinality","field":"ip"},{"sigma":"","id":"f46333e0-a6df-11e8-8b18-1da1dfc50975","type":"sum_bucket","field":"f2c20701-a6df-11e8-8b18-1da1dfc50975"}],"seperate_axis":0,"axis_position":"right","formatter":"number","chart_type":"line","line_width":1,"point_size":1,"fill":0.5,"stacked":"none","label":"Unique Visits (Total)","color_rules":[{"value":1000,"id":"2e963080-a6e0-11e8-8b18-1da1dfc50975","text":"rgba(211,49,21,1)","operator":"lt"},{"value":1000,"id":"3d4fb880-a6e0-11e8-8b18-1da1dfc50975","text":"rgba(252,196,0,1)","operator":"gte"},{"value":1500,"id":"435f8a20-a6e0-11e8-8b18-1da1dfc50975","text":"rgba(104,188,0,1)","operator":"gte"}],"offset_time":"","value_template":"","trend_arrows":1},{"id":"46fd7fc0-e5b1-11e7-bfc2-a1f7e71965a1","color":"#68BC00","split_mode":"everything","metrics":[{"id":"46fd7fc1-e5b1-11e7-bfc2-a1f7e71965a1","type":"cardinality","field":"ip"}],"seperate_axis":0,"axis_position":"right","formatter":"number","chart_type":"line","line_width":1,"point_size":1,"fill":0.5,"stacked":"none","label":"Unique Visits (Last Hour)","color_rules":[{"value":10,"id":"4e90aeb0-a6e0-11e8-8b18-1da1dfc50975","text":"rgba(211,49,21,1)","operator":"lt"},{"value":10,"id":"6d59b1c0-a6e0-11e8-8b18-1da1dfc50975","text":"rgba(252,196,0,1)","operator":"gte"},{"value":25,"id":"77578670-a6e0-11e8-8b18-1da1dfc50975","text":"rgba(104,188,0,1)","operator":"gte"}],"offset_time":"","value_template":"","trend_arrows":1}],"time_field":"timestamp","index_pattern":"kibana_sample_data_logs","interval":"1h","axis_position":"left","axis_formatter":"number","show_legend":1,"show_grid":1,"bar_color_rules":[{"id":"e9b4e490-e1c6-11e7-b4f6-0f68c45f7387"}],"pivot_id":"extension.keyword","pivot_label":"Type","drilldown_url":"","axis_scale":"normal"},"aggs":[]}',
      uiStateJSON: '{}',
      description: '',
      version: 1,
      kibanaSavedObjectMeta: {
        searchSourceJSON: '{"query":{"query":"","language":"kuery"},"filter":[]}',
      },
    },
  },
  {
    id: '69a34b00-9ee8-11e7-8711-e7a007dcef99',
    type: 'visualization',
    updated_at: '2018-08-29T13:24:46.136Z',
    version: 2,
    migrationVersion: {},
    attributes: {
      title: i18n.translate('server.sampleData.logsSpec.goalsTitle', {
        defaultMessage: '[Logs] Goals',
      }),
      visState:
        '{"title":"[Logs] Goals","type":"gauge","params":{"type":"gauge","addTooltip":true,"addLegend":false,"gauge":{"verticalSplit":false,"extendRange":true,"percentageMode":false,"gaugeType":"Arc","gaugeStyle":"Full","backStyle":"Full","orientation":"vertical","colorSchema":"Green to Red","gaugeColorMode":"Labels","colorsRange":[{"from":0,"to":500},{"from":500,"to":1000},{"from":1000,"to":1500}],"invertColors":true,"labels":{"show":false,"color":"black"},"scale":{"show":true,"labels":false,"color":"#333"},"type":"meter","style":{"bgWidth":0.9,"width":0.9,"mask":false,"bgMask":false,"maskBars":50,"bgFill":"#eee","bgColor":false,"subText":"visitors","fontSize":60,"labelColor":true}},"isDisplayWarning":false},"aggs":[{"id":"1","enabled":true,"type":"cardinality","schema":"metric","params":{"field":"clientip","customLabel":"Unique Visitors"}}]}',
      uiStateJSON:
        '{"vis":{"defaultColors":{"0 - 500":"rgb(165,0,38)","500 - 1000":"rgb(255,255,190)","1000 - 1500":"rgb(0,104,55)"},"colors":{"75 - 100":"#629E51","50 - 75":"#EAB839","0 - 50":"#E24D42","0 - 100":"#E24D42","200 - 300":"#7EB26D","500 - 1000":"#E5AC0E","0 - 500":"#E24D42","1000 - 1500":"#7EB26D"},"legendOpen":true}}',
      description: '',
      version: 1,
      kibanaSavedObjectMeta: {
        searchSourceJSON:
          '{"index":"90943e30-9a47-11e8-b64d-95841ca0b247","filter":[],"query":{"query":"","language":"kuery"}}',
      },
    },
  },
  {
    id: '42b997f0-0c26-11e8-b0ec-3bb475f6b6ff',
    type: 'visualization',
    updated_at: '2018-08-29T13:22:17.617Z',
    version: 1,
    migrationVersion: {},
    attributes: {
      title: i18n.translate('server.sampleData.logsSpec.fileTypeScatterPlotTitle', {
        defaultMessage: '[Logs] File Type Scatter Plot',
      }),
      visState:
        '{"title":"[Logs] File Type Scatter Plot","type":"vega","params":{"spec":"{\\n  $schema: \\"https://vega.github.io/schema/vega-lite/v2.json\\"\\n  // Use points for drawing to actually create a scatterplot\\n  mark: point\\n  // Specify where to load data from\\n  data: {\\n    // By using an object to the url parameter we will\\n    // construct an Elasticsearch query\\n    url: {\\n      // Context == true means filters of the dashboard will be taken into account\\n      %context%: true\\n      // Specify on which field the time picker should operate\\n      %timefield%: timestamp\\n      // Specify the index pattern to load data from\\n      index: kibana_sample_data_logs\\n      // This body will be send to Elasticsearch\'s _search endpoint\\n      // You can use everything the ES Query DSL supports here\\n      body: {\\n        // Set the size to load 10000 documents\\n        size: 10000,\\n        // Just ask for the fields we actually need for visualization\\n        _source: [\\"timestamp\\", \\"bytes\\", \\"extension\\"]\\n      }\\n    }\\n    // Tell Vega, that the array of data will be inside hits.hits of the response\\n    // since the result returned from Elasticsearch fill have a format like:\\n    // {\\n    //   hits: {\\n    //     total: 42000,\\n    //     max_score: 2,\\n    //     hits: [\\n    //       < our individual documents >\\n    //     ]\\n    //   }\\n    // }\\n    format: { property: \\"hits.hits\\" }\\n  }\\n  // You can do transformation and calculation of the data before drawing it\\n  transform: [\\n    // Since timestamp is a string value, we need to convert it to a unix timestamp\\n    // so that Vega can work on it properly.\\n    {\\n      // Convert _source.timestamp field to a date\\n      calculate: \\"toDate(datum._source[\'timestamp\'])\\"\\n      // Store the result in a field named \\"time\\" in the object\\n      as: \\"time\\"\\n    }\\n  ]\\n  // Specify what data will be drawn on which axis\\n  encoding: {\\n    x: {\\n      // Draw the time field on the x-axis in temporal mode (i.e. as a time axis)\\n      field: time\\n      type: temporal\\n      // Hide the axis label for the x-axis\\n      axis: { title: false }\\n    }\\n    y: {\\n      // Draw the bytes of each document on the y-axis\\n      field: _source.bytes\\n      // Mark the y-axis as quantitative\\n      type: quantitative\\n      // Specify the label for this axis\\n      axis: { title: \\"Transferred bytes\\" }\\n    }\\n    color: {\\n      // Make the color of each point depend on the _source.extension field\\n      field: _source.extension\\n      // Treat different values as completely unrelated values to each other.\\n      // You could switch this to quantitative if you have a numeric field and\\n      // want to create a color scale from one color to another depending on that\\n      // field\'s value.\\n      type: nominal\\n      // Rename the legend title so it won\'t just state: \\"_source.extension\\"\\n      legend: { title: \'File type\' }\\n    }\\n    shape: {\\n      // Also make the shape of each point dependent on the extension.\\n      field: _source.extension\\n      type: nominal\\n    }\\n  }\\n}"},"aggs":[]}',
      uiStateJSON: '{}',
      description: '',
      version: 1,
      kibanaSavedObjectMeta: {
        searchSourceJSON: '{"query":{"query":"","language":"kuery"},"filter":[]}',
      },
    },
  },
  {
    id: '7cbd2350-2223-11e8-b802-5bcf64c2cfb4',
    type: 'visualization',
    updated_at: '2018-08-29T13:22:17.617Z',
    version: 1,
    migrationVersion: {},
    attributes: {
      title: i18n.translate('server.sampleData.logsSpec.sourceAndDestinationSankeyChartTitle', {
        defaultMessage: '[Logs] Source and Destination Sankey Chart',
      }),
      visState:
        '{"title":"[Logs] Source and Destination Sankey Chart","type":"vega","params":{"spec":"{ \\n $schema: https://vega.github.io/schema/vega/v3.0.json\\n  data: [\\n\\t{\\n  \\t// query ES based on the currently selected time range and filter string\\n  \\tname: rawData\\n  \\turl: {\\n    \\t%context%: true\\n    \\t%timefield%: timestamp\\n    \\tindex: kibana_sample_data_logs\\n    \\tbody: {\\n      \\tsize: 0\\n      \\taggs: {\\n        \\ttable: {\\n          \\tcomposite: {\\n            \\tsize: 10000\\n            \\tsources: [\\n              \\t{\\n                \\tstk1: {\\n                  \\tterms: {field: \\"geo.src\\"}\\n                \\t}\\n              \\t}\\n              \\t{\\n                \\tstk2: {\\n                  \\tterms: {field: \\"geo.dest\\"}\\n                \\t}\\n              \\t}\\n            \\t]\\n          \\t}\\n        \\t}\\n      \\t}\\n    \\t}\\n  \\t}\\n  \\t// From the result, take just the data we are interested in\\n  \\tformat: {property: \\"aggregations.table.buckets\\"}\\n  \\t// Convert key.stk1 -> stk1 for simpler access below\\n  \\ttransform: [\\n    \\t{type: \\"formula\\", expr: \\"datum.key.stk1\\", as: \\"stk1\\"}\\n    \\t{type: \\"formula\\", expr: \\"datum.key.stk2\\", as: \\"stk2\\"}\\n    \\t{type: \\"formula\\", expr: \\"datum.doc_count\\", as: \\"size\\"}\\n  \\t]\\n\\t}\\n\\t{\\n  \\tname: nodes\\n  \\tsource: rawData\\n  \\ttransform: [\\n    \\t// when a country is selected, filter out unrelated data\\n    \\t{\\n      \\ttype: filter\\n      \\texpr: !groupSelector || groupSelector.stk1 == datum.stk1 || groupSelector.stk2 == datum.stk2\\n    \\t}\\n    \\t// Set new key for later lookups - identifies each node\\n    \\t{type: \\"formula\\", expr: \\"datum.stk1+datum.stk2\\", as: \\"key\\"}\\n    \\t// instead of each table row, create two new rows,\\n    \\t// one for the source (stack=stk1) and one for destination node (stack=stk2).\\n    \\t// The country code stored in stk1 and stk2 fields is placed into grpId field.\\n    \\t{\\n      \\ttype: fold\\n      \\tfields: [\\"stk1\\", \\"stk2\\"]\\n      \\tas: [\\"stack\\", \\"grpId\\"]\\n    \\t}\\n    \\t// Create a sortkey, different for stk1 and stk2 stacks.\\n    \\t{\\n      \\ttype: formula\\n      \\texpr: datum.stack == \'stk1\' ? datum.stk1+datum.stk2 : datum.stk2+datum.stk1\\n      \\tas: sortField\\n    \\t}\\n    \\t// Calculate y0 and y1 positions for stacking nodes one on top of the other,\\n    \\t// independently for each stack, and ensuring they are in the proper order,\\n    \\t// alphabetical from the top (reversed on the y axis)\\n    \\t{\\n      \\ttype: stack\\n      \\tgroupby: [\\"stack\\"]\\n      \\tsort: {field: \\"sortField\\", order: \\"descending\\"}\\n      \\tfield: size\\n    \\t}\\n    \\t// calculate vertical center point for each node, used to draw edges\\n    \\t{type: \\"formula\\", expr: \\"(datum.y0+datum.y1)/2\\", as: \\"yc\\"}\\n  \\t]\\n\\t}\\n\\t{\\n  \\tname: groups\\n  \\tsource: nodes\\n  \\ttransform: [\\n    \\t// combine all nodes into country groups, summing up the doc counts\\n    \\t{\\n      \\ttype: aggregate\\n      \\tgroupby: [\\"stack\\", \\"grpId\\"]\\n      \\tfields: [\\"size\\"]\\n      \\tops: [\\"sum\\"]\\n      \\tas: [\\"total\\"]\\n    \\t}\\n    \\t// re-calculate the stacking y0,y1 values\\n    \\t{\\n      \\ttype: stack\\n      \\tgroupby: [\\"stack\\"]\\n      \\tsort: {field: \\"grpId\\", order: \\"descending\\"}\\n      \\tfield: total\\n    \\t}\\n    \\t// project y0 and y1 values to screen coordinates\\n    \\t// doing it once here instead of doing it several times in marks\\n    \\t{type: \\"formula\\", expr: \\"scale(\'y\', datum.y0)\\", as: \\"scaledY0\\"}\\n    \\t{type: \\"formula\\", expr: \\"scale(\'y\', datum.y1)\\", as: \\"scaledY1\\"}\\n    \\t// boolean flag if the label should be on the right of the stack\\n    \\t{type: \\"formula\\", expr: \\"datum.stack == \'stk1\'\\", as: \\"rightLabel\\"}\\n    \\t// Calculate traffic percentage for this country using \\"y\\" scale\\n    \\t// domain upper bound, which represents the total traffic\\n    \\t{\\n      \\ttype: formula\\n      \\texpr: datum.total/domain(\'y\')[1]\\n      \\tas: percentage\\n    \\t}\\n  \\t]\\n\\t}\\n\\t{\\n  \\t// This is a temp lookup table with all the \'stk2\' stack nodes\\n  \\tname: destinationNodes\\n  \\tsource: nodes\\n  \\ttransform: [\\n    \\t{type: \\"filter\\", expr: \\"datum.stack == \'stk2\'\\"}\\n  \\t]\\n\\t}\\n\\t{\\n  \\tname: edges\\n  \\tsource: nodes\\n  \\ttransform: [\\n    \\t// we only want nodes from the left stack\\n    \\t{type: \\"filter\\", expr: \\"datum.stack == \'stk1\'\\"}\\n    \\t// find corresponding node from the right stack, keep it as \\"target\\"\\n    \\t{\\n      \\ttype: lookup\\n      \\tfrom: destinationNodes\\n      \\tkey: key\\n      \\tfields: [\\"key\\"]\\n      \\tas: [\\"target\\"]\\n    \\t}\\n    \\t// calculate SVG link path between stk1 and stk2 stacks for the node pair\\n    \\t{\\n      \\ttype: linkpath\\n      \\torient: horizontal\\n      \\tshape: diagonal\\n      \\tsourceY: {expr: \\"scale(\'y\', datum.yc)\\"}\\n      \\tsourceX: {expr: \\"scale(\'x\', \'stk1\') + bandwidth(\'x\')\\"}\\n      \\ttargetY: {expr: \\"scale(\'y\', datum.target.yc)\\"}\\n      \\ttargetX: {expr: \\"scale(\'x\', \'stk2\')\\"}\\n    \\t}\\n    \\t// A little trick to calculate the thickness of the line.\\n    \\t// The value needs to be the same as the hight of the node, but scaling\\n    \\t// size to screen\'s height gives inversed value because screen\'s Y\\n    \\t// coordinate goes from the top to the bottom, whereas the graph\'s Y=0\\n    \\t// is at the bottom. So subtracting scaled doc count from screen height\\n    \\t// (which is the \\"lower\\" bound of the \\"y\\" scale) gives us the right value\\n    \\t{\\n      \\ttype: formula\\n      \\texpr: range(\'y\')[0]-scale(\'y\', datum.size)\\n      \\tas: strokeWidth\\n    \\t}\\n    \\t// Tooltip needs individual link\'s percentage of all traffic\\n    \\t{\\n      \\ttype: formula\\n      \\texpr: datum.size/domain(\'y\')[1]\\n      \\tas: percentage\\n    \\t}\\n  \\t]\\n\\t}\\n  ]\\n  scales: [\\n\\t{\\n  \\t// calculates horizontal stack positioning\\n  \\tname: x\\n  \\ttype: band\\n  \\trange: width\\n  \\tdomain: [\\"stk1\\", \\"stk2\\"]\\n  \\tpaddingOuter: 0.05\\n  \\tpaddingInner: 0.95\\n\\t}\\n\\t{\\n  \\t// this scale goes up as high as the highest y1 value of all nodes\\n  \\tname: y\\n  \\ttype: linear\\n  \\trange: height\\n  \\tdomain: {data: \\"nodes\\", field: \\"y1\\"}\\n\\t}\\n\\t{\\n  \\t// use rawData to ensure the colors stay the same when clicking.\\n  \\tname: color\\n  \\ttype: ordinal\\n  \\trange: category\\n  \\tdomain: {data: \\"rawData\\", field: \\"stk1\\"}\\n\\t}\\n\\t{\\n  \\t// this scale is used to map internal ids (stk1, stk2) to stack names\\n  \\tname: stackNames\\n  \\ttype: ordinal\\n  \\trange: [\\"Source\\", \\"Destination\\"]\\n  \\tdomain: [\\"stk1\\", \\"stk2\\"]\\n\\t}\\n  ]\\n  axes: [\\n\\t{\\n  \\t// x axis should use custom label formatting to print proper stack names\\n  \\torient: bottom\\n  \\tscale: x\\n  \\tencode: {\\n    \\tlabels: {\\n      \\tupdate: {\\n        \\ttext: {scale: \\"stackNames\\", field: \\"value\\"}\\n      \\t}\\n    \\t}\\n  \\t}\\n\\t}\\n\\t{orient: \\"left\\", scale: \\"y\\"}\\n  ]\\n  marks: [\\n\\t{\\n  \\t// draw the connecting line between stacks\\n  \\ttype: path\\n  \\tname: edgeMark\\n  \\tfrom: {data: \\"edges\\"}\\n  \\t// this prevents some autosizing issues with large strokeWidth for paths\\n  \\tclip: true\\n  \\tencode: {\\n    \\tupdate: {\\n      \\t// By default use color of the left node, except when showing traffic\\n      \\t// from just one country, in which case use destination color.\\n      \\tstroke: [\\n        \\t{\\n          \\ttest: groupSelector && groupSelector.stack==\'stk1\'\\n          \\tscale: color\\n          \\tfield: stk2\\n        \\t}\\n        \\t{scale: \\"color\\", field: \\"stk1\\"}\\n      \\t]\\n      \\tstrokeWidth: {field: \\"strokeWidth\\"}\\n      \\tpath: {field: \\"path\\"}\\n      \\t// when showing all traffic, and hovering over a country,\\n      \\t// highlight the traffic from that country.\\n      \\tstrokeOpacity: {\\n        \\tsignal: !groupSelector && (groupHover.stk1 == datum.stk1 || groupHover.stk2 == datum.stk2) ? 0.9 : 0.3\\n      \\t}\\n      \\t// Ensure that the hover-selected edges show on top\\n      \\tzindex: {\\n        \\tsignal: !groupSelector && (groupHover.stk1 == datum.stk1 || groupHover.stk2 == datum.stk2) ? 1 : 0\\n      \\t}\\n      \\t// format tooltip string\\n      \\ttooltip: {\\n        \\tsignal: datum.stk1 + \' → \' + datum.stk2 + \'\\t\' + format(datum.size, \',.0f\') + \'   (\' + format(datum.percentage, \'.1%\') + \')\'\\n      \\t}\\n    \\t}\\n    \\t// Simple mouseover highlighting of a single line\\n    \\thover: {\\n      \\tstrokeOpacity: {value: 1}\\n    \\t}\\n  \\t}\\n\\t}\\n\\t{\\n  \\t// draw stack groups (countries)\\n  \\ttype: rect\\n  \\tname: groupMark\\n  \\tfrom: {data: \\"groups\\"}\\n  \\tencode: {\\n    \\tenter: {\\n      \\tfill: {scale: \\"color\\", field: \\"grpId\\"}\\n      \\twidth: {scale: \\"x\\", band: 1}\\n    \\t}\\n    \\tupdate: {\\n      \\tx: {scale: \\"x\\", field: \\"stack\\"}\\n      \\ty: {field: \\"scaledY0\\"}\\n      \\ty2: {field: \\"scaledY1\\"}\\n      \\tfillOpacity: {value: 0.6}\\n      \\ttooltip: {\\n        \\tsignal: datum.grpId + \'   \' + format(datum.total, \',.0f\') + \'   (\' + format(datum.percentage, \'.1%\') + \')\'\\n      \\t}\\n    \\t}\\n    \\thover: {\\n      \\tfillOpacity: {value: 1}\\n    \\t}\\n  \\t}\\n\\t}\\n\\t{\\n  \\t// draw country code labels on the inner side of the stack\\n  \\ttype: text\\n  \\tfrom: {data: \\"groups\\"}\\n  \\t// don\'t process events for the labels - otherwise line mouseover is unclean\\n  \\tinteractive: false\\n  \\tencode: {\\n    \\tupdate: {\\n      \\t// depending on which stack it is, position x with some padding\\n      \\tx: {\\n        \\tsignal: scale(\'x\', datum.stack) + (datum.rightLabel ? bandwidth(\'x\') + 8 : -8)\\n      \\t}\\n      \\t// middle of the group\\n      \\tyc: {signal: \\"(datum.scaledY0 + datum.scaledY1)/2\\"}\\n      \\talign: {signal: \\"datum.rightLabel ? \'left\' : \'right\'\\"}\\n      \\tbaseline: {value: \\"middle\\"}\\n      \\tfontWeight: {value: \\"bold\\"}\\n      \\t// only show text label if the group\'s height is large enough\\n      \\ttext: {signal: \\"abs(datum.scaledY0-datum.scaledY1) > 13 ? datum.grpId : \'\'\\"}\\n    \\t}\\n  \\t}\\n\\t}\\n\\t{\\n  \\t// Create a \\"show all\\" button. Shown only when a country is selected.\\n  \\ttype: group\\n  \\tdata: [\\n    \\t// We need to make the button show only when groupSelector signal is true.\\n    \\t// Each mark is drawn as many times as there are elements in the backing data.\\n    \\t// Which means that if values list is empty, it will not be drawn.\\n    \\t// Here I create a data source with one empty object, and filter that list\\n    \\t// based on the signal value. This can only be done in a group.\\n    \\t{\\n      \\tname: dataForShowAll\\n      \\tvalues: [{}]\\n      \\ttransform: [{type: \\"filter\\", expr: \\"groupSelector\\"}]\\n    \\t}\\n  \\t]\\n  \\t// Set button size and positioning\\n  \\tencode: {\\n    \\tenter: {\\n      \\txc: {signal: \\"width/2\\"}\\n      \\ty: {value: 30}\\n      \\twidth: {value: 80}\\n      \\theight: {value: 30}\\n    \\t}\\n  \\t}\\n  \\tmarks: [\\n    \\t{\\n      \\t// This group is shown as a button with rounded corners.\\n      \\ttype: group\\n      \\t// mark name allows signal capturing\\n      \\tname: groupReset\\n      \\t// Only shows button if dataForShowAll has values.\\n      \\tfrom: {data: \\"dataForShowAll\\"}\\n      \\tencode: {\\n        \\tenter: {\\n          \\tcornerRadius: {value: 6}\\n          \\tfill: {value: \\"#F5F7FA\\"}\\n          \\tstroke: {value: \\"#c1c1c1\\"}\\n          \\tstrokeWidth: {value: 2}\\n          \\t// use parent group\'s size\\n          \\theight: {\\n            \\tfield: {group: \\"height\\"}\\n          \\t}\\n          \\twidth: {\\n            \\tfield: {group: \\"width\\"}\\n          \\t}\\n        \\t}\\n        \\tupdate: {\\n          \\t// groups are transparent by default\\n          \\topacity: {value: 1}\\n        \\t}\\n        \\thover: {\\n          \\topacity: {value: 0.7}\\n        \\t}\\n      \\t}\\n      \\tmarks: [\\n        \\t{\\n          \\ttype: text\\n          \\t// if true, it will prevent clicking on the button when over text.\\n          \\tinteractive: false\\n          \\tencode: {\\n            \\tenter: {\\n              \\t// center text in the paren group\\n              \\txc: {\\n                \\tfield: {group: \\"width\\"}\\n                \\tmult: 0.5\\n              \\t}\\n              \\tyc: {\\n                \\tfield: {group: \\"height\\"}\\n                \\tmult: 0.5\\n                \\toffset: 2\\n              \\t}\\n              \\talign: {value: \\"center\\"}\\n              \\tbaseline: {value: \\"middle\\"}\\n              \\tfontWeight: {value: \\"bold\\"}\\n              \\ttext: {value: \\"Show All\\"}\\n            \\t}\\n          \\t}\\n        \\t}\\n      \\t]\\n    \\t}\\n  \\t]\\n\\t}\\n  ]\\n  signals: [\\n\\t{\\n  \\t// used to highlight traffic to/from the same country\\n  \\tname: groupHover\\n  \\tvalue: {}\\n  \\ton: [\\n    \\t{\\n      \\tevents: @groupMark:mouseover\\n      \\tupdate: \\"{stk1:datum.stack==\'stk1\' && datum.grpId, stk2:datum.stack==\'stk2\' && datum.grpId}\\"\\n    \\t}\\n    \\t{events: \\"mouseout\\", update: \\"{}\\"}\\n  \\t]\\n\\t}\\n\\t// used to filter only the data related to the selected country\\n\\t{\\n  \\tname: groupSelector\\n  \\tvalue: false\\n  \\ton: [\\n    \\t{\\n      \\t// Clicking groupMark sets this signal to the filter values\\n      \\tevents: @groupMark:click!\\n      \\tupdate: \\"{stack:datum.stack, stk1:datum.stack==\'stk1\' && datum.grpId, stk2:datum.stack==\'stk2\' && datum.grpId}\\"\\n    \\t}\\n    \\t{\\n      \\t// Clicking \\"show all\\" button, or double-clicking anywhere resets it\\n      \\tevents: [\\n        \\t{type: \\"click\\", markname: \\"groupReset\\"}\\n        \\t{type: \\"dblclick\\"}\\n      \\t]\\n      \\tupdate: \\"false\\"\\n    \\t}\\n  \\t]\\n\\t}\\n  ]\\n}\\n"},"aggs":[]}',
      uiStateJSON: '{}',
      description: '',
      version: 1,
      kibanaSavedObjectMeta: {
        searchSourceJSON: '{"query":{"query":"","language":"kuery"},"filter":[]}',
      },
    },
  },
  {
    id: '314c6f60-2224-11e8-b802-5bcf64c2cfb4',
    type: 'visualization',
    updated_at: '2018-08-29T13:22:17.617Z',
    version: 1,
    migrationVersion: {},
    attributes: {
      title: i18n.translate('server.sampleData.logsSpec.responseCodesOverTimeTitle', {
        defaultMessage: '[Logs] Response Codes Over Time + Annotations',
      }),
      visState:
        '{"title":"[Logs] Response Codes Over Time + Annotations","type":"metrics","params":{"id":"61ca57f0-469d-11e7-af02-69e470af7417","type":"timeseries","series":[{"id":"61ca57f1-469d-11e7-af02-69e470af7417","color":"rgba(115,216,255,1)","split_mode":"terms","metrics":[{"id":"61ca57f2-469d-11e7-af02-69e470af7417","type":"cardinality","field":"ip"}],"seperate_axis":0,"axis_position":"right","formatter":"percent","chart_type":"line","line_width":"2","point_size":"0","fill":"0.5","stacked":"percent","terms_field":"response.keyword","terms_order_by":"61ca57f2-469d-11e7-af02-69e470af7417","label":"Response Code Count","split_color_mode":"gradient"}],"time_field":"timestamp","index_pattern":"kibana_sample_data_logs","interval":">=4h","axis_position":"left","axis_formatter":"number","show_legend":1,"show_grid":1,"annotations":[{"fields":"geo.src, host","template":"Security Error from {{geo.src}} on {{host}}","index_pattern":"kibana_sample_data_logs","query_string":"tags:error AND tags:security","id":"bd7548a0-2223-11e8-832f-d5027f3c8a47","color":"rgba(211,49,21,1)","time_field":"timestamp","icon":"fa-asterisk","ignore_global_filters":1,"ignore_panel_filters":1}],"legend_position":"bottom","axis_scale":"normal","drop_last_bucket":0},"aggs":[]}',
      uiStateJSON: '{}',
      description: '',
      version: 1,
      kibanaSavedObjectMeta: {
        searchSourceJSON: '{"query":{"query":"","language":"kuery"},"filter":[]}',
      },
    },
  },
  {
    id: '24a3e970-4257-11e8-b3aa-73fdaf54bfc9',
    type: 'visualization',
    updated_at: '2018-08-29T13:22:17.617Z',
    version: 1,
    migrationVersion: {},
    attributes: {
      title: i18n.translate('server.sampleData.logsSpec.inputControlsTitle', {
        defaultMessage: '[Logs] Input Controls',
      }),
      visState:
        '{"title":"[Logs] Input Controls","type":"input_control_vis","params":{"controls":[{"id":"1523980210832","indexPattern":"90943e30-9a47-11e8-b64d-95841ca0b247","fieldName":"geo.src","label":"Source Country","type":"list","options":{"type":"terms","multiselect":true,"size":100,"order":"desc"},"parent":""},{"id":"1523980191978","indexPattern":"90943e30-9a47-11e8-b64d-95841ca0b247","fieldName":"machine.os.keyword","label":"OS","type":"list","options":{"type":"terms","multiselect":true,"size":100,"order":"desc"},"parent":"1523980210832"},{"id":"1523980232790","indexPattern":"90943e30-9a47-11e8-b64d-95841ca0b247","fieldName":"bytes","label":"Bytes","type":"range","options":{"decimalPlaces":0,"step":1024}}],"updateFiltersOnChange":true,"useTimeFilter":true,"pinFilters":false},"aggs":[]}',
      uiStateJSON: '{}',
      description: '',
      version: 1,
      kibanaSavedObjectMeta: {
        searchSourceJSON: '{"query":{"query":"","language":"kuery"},"filter":[]}',
      },
    },
  },
  {
    id: '14e2e710-4258-11e8-b3aa-73fdaf54bfc9',
    type: 'visualization',
    updated_at: '2018-08-29T13:22:17.617Z',
    version: 1,
    migrationVersion: {},
    attributes: {
      title: i18n.translate('server.sampleData.logsSpec.visitorOSTitle', {
        defaultMessage: '[Logs] Visitors by OS',
      }),
      visState:
        '{"title":"[Logs] Visitors by OS","type":"pie","params":{"type":"pie","addTooltip":true,"addLegend":true,"legendPosition":"right","isDonut":true,"labels":{"show":true,"values":true,"last_level":true,"truncate":100}},"aggs":[{"id":"1","enabled":true,"type":"count","schema":"metric","params":{}},{"id":"2","enabled":true,"type":"terms","schema":"segment","params":{"field":"machine.os.keyword","otherBucket":true,"otherBucketLabel":"Other","missingBucket":false,"missingBucketLabel":"Missing","size":10,"order":"desc","orderBy":"1"}}]}',
      uiStateJSON: '{}',
      description: '',
      version: 1,
      kibanaSavedObjectMeta: {
        searchSourceJSON:
          '{"index":"90943e30-9a47-11e8-b64d-95841ca0b247","filter":[],"query":{"query":"","language":"kuery"}}',
      },
    },
  },
  {
    id: '47f2c680-a6e3-11e8-94b4-c30c0228351b',
    type: 'visualization',
    updated_at: '2018-08-29T13:22:17.617Z',
    version: 1,
    migrationVersion: {},
    attributes: {
      title: i18n.translate('server.sampleData.logsSpec.markdownInstructionsTitle', {
        defaultMessage: '[Logs] Markdown Instructions',
      }),
      visState:
        '{"title":"[Logs] Markdown Instructions","type":"markdown","params":{"fontSize":12,"openLinksInNewTab":true,"markdown":"### Sample Logs Data\\nThis dashboard contains sample data for you to play with. You can view it, search it, and interact with the visualizations. For more information about Kibana, check our [docs](https://www.elastic.co/guide/en/kibana/current/index.html)."},"aggs":[]}',
      uiStateJSON: '{}',
      description: '',
      version: 1,
      kibanaSavedObjectMeta: {
        searchSourceJSON: '{"query":{"query":"","language":"kuery"},"filter":[]}',
      },
    },
  },
  {
    id: '90943e30-9a47-11e8-b64d-95841ca0b247',
    type: 'index-pattern',
    updated_at: '2018-08-29T13:22:17.617Z',
    version: 1,
    migrationVersion: {},
    attributes: {
      title: 'kibana_sample_data_logs',
      timeFieldName: 'timestamp',
      fields:
        '[{"name":"@timestamp","type":"date","esTypes":["date"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"_id","type":"string","esTypes":["_id"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":false},{"name":"_index","type":"string","esTypes":["_index"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":false},{"name":"_score","type":"number","count":0,"scripted":false,"searchable":false,"aggregatable":false,"readFromDocValues":false},{"name":"_source","type":"_source","esTypes":["_source"],"count":0,"scripted":false,"searchable":false,"aggregatable":false,"readFromDocValues":false},{"name":"_type","type":"string","esTypes":["_type"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":false},{"name":"agent","type":"string","esTypes":["text"],"count":0,"scripted":false,"searchable":true,"aggregatable":false,"readFromDocValues":false},{"name":"agent.keyword","type":"string","esTypes":["keyword"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true,"subType":{"multi":{"parent": "agent"}}},{"name":"bytes","type":"number","esTypes":["long"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"clientip","type":"ip","esTypes":["ip"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"event.dataset","type":"string","esTypes":["keyword"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"extension","type":"string","esTypes":["text"],"count":0,"scripted":false,"searchable":true,"aggregatable":false,"readFromDocValues":false},{"name":"extension.keyword","type":"string","esTypes":["keyword"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true,"subType":{"multi":{"parent": "extension"}}},{"name":"geo.coordinates","type":"geo_point","esTypes":["geo_point"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"geo.dest","type":"string","esTypes":["keyword"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"geo.src","type":"string","esTypes":["keyword"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"geo.srcdest","type":"string","esTypes":["keyword"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"host","type":"string","esTypes":["text"],"count":0,"scripted":false,"searchable":true,"aggregatable":false,"readFromDocValues":false},{"name":"host.keyword","type":"string","esTypes":["keyword"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true,"subType":{"multi":{"parent": "host"}}},{"name":"index","type":"string","esTypes":["text"],"count":0,"scripted":false,"searchable":true,"aggregatable":false,"readFromDocValues":false},{"name":"index.keyword","type":"string","esTypes":["keyword"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true,"subType":{"multi":{"parent": "index"}}},{"name":"ip","type":"ip","esTypes":["ip"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"machine.os","type":"string","esTypes":["text"],"count":0,"scripted":false,"searchable":true,"aggregatable":false,"readFromDocValues":false},{"name":"machine.os.keyword","type":"string","esTypes":["keyword"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true,"subType":{"multi":{"parent": "machine.os"}}},{"name":"machine.ram","type":"number","esTypes":["long"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"memory","type":"number","esTypes":["double"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"message","type":"string","esTypes":["text"],"count":0,"scripted":false,"searchable":true,"aggregatable":false,"readFromDocValues":false},{"name":"message.keyword","type":"string","esTypes":["keyword"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true,"subType":{"multi":{"parent": "message"}}},{"name":"phpmemory","type":"number","esTypes":["long"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"referer","type":"string","esTypes":["keyword"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"request","type":"string","esTypes":["text"],"count":0,"scripted":false,"searchable":true,"aggregatable":false,"readFromDocValues":false},{"name":"request.keyword","type":"string","esTypes":["keyword"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true,"subType":{"multi":{"parent": "request"}}},{"name":"response","type":"string","esTypes":["text"],"count":0,"scripted":false,"searchable":true,"aggregatable":false,"readFromDocValues":false},{"name":"response.keyword","type":"string","esTypes":["keyword"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true,"subType":{"multi":{"parent": "response"}}},{"name":"tags","type":"string","esTypes":["text"],"count":0,"scripted":false,"searchable":true,"aggregatable":false,"readFromDocValues":false},{"name":"tags.keyword","type":"string","esTypes":["keyword"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true,"subType":{"multi":{"parent": "tags"}}},{"name":"timestamp","type":"date","esTypes":["date"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"url","type":"string","esTypes":["text"],"count":0,"scripted":false,"searchable":true,"aggregatable":false,"readFromDocValues":false},{"name":"url.keyword","type":"string","esTypes":["keyword"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true,"subType":{"multi":{"parent": "url"}}},{"name":"utc_time","type":"date","esTypes":["date"],"count":0,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true},{"name":"hour_of_day","type":"number","count":0,"scripted":true,"script":"doc[\'timestamp\'].value.getHour()","lang":"painless","searchable":true,"aggregatable":true,"readFromDocValues":false}]',
      fieldFormatMap: '{"hour_of_day":{}}',
    },
  },
  {
    id: 'edf84fe0-e1a0-11e7-b6d5-4dc382ef7f5b',
    type: 'dashboard',
    updated_at: '2018-08-29T13:26:13.463Z',
    version: 3,
    references: [
      {
        name: 'panel_0',
        type: 'visualization',
        id: 'e1d0f010-9ee7-11e7-8711-e7a007dcef99',
      },
      {
        name: 'panel_1',
        type: 'visualization',
        id: '06cf9c40-9ee8-11e7-8711-e7a007dcef99',
      },
      {
        name: 'panel_2',
        type: 'visualization',
        id: '935afa20-e0cd-11e7-9d07-1398ccfcefa3',
      },
      {
        name: 'panel_3',
        type: 'visualization',
        id: '4eb6e500-e1c7-11e7-b6d5-4dc382ef7f5b',
      },
      {
        name: 'panel_4',
        type: 'visualization',
        id: '69a34b00-9ee8-11e7-8711-e7a007dcef99',
      },
      {
        name: 'panel_5',
        type: 'visualization',
        id: '42b997f0-0c26-11e8-b0ec-3bb475f6b6ff',
      },
      {
        name: 'panel_6',
        type: 'visualization',
        id: '7cbd2350-2223-11e8-b802-5bcf64c2cfb4',
      },
      {
        name: 'panel_7',
        type: 'visualization',
        id: '314c6f60-2224-11e8-b802-5bcf64c2cfb4',
      },
      {
        name: 'panel_8',
        type: 'visualization',
        id: '24a3e970-4257-11e8-b3aa-73fdaf54bfc9',
      },
      {
        name: 'panel_9',
        type: 'visualization',
        id: '14e2e710-4258-11e8-b3aa-73fdaf54bfc9',
      },
      {
        name: 'panel_10',
        type: 'visualization',
        id: '47f2c680-a6e3-11e8-94b4-c30c0228351b',
      },
    ],
    migrationVersion: {
      dashboard: '7.0.0',
    },
    attributes: {
      title: i18n.translate('server.sampleData.logsSpec.webTrafficTitle', {
        defaultMessage: '[Logs] Web Traffic',
      }),
      hits: 0,
      description: i18n.translate('server.sampleData.logsSpec.webTrafficDescription', {
        defaultMessage: "Analyze mock web traffic log data for Elastic's website",
      }),
      panelsJSON:
        '[{"embeddableConfig":{"vis":{"colors":{"Avg. Bytes":"#6ED0E0","Unique Visitors":"#0A437C"},"legendOpen":false}},"gridData":{"x":27,"y":11,"w":21,"h":13,"i":"2"},"panelIndex":"2","version":"7.0.0-alpha1","panelRefName":"panel_0"},{"gridData":{"x":0,"y":49,"w":24,"h":18,"i":"4"},"panelIndex":"4","version":"7.0.0-alpha1","panelRefName":"panel_1"},{"embeddableConfig":{"vis":{"defaultColors":{"0 - 22":"rgb(247,251,255)","22 - 44":"rgb(208,225,242)","44 - 66":"rgb(148,196,223)","66 - 88":"rgb(74,152,201)","88 - 110":"rgb(23,100,171)"},"legendOpen":false}},"gridData":{"x":0,"y":36,"w":24,"h":13,"i":"7"},"panelIndex":"7","version":"6.3.0","panelRefName":"panel_2"},{"embeddableConfig":{"mapCenter":[36.8092847020594,-96.94335937500001],"vis":{"params":{"sort":{"columnIndex":null,"direction":null}}}},"gridData":{"x":27,"y":24,"w":21,"h":12,"i":"9"},"panelIndex":"9","version":"6.3.0","panelRefName":"panel_3"},{"embeddableConfig":{"vis":{"colors":{"0 - 500":"#BF1B00","1000 - 1500":"#7EB26D","500 - 1000":"#F2C96D"},"defaultColors":{"0 - 500":"rgb(165,0,38)","1000 - 1500":"rgb(0,104,55)","500 - 1000":"rgb(255,255,190)"},"legendOpen":false}},"gridData":{"x":10,"y":0,"w":9,"h":11,"i":"11"},"panelIndex":"11","title":"","version":"6.3.0","panelRefName":"panel_4"},{"gridData":{"x":0,"y":24,"w":27,"h":12,"i":"13"},"panelIndex":"13","version":"6.3.0","panelRefName":"panel_5"},{"gridData":{"x":24,"y":36,"w":24,"h":31,"i":"14"},"panelIndex":"14","version":"6.3.0","panelRefName":"panel_6"},{"gridData":{"x":0,"y":11,"w":27,"h":13,"i":"15"},"panelIndex":"15","version":"6.3.0","panelRefName":"panel_7"},{"gridData":{"x":19,"y":0,"w":15,"h":11,"i":"16"},"panelIndex":"16","title":"","version":"6.3.0","panelRefName":"panel_8"},{"embeddableConfig":{"vis":{"legendOpen":false}},"gridData":{"x":34,"y":0,"w":14,"h":11,"i":"17"},"panelIndex":"17","version":"6.3.0","panelRefName":"panel_9"},{"embeddableConfig":{},"gridData":{"x":0,"y":0,"w":10,"h":11,"i":"18"},"panelIndex":"18","title":"","version":"7.0.0-alpha1","panelRefName":"panel_10"}]',
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
        searchSourceJSON:
          '{"query":{"language":"kuery","query":""},"filter":[],"highlightAll":true,"version":true}',
      },
    },
  },
];
