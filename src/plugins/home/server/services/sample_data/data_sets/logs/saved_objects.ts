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
    id: '06cf9c40-9ee8-11e7-8711-e7a007dcef99',
    type: 'visualization',
    updated_at: '2021-10-28T15:07:36.622Z',
    version: '1',
    coreMigrationVersion: '8.0.0',
    migrationVersion: { visualization: '8.0.0' },
    attributes: {
      title: i18n.translate('home.sampleData.logsSpec.visitorsMapTitle', {
        defaultMessage: '[Logs] Visitors Map',
      }),
      visState:
        '{"title":"[Logs] Visitors Map","type":"vega","aggs":[],"params":{"spec":"{\\n  $schema: https://vega.github.io/schema/vega/v5.json\\n  config: {\\n    kibana: {type: \\"map\\", latitude: 30, longitude: -120, zoom: 3}\\n  }\\n  data: [\\n    {\\n      name: table\\n      url: {\\n        index: kibana_sample_data_logs\\n        %context%: true\\n        %timefield%: timestamp\\n        body: {\\n          size: 0\\n          aggs: {\\n            gridSplit: {\\n              geotile_grid: {field: \\"geo.coordinates\\", precision: 5, size: 10000}\\n              aggs: {\\n                gridCentroid: {\\n                  geo_centroid: {\\n                    field: \\"geo.coordinates\\"\\n                  }\\n                }\\n              }\\n            }\\n          }\\n        }\\n      }\\n      format: {property: \\"aggregations.gridSplit.buckets\\"}\\n      transform: [\\n        {\\n          type: geopoint\\n          projection: projection\\n          fields: [\\n            gridCentroid.location.lon\\n            gridCentroid.location.lat\\n          ]\\n        }\\n      ]\\n    }\\n  ]\\n  scales: [\\n    {\\n      name: gridSize\\n      type: linear\\n      domain: {data: \\"table\\", field: \\"doc_count\\"}\\n      range: [\\n        50\\n        1000\\n      ]\\n    }\\n    {\\n      name: bubbleColor\\n      type: linear\\n      domain: {\\n        data: table\\n        field: doc_count\\n      }\\n      range: [\\"rgb(249, 234, 197)\\",\\"rgb(243, 200, 154)\\",\\"rgb(235, 166, 114)\\", \\"rgb(231, 102, 76)\\"]\\n    }\\n  ]\\n  marks: [\\n    {\\n      name: gridMarker\\n      type: symbol\\n      from: {data: \\"table\\"}\\n      encode: {\\n        update: {\\n          fill: {\\n            scale: bubbleColor\\n            field: doc_count\\n          }\\n          size: {scale: \\"gridSize\\", field: \\"doc_count\\"}\\n          xc: {signal: \\"datum.x\\"}\\n          yc: {signal: \\"datum.y\\"}\\n          tooltip: {\\n            signal: \\"{flights: datum.doc_count}\\"\\n          }\\n        }\\n      }\\n    }\\n  ]\\n}"}}',
      uiStateJSON: '{}',
      description: '',
      version: 1,
      kibanaSavedObjectMeta: {
        searchSourceJSON:
          '{"filter":[],"query":{"query":"","language":"kuery"},"indexRefName":"kibanaSavedObjectMeta.searchSourceJSON.index"}',
      },
    },
    references: [
      {
        id: '90943e30-9a47-11e8-b64d-95841ca0b247',
        name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
        type: 'index-pattern',
      },
    ],
  },
  {
    id: 'cb099a20-ea66-11eb-9425-113343a037e3',
    type: 'visualization',
    updated_at: '2021-07-21T21:33:42.541Z',
    version: '1',
    migrationVersion: {
      visualization: '7.14.0',
    },
    attributes: {
      title: i18n.translate('home.sampleData.logsSpec.heatmapTitle', {
        defaultMessage: '[Logs] Unique Destination Heatmap',
      }),
      description: '',
      kibanaSavedObjectMeta: {
        searchSourceJSON: '{"query":{"query":"","language":"kuery"},"filter":[]}',
      },
      uiStateJSON: '{}',
      version: 1,
      visState:
        '{"title":"[Logs] Unique Destination Heatmap","type":"vega","aggs":[],"params":{"spec":"{\\n  $schema: https://vega.github.io/schema/vega-lite/v5.json\\n  data: {\\n    url: {\\n      %context%: true\\n      %timefield%: @timestamp\\n      index: kibana_sample_data_logs\\n      body: {\\n        aggs: {\\n          countries: {\\n            terms: {\\n              field: geo.dest\\n              size: 25\\n            }\\n            aggs: {\\n              hours: {\\n                histogram: {\\n                  field: hour_of_day\\n                  interval: 1\\n                }\\n                aggs: {\\n                  unique: {\\n                    cardinality: {\\n                      field: clientip\\n                    }\\n                  }\\n                }\\n              }\\n            }\\n          }\\n        }\\n        size: 0\\n      }\\n    }\\n    format: {property: \\"aggregations.countries.buckets\\"}\\n  }\\n  \\n  transform: [\\n    {\\n      flatten: [\\"hours.buckets\\"],\\n      as: [\\"buckets\\"]\\n    },\\n    {\\n      filter: \\"datum.buckets.unique.value > 0\\"\\n    }\\n  ]\\n\\n  mark: {\\n    type: rect\\n    tooltip: {\\n      expr: \\"{\\\\\\"Unique Visitors\\\\\\": datum.buckets.unique.value,\\\\\\"geo.src\\\\\\": datum.key,\\\\\\"Hour\\\\\\": datum.buckets.key}\\"\\n    }\\n  }\\n\\n  encoding: {\\n    x: {\\n      field: buckets.key\\n      type: nominal\\n      scale: {\\n        domain: {\\n          expr: \\"sequence(0, 24)\\"\\n        }\\n      }\\n      axis: {\\n        title: false\\n        labelAngle: 0\\n      }\\n    }\\n    y: {\\n      field: key\\n      type: nominal\\n      sort: {\\n        field: -buckets.unique.value\\n      }\\n      axis: {title: false}\\n    }\\n    color: {\\n      field: buckets.unique.value\\n      type: quantitative\\n      axis: {title: false}\\n      scale: {\\n        scheme: blues\\n      }\\n    }\\n  }\\n}\\n"}}',
    },
    references: [],
  },
  {
    id: '4eb6e500-e1c7-11e7-b6d5-4dc382ef7f5b',
    type: 'visualization',
    updated_at: '2021-07-21T18:52:13.586Z',
    version: '2',
    migrationVersion: {
      visualization: '7.14.0',
    },
    attributes: {
      title: i18n.translate('home.sampleData.logsSpec.hostVisitsBytesTableTitle', {
        defaultMessage: '[Logs] Host, Visits and Bytes Table',
      }),
      visState:
        '{"title":"[Logs] Host, Visits and Bytes Table","type":"metrics","aggs":[],"params":{"time_range_mode":"last_value","id":"61ca57f0-469d-11e7-af02-69e470af7417","type":"table","series":[{"id":"bd09d600-e5b1-11e7-bfc2-a1f7e71965a1","color":"#68BC00","split_mode":"everything","metrics":[{"id":"bd09d601-e5b1-11e7-bfc2-a1f7e71965a1","type":"sum","field":"bytes"},{"sigma":"","id":"c9514c90-e5b1-11e7-bfc2-a1f7e71965a1","type":"sum_bucket","field":"bd09d601-e5b1-11e7-bfc2-a1f7e71965a1"}],"seperate_axis":0,"axis_position":"right","formatter":"bytes","chart_type":"line","line_width":1,"point_size":1,"fill":0.5,"stacked":"none","color_rules":[{"id":"c0c668d0-e5b1-11e7-bfc2-a1f7e71965a1"}],"label":"Bytes (Total)","split_color_mode":"gradient"},{"id":"b7672c30-a6df-11e8-8b18-1da1dfc50975","color":"#68BC00","split_mode":"everything","metrics":[{"id":"b7672c31-a6df-11e8-8b18-1da1dfc50975","type":"sum","field":"bytes"}],"seperate_axis":0,"axis_position":"right","formatter":"bytes","chart_type":"line","line_width":1,"point_size":1,"fill":0.5,"stacked":"none","color_rules":[{"id":"c0c668d0-e5b1-11e7-bfc2-a1f7e71965a1"}],"label":"Bytes (Last Hour)","split_color_mode":"gradient","trend_arrows":1},{"id":"f2c20700-a6df-11e8-8b18-1da1dfc50975","color":"#68BC00","split_mode":"everything","metrics":[{"id":"f2c20701-a6df-11e8-8b18-1da1dfc50975","type":"cardinality","field":"clientip"},{"sigma":"","id":"f46333e0-a6df-11e8-8b18-1da1dfc50975","type":"sum_bucket","field":"f2c20701-a6df-11e8-8b18-1da1dfc50975"}],"seperate_axis":0,"axis_position":"right","formatter":"number","chart_type":"line","line_width":1,"point_size":1,"fill":0.5,"stacked":"none","label":"Unique Visits (Total)","color_rules":[{"value":1000,"id":"2e963080-a6e0-11e8-8b18-1da1dfc50975","text":"rgba(211,49,21,1)","operator":"lt"},{"value":1000,"id":"3d4fb880-a6e0-11e8-8b18-1da1dfc50975","text":"rgba(252,196,0,1)","operator":"gte"},{"value":1500,"id":"435f8a20-a6e0-11e8-8b18-1da1dfc50975","text":"rgba(104,188,0,1)","operator":"gte"}],"offset_time":"","value_template":"","trend_arrows":0,"split_color_mode":"gradient"},{"id":"46fd7fc0-e5b1-11e7-bfc2-a1f7e71965a1","color":"#68BC00","split_mode":"everything","metrics":[{"id":"46fd7fc1-e5b1-11e7-bfc2-a1f7e71965a1","type":"cardinality","field":"ip"}],"seperate_axis":0,"axis_position":"right","formatter":"number","chart_type":"line","line_width":1,"point_size":1,"fill":0.5,"stacked":"none","label":"Unique Visits (Last Hour)","color_rules":[{"value":10,"id":"4e90aeb0-a6e0-11e8-8b18-1da1dfc50975","text":"rgba(211,49,21,1)","operator":"lt"},{"value":10,"id":"6d59b1c0-a6e0-11e8-8b18-1da1dfc50975","text":"rgba(252,196,0,1)","operator":"gte"},{"value":25,"id":"77578670-a6e0-11e8-8b18-1da1dfc50975","text":"rgba(104,188,0,1)","operator":"gte"}],"offset_time":"","value_template":"","trend_arrows":1,"split_color_mode":"gradient"}],"time_field":"timestamp","use_kibana_indexes":true,"interval":"1h","axis_position":"left","axis_formatter":"number","show_legend":1,"show_grid":1,"bar_color_rules":[{"id":"e9b4e490-e1c6-11e7-b4f6-0f68c45f7387"}],"pivot_id":"extension.keyword","pivot_label":"Type","drilldown_url":"","axis_scale":"normal","hide_last_value_indicator":false,"tooltip_mode":"show_all","drop_last_bucket":0,"isModelInvalid":false,"index_pattern_ref_name":"metrics_0_index_pattern"}}',
      uiStateJSON: '{}',
      description: '',
      version: 1,
      kibanaSavedObjectMeta: {
        searchSourceJSON: '{"query":{"query":"","language":"kuery"},"filter":[]}',
      },
    },
    references: [
      {
        id: '90943e30-9a47-11e8-b64d-95841ca0b247',
        type: 'index-pattern',
        name: 'metrics_0_index_pattern',
      },
    ],
  },
  {
    id: '69a34b00-9ee8-11e7-8711-e7a007dcef99',
    type: 'visualization',
    updated_at: '2021-10-28T14:38:21.435Z',
    version: '2',
    coreMigrationVersion: '8.0.0',
    migrationVersion: { visualization: '8.0.0' },
    attributes: {
      title: i18n.translate('home.sampleData.logsSpec.goalsTitle', {
        defaultMessage: '[Logs] Goals',
      }),
      visState:
        '{"title":"[Logs] Goals","type":"gauge","params":{"type":"gauge","addTooltip":true,"addLegend":false,"gauge":{"extendRange":true,"percentageMode":false,"gaugeType":"Arc","gaugeStyle":"Full","backStyle":"Full","orientation":"vertical","colorSchema":"Green to Red","gaugeColorMode":"Labels","colorsRange":[{"from":0,"to":500},{"from":500,"to":1000},{"from":1000,"to":1500}],"invertColors":true,"labels":{"show":false,"color":"black"},"scale":{"show":true,"labels":false,"color":"#333"},"type":"meter","style":{"bgWidth":0.9,"width":0.9,"mask":false,"bgMask":false,"maskBars":50,"bgFill":"#eee","bgColor":false,"subText":"visitors","fontSize":60,"labelColor":true},"alignment":"horizontal"},"isDisplayWarning":false},"aggs":[{"id":"1","enabled":true,"type":"cardinality","schema":"metric","params":{"field":"clientip","customLabel":"Unique Visitors"}}]}',
      uiStateJSON:
        '{"vis":{"defaultColors":{"0 - 500":"rgb(165,0,38)","500 - 1000":"rgb(255,255,190)","1000 - 1500":"rgb(0,104,55)"},"colors":{"75 - 100":"#629E51","50 - 75":"#EAB839","0 - 50":"#E24D42","0 - 100":"#E24D42","200 - 300":"#7EB26D","500 - 1000":"#E5AC0E","0 - 500":"#E24D42","1000 - 1500":"#7EB26D"},"legendOpen":true}}',
      description: '',
      version: 1,
      kibanaSavedObjectMeta: {
        searchSourceJSON:
          '{"filter":[],"query":{"query":"","language":"kuery"},"indexRefName":"kibanaSavedObjectMeta.searchSourceJSON.index"}',
      },
    },
    references: [
      {
        id: '90943e30-9a47-11e8-b64d-95841ca0b247',
        name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
        type: 'index-pattern',
      },
    ],
  },
  {
    id: '7cbd2350-2223-11e8-b802-5bcf64c2cfb4',
    type: 'visualization',
    updated_at: '2018-08-29T13:22:17.617Z',
    version: '1',
    migrationVersion: {},
    attributes: {
      title: i18n.translate('home.sampleData.logsSpec.sourceAndDestinationSankeyChartTitle', {
        defaultMessage: '[Logs] Machine OS and Destination Sankey Chart',
      }),
      visState:
        '{"title":"[Logs] Machine OS and Destination Sankey Chart","type":"vega","params":{"spec":"{ \\n $schema: https://vega.github.io/schema/vega/v5.json\\n  data: [\\n\\t{\\n  \\t// query ES based on the currently selected time range and filter string\\n  \\tname: rawData\\n  \\turl: {\\n    \\t%context%: true\\n    \\t%timefield%: timestamp\\n    \\tindex: kibana_sample_data_logs\\n    \\tbody: {\\n      \\tsize: 0\\n      \\taggs: {\\n        \\ttable: {\\n          \\tcomposite: {\\n            \\tsize: 10000\\n            \\tsources: [\\n              \\t{\\n                \\tstk1: {\\n                  \\tterms: {field: \\"machine.os.keyword\\"}\\n                \\t}\\n              \\t}\\n              \\t{\\n                \\tstk2: {\\n                  \\tterms: {field: \\"geo.dest\\"}\\n                \\t}\\n              \\t}\\n            \\t]\\n          \\t}\\n        \\t}\\n      \\t}\\n    \\t}\\n  \\t}\\n  \\t// From the result, take just the data we are interested in\\n  \\tformat: {property: \\"aggregations.table.buckets\\"}\\n  \\t// Convert key.stk1 -> stk1 for simpler access below\\n  \\ttransform: [\\n    \\t{type: \\"formula\\", expr: \\"datum.key.stk1\\", as: \\"stk1\\"}\\n    \\t{type: \\"formula\\", expr: \\"datum.key.stk2\\", as: \\"stk2\\"}\\n    \\t{type: \\"formula\\", expr: \\"datum.doc_count\\", as: \\"size\\"}\\n  \\t]\\n\\t}\\n\\t{\\n  \\tname: nodes\\n  \\tsource: rawData\\n  \\ttransform: [\\n    \\t// when a country is selected, filter out unrelated data\\n    \\t{\\n      \\ttype: filter\\n      \\texpr: !groupSelector || groupSelector.stk1 == datum.stk1 || groupSelector.stk2 == datum.stk2\\n    \\t}\\n    \\t// Set new key for later lookups - identifies each node\\n    \\t{type: \\"formula\\", expr: \\"datum.stk1+datum.stk2\\", as: \\"key\\"}\\n    \\t// instead of each table row, create two new rows,\\n    \\t// one for the source (stack=stk1) and one for destination node (stack=stk2).\\n    \\t// The country code stored in stk1 and stk2 fields is placed into grpId field.\\n    \\t{\\n      \\ttype: fold\\n      \\tfields: [\\"stk1\\", \\"stk2\\"]\\n      \\tas: [\\"stack\\", \\"grpId\\"]\\n    \\t}\\n    \\t// Create a sortkey, different for stk1 and stk2 stacks.\\n    \\t{\\n      \\ttype: formula\\n      \\texpr: datum.stack == \'stk1\' ? datum.stk1+datum.stk2 : datum.stk2+datum.stk1\\n      \\tas: sortField\\n    \\t}\\n    \\t// Calculate y0 and y1 positions for stacking nodes one on top of the other,\\n    \\t// independently for each stack, and ensuring they are in the proper order,\\n    \\t// alphabetical from the top (reversed on the y axis)\\n    \\t{\\n      \\ttype: stack\\n      \\tgroupby: [\\"stack\\"]\\n      \\tsort: {field: \\"sortField\\", order: \\"descending\\"}\\n      \\tfield: size\\n    \\t}\\n    \\t// calculate vertical center point for each node, used to draw edges\\n    \\t{type: \\"formula\\", expr: \\"(datum.y0+datum.y1)/2\\", as: \\"yc\\"}\\n  \\t]\\n\\t}\\n\\t{\\n  \\tname: groups\\n  \\tsource: nodes\\n  \\ttransform: [\\n    \\t// combine all nodes into country groups, summing up the doc counts\\n    \\t{\\n      \\ttype: aggregate\\n      \\tgroupby: [\\"stack\\", \\"grpId\\"]\\n      \\tfields: [\\"size\\"]\\n      \\tops: [\\"sum\\"]\\n      \\tas: [\\"total\\"]\\n    \\t}\\n    \\t// re-calculate the stacking y0,y1 values\\n    \\t{\\n      \\ttype: stack\\n      \\tgroupby: [\\"stack\\"]\\n      \\tsort: {field: \\"grpId\\", order: \\"descending\\"}\\n      \\tfield: total\\n    \\t}\\n    \\t// project y0 and y1 values to screen coordinates\\n    \\t// doing it once here instead of doing it several times in marks\\n    \\t{type: \\"formula\\", expr: \\"scale(\'y\', datum.y0)\\", as: \\"scaledY0\\"}\\n    \\t{type: \\"formula\\", expr: \\"scale(\'y\', datum.y1)\\", as: \\"scaledY1\\"}\\n    \\t// boolean flag if the label should be on the right of the stack\\n    \\t{type: \\"formula\\", expr: \\"datum.stack == \'stk1\'\\", as: \\"rightLabel\\"}\\n    \\t// Calculate traffic percentage for this country using \\"y\\" scale\\n    \\t// domain upper bound, which represents the total traffic\\n    \\t{\\n      \\ttype: formula\\n      \\texpr: datum.total/domain(\'y\')[1]\\n      \\tas: percentage\\n    \\t}\\n  \\t]\\n\\t}\\n\\t{\\n  \\t// This is a temp lookup table with all the \'stk2\' stack nodes\\n  \\tname: destinationNodes\\n  \\tsource: nodes\\n  \\ttransform: [\\n    \\t{type: \\"filter\\", expr: \\"datum.stack == \'stk2\'\\"}\\n  \\t]\\n\\t}\\n\\t{\\n  \\tname: edges\\n  \\tsource: nodes\\n  \\ttransform: [\\n    \\t// we only want nodes from the left stack\\n    \\t{type: \\"filter\\", expr: \\"datum.stack == \'stk1\'\\"}\\n    \\t// find corresponding node from the right stack, keep it as \\"target\\"\\n    \\t{\\n      \\ttype: lookup\\n      \\tfrom: destinationNodes\\n      \\tkey: key\\n      \\tfields: [\\"key\\"]\\n      \\tas: [\\"target\\"]\\n    \\t}\\n    \\t// calculate SVG link path between stk1 and stk2 stacks for the node pair\\n    \\t{\\n      \\ttype: linkpath\\n      \\torient: horizontal\\n      \\tshape: diagonal\\n      \\tsourceY: {expr: \\"scale(\'y\', datum.yc)\\"}\\n      \\tsourceX: {expr: \\"scale(\'x\', \'stk1\') + bandwidth(\'x\')\\"}\\n      \\ttargetY: {expr: \\"scale(\'y\', datum.target.yc)\\"}\\n      \\ttargetX: {expr: \\"scale(\'x\', \'stk2\')\\"}\\n    \\t}\\n    \\t// A little trick to calculate the thickness of the line.\\n    \\t// The value needs to be the same as the hight of the node, but scaling\\n    \\t// size to screen\'s height gives inversed value because screen\'s Y\\n    \\t// coordinate goes from the top to the bottom, whereas the graph\'s Y=0\\n    \\t// is at the bottom. So subtracting scaled doc count from screen height\\n    \\t// (which is the \\"lower\\" bound of the \\"y\\" scale) gives us the right value\\n    \\t{\\n      \\ttype: formula\\n      \\texpr: range(\'y\')[0]-scale(\'y\', datum.size)\\n      \\tas: strokeWidth\\n    \\t}\\n    \\t// Tooltip needs individual link\'s percentage of all traffic\\n    \\t{\\n      \\ttype: formula\\n      \\texpr: datum.size/domain(\'y\')[1]\\n      \\tas: percentage\\n    \\t}\\n  \\t]\\n\\t}\\n  ]\\n  scales: [\\n\\t{\\n  \\t// calculates horizontal stack positioning\\n  \\tname: x\\n  \\ttype: band\\n  \\trange: width\\n  \\tdomain: [\\"stk1\\", \\"stk2\\"]\\n  \\tpaddingOuter: 0.05\\n  \\tpaddingInner: 0.95\\n\\t}\\n\\t{\\n  \\t// this scale goes up as high as the highest y1 value of all nodes\\n  \\tname: y\\n  \\ttype: linear\\n  \\trange: height\\n  \\tdomain: {data: \\"nodes\\", field: \\"y1\\"}\\n\\t}\\n\\t{\\n  \\t// use rawData to ensure the colors stay the same when clicking.\\n  \\tname: color\\n  \\ttype: ordinal\\n  \\trange: category\\n  \\tdomain: {data: \\"rawData\\", field: \\"stk1\\"}\\n\\t}\\n\\t{\\n  \\t// this scale is used to map internal ids (stk1, stk2) to stack names\\n  \\tname: stackNames\\n  \\ttype: ordinal\\n  \\trange: [\\"Source\\", \\"Destination\\"]\\n  \\tdomain: [\\"stk1\\", \\"stk2\\"]\\n\\t}\\n  ]\\n  axes: [\\n\\t{\\n  \\t// x axis should use custom label formatting to print proper stack names\\n  \\torient: bottom\\n  \\tscale: x\\n  \\tencode: {\\n    \\tlabels: {\\n      \\tupdate: {\\n        \\ttext: {scale: \\"stackNames\\", field: \\"value\\"}\\n      \\t}\\n    \\t}\\n  \\t}\\n\\t}\\n\\t{orient: \\"left\\", scale: \\"y\\"}\\n  ]\\n  marks: [\\n\\t{\\n  \\t// draw the connecting line between stacks\\n  \\ttype: path\\n  \\tname: edgeMark\\n  \\tfrom: {data: \\"edges\\"}\\n  \\t// this prevents some autosizing issues with large strokeWidth for paths\\n  \\tclip: true\\n  \\tencode: {\\n    \\tupdate: {\\n      \\t// By default use color of the left node, except when showing traffic\\n      \\t// from just one country, in which case use destination color.\\n      \\tstroke: [\\n        \\t{\\n          \\ttest: groupSelector && groupSelector.stack==\'stk1\'\\n          \\tscale: color\\n          \\tfield: stk2\\n        \\t}\\n        \\t{scale: \\"color\\", field: \\"stk1\\"}\\n      \\t]\\n      \\tstrokeWidth: {field: \\"strokeWidth\\"}\\n      \\tpath: {field: \\"path\\"}\\n      \\t// when showing all traffic, and hovering over a country,\\n      \\t// highlight the traffic from that country.\\n      \\tstrokeOpacity: {\\n        \\tsignal: !groupSelector && (groupHover.stk1 == datum.stk1 || groupHover.stk2 == datum.stk2) ? 0.9 : 0.3\\n      \\t}\\n      \\t// Ensure that the hover-selected edges show on top\\n      \\tzindex: {\\n        \\tsignal: !groupSelector && (groupHover.stk1 == datum.stk1 || groupHover.stk2 == datum.stk2) ? 1 : 0\\n      \\t}\\n      \\t// format tooltip string\\n      \\ttooltip: {\\n        \\tsignal: datum.stk1 + \' → \' + datum.stk2 + \'\\t\' + format(datum.size, \',.0f\') + \'   (\' + format(datum.percentage, \'.1%\') + \')\'\\n      \\t}\\n    \\t}\\n    \\t// Simple mouseover highlighting of a single line\\n    \\thover: {\\n      \\tstrokeOpacity: {value: 1}\\n    \\t}\\n  \\t}\\n\\t}\\n\\t{\\n  \\t// draw stack groups (countries)\\n  \\ttype: rect\\n  \\tname: groupMark\\n  \\tfrom: {data: \\"groups\\"}\\n  \\tencode: {\\n    \\tenter: {\\n      \\tfill: {scale: \\"color\\", field: \\"grpId\\"}\\n      \\twidth: {scale: \\"x\\", band: 1}\\n    \\t}\\n    \\tupdate: {\\n      \\tx: {scale: \\"x\\", field: \\"stack\\"}\\n      \\ty: {field: \\"scaledY0\\"}\\n      \\ty2: {field: \\"scaledY1\\"}\\n      \\tfillOpacity: {value: 0.6}\\n      \\ttooltip: {\\n        \\tsignal: datum.grpId + \'   \' + format(datum.total, \',.0f\') + \'   (\' + format(datum.percentage, \'.1%\') + \')\'\\n      \\t}\\n    \\t}\\n    \\thover: {\\n      \\tfillOpacity: {value: 1}\\n    \\t}\\n  \\t}\\n\\t}\\n\\t{\\n  \\t// draw country code labels on the inner side of the stack\\n  \\ttype: text\\n  \\tfrom: {data: \\"groups\\"}\\n  \\t// don\'t process events for the labels - otherwise line mouseover is unclean\\n  \\tinteractive: false\\n  \\tencode: {\\n    \\tupdate: {\\n      \\t// depending on which stack it is, position x with some padding\\n      \\tx: {\\n        \\tsignal: scale(\'x\', datum.stack) + (datum.rightLabel ? bandwidth(\'x\') + 8 : -8)\\n      \\t}\\n      \\t// middle of the group\\n      \\tyc: {signal: \\"(datum.scaledY0 + datum.scaledY1)/2\\"}\\n      \\talign: {signal: \\"datum.rightLabel ? \'left\' : \'right\'\\"}\\n      \\tbaseline: {value: \\"middle\\"}\\n      \\tfontWeight: {value: \\"bold\\"}\\n      \\t// only show text label if the group\'s height is large enough\\n      \\ttext: {signal: \\"abs(datum.scaledY0-datum.scaledY1) > 13 ? datum.grpId : \'\'\\"}\\n    \\t}\\n  \\t}\\n\\t}\\n\\t{\\n  \\t// Create a \\"show all\\" button. Shown only when a country is selected.\\n  \\ttype: group\\n  \\tdata: [\\n    \\t// We need to make the button show only when groupSelector signal is true.\\n    \\t// Each mark is drawn as many times as there are elements in the backing data.\\n    \\t// Which means that if values list is empty, it will not be drawn.\\n    \\t// Here I create a data source with one empty object, and filter that list\\n    \\t// based on the signal value. This can only be done in a group.\\n    \\t{\\n      \\tname: dataForShowAll\\n      \\tvalues: [{}]\\n      \\ttransform: [{type: \\"filter\\", expr: \\"groupSelector\\"}]\\n    \\t}\\n  \\t]\\n  \\t// Set button size and positioning\\n  \\tencode: {\\n    \\tenter: {\\n      \\txc: {signal: \\"width/2\\"}\\n      \\ty: {value: 30}\\n      \\twidth: {value: 80}\\n      \\theight: {value: 30}\\n    \\t}\\n  \\t}\\n  \\tmarks: [\\n    \\t{\\n      \\t// This group is shown as a button with rounded corners.\\n      \\ttype: group\\n      \\t// mark name allows signal capturing\\n      \\tname: groupReset\\n      \\t// Only shows button if dataForShowAll has values.\\n      \\tfrom: {data: \\"dataForShowAll\\"}\\n      \\tencode: {\\n        \\tenter: {\\n          \\tcornerRadius: {value: 6}\\n          \\tfill: {value: \\"#F5F7FA\\"}\\n          \\tstroke: {value: \\"#c1c1c1\\"}\\n          \\tstrokeWidth: {value: 2}\\n          \\t// use parent group\'s size\\n          \\theight: {\\n            \\tfield: {group: \\"height\\"}\\n          \\t}\\n          \\twidth: {\\n            \\tfield: {group: \\"width\\"}\\n          \\t}\\n        \\t}\\n        \\tupdate: {\\n          \\t// groups are transparent by default\\n          \\topacity: {value: 1}\\n        \\t}\\n        \\thover: {\\n          \\topacity: {value: 0.7}\\n        \\t}\\n      \\t}\\n      \\tmarks: [\\n        \\t{\\n          \\ttype: text\\n          \\t// if true, it will prevent clicking on the button when over text.\\n          \\tinteractive: false\\n          \\tencode: {\\n            \\tenter: {\\n              \\t// center text in the paren group\\n              \\txc: {\\n                \\tfield: {group: \\"width\\"}\\n                \\tmult: 0.5\\n              \\t}\\n              \\tyc: {\\n                \\tfield: {group: \\"height\\"}\\n                \\tmult: 0.5\\n                \\toffset: 2\\n              \\t}\\n              \\talign: {value: \\"center\\"}\\n              \\tbaseline: {value: \\"middle\\"}\\n              \\tfontWeight: {value: \\"bold\\"}\\n              \\ttext: {value: \\"Show All\\"}\\n            \\t}\\n          \\t}\\n        \\t}\\n      \\t]\\n    \\t}\\n  \\t]\\n\\t}\\n  ]\\n  signals: [\\n\\t{\\n  \\t// used to highlight traffic to/from the same country\\n  \\tname: groupHover\\n  \\tvalue: {}\\n  \\ton: [\\n    \\t{\\n      \\tevents: @groupMark:mouseover\\n      \\tupdate: \\"{stk1:datum.stack==\'stk1\' && datum.grpId, stk2:datum.stack==\'stk2\' && datum.grpId}\\"\\n    \\t}\\n    \\t{events: \\"mouseout\\", update: \\"{}\\"}\\n  \\t]\\n\\t}\\n\\t// used to filter only the data related to the selected country\\n\\t{\\n  \\tname: groupSelector\\n  \\tvalue: false\\n  \\ton: [\\n    \\t{\\n      \\t// Clicking groupMark sets this signal to the filter values\\n      \\tevents: @groupMark:click!\\n      \\tupdate: \\"{stack:datum.stack, stk1:datum.stack==\'stk1\' && datum.grpId, stk2:datum.stack==\'stk2\' && datum.grpId}\\"\\n    \\t}\\n    \\t{\\n      \\t// Clicking \\"show all\\" button, or double-clicking anywhere resets it\\n      \\tevents: [\\n        \\t{type: \\"click\\", markname: \\"groupReset\\"}\\n        \\t{type: \\"dblclick\\"}\\n      \\t]\\n      \\tupdate: \\"false\\"\\n    \\t}\\n  \\t]\\n\\t}\\n  ]\\n}\\n"},"aggs":[]}',
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
    id: '314c6f60-2224-11e8-b802-5bcf64c2cfb4',
    type: 'visualization',
    updated_at: '2021-07-21T18:52:13.586Z',
    version: '2',
    migrationVersion: {
      visualization: '7.14.0',
    },
    attributes: {
      title: i18n.translate('home.sampleData.logsSpec.responseCodesOverTimeTitle', {
        defaultMessage: '[Logs] Response Codes Over Time + Annotations',
      }),
      visState:
        '{"title":"[Logs] Response Codes Over Time + Annotations","type":"metrics","aggs":[],"params":{"time_range_mode":"entire_time_range","id":"61ca57f0-469d-11e7-af02-69e470af7417","type":"timeseries","series":[{"id":"61ca57f1-469d-11e7-af02-69e470af7417","color":"rgba(115,216,255,1)","split_mode":"filters","metrics":[{"id":"61ca57f2-469d-11e7-af02-69e470af7417","type":"count","field":"ip"}],"seperate_axis":0,"axis_position":"right","formatter":"percent","chart_type":"line","line_width":"2","point_size":"0","fill":"0.5","stacked":"percent","terms_field":"response.keyword","terms_order_by":"61ca57f2-469d-11e7-af02-69e470af7417","label":"Response Code Count","split_color_mode":"gradient","split_filters":[{"filter":{"query":"response.keyword >= 200 and response.keyword < 400","language":"kuery"},"label":"HTTP 2xx and 3xx","color":"rgba(84,179,153,1)","id":"96b6ffe0-ea54-11eb-ad09-9f2ab44412fb"},{"filter":{"query":"response.keyword >= 400 and response.keyword < 500","language":"kuery"},"label":"HTTP 4xx","color":"rgba(214,191,87,1)","id":"9e41b1b0-ea54-11eb-ad09-9f2ab44412fb"},{"filter":{"query":"response.keyword >= 500","language":"kuery"},"label":"HTTP 5xx","color":"rgba(211,96,134,1)","id":"a6772270-ea54-11eb-ad09-9f2ab44412fb"}],"type":"timeseries"}],"time_field":"timestamp","use_kibana_indexes":true,"interval":">=4h","axis_position":"left","axis_formatter":"number","show_legend":1,"show_grid":1,"annotations":[{"fields":"geo.src, host","template":"Security Error from {{geo.src}} on {{host}}","query_string":{"query":"tags:error AND tags:security","language":"lucene"},"id":"bd7548a0-2223-11e8-832f-d5027f3c8a47","color":"rgba(211,49,21,1)","time_field":"timestamp","icon":"fa-asterisk","ignore_global_filters":1,"ignore_panel_filters":1,"index_pattern_ref_name":"metrics_1_index_pattern"}],"legend_position":"bottom","axis_scale":"normal","drop_last_bucket":0,"tooltip_mode":"show_all","index_pattern_ref_name":"metrics_0_index_pattern"}}',
      uiStateJSON: '{}',
      description: '',
      version: 1,
      kibanaSavedObjectMeta: {
        searchSourceJSON: '{"query":{"query":"","language":"kuery"},"filter":[]}',
      },
    },
    references: [
      {
        id: '90943e30-9a47-11e8-b64d-95841ca0b247',
        name: 'metrics_0_index_pattern',
        type: 'index-pattern',
      },
      {
        id: '90943e30-9a47-11e8-b64d-95841ca0b247',
        name: 'metrics_1_index_pattern',
        type: 'index-pattern',
      },
    ],
  },
  {
    id: '16b1d7d0-ea71-11eb-8b4b-f7b600de0f7d',
    type: 'lens',
    updated_at: '2021-07-21T22:14:59.793Z',
    version: '1',
    migrationVersion: {
      lens: '7.14.0',
    },
    attributes: {
      title: i18n.translate('home.sampleData.logsSpec.bytesDistributionTitle', {
        defaultMessage: '[Logs] Bytes distribution',
      }),
      visualizationType: 'lnsXY',
      state: {
        datasourceStates: {
          indexpattern: {
            layers: {
              '7d9a32b1-8cc2-410c-83a5-2eb66a3f0321': {
                columnOrder: [
                  'a8511a62-2b78-4ba4-9425-a417df6e059f',
                  'b5f3dc78-dba8-4db8-87b6-24a0b9cca260',
                  'b5f3dc78-dba8-4db8-87b6-24a0b9cca260X0',
                  'b5f3dc78-dba8-4db8-87b6-24a0b9cca260X1',
                  'b5f3dc78-dba8-4db8-87b6-24a0b9cca260X2',
                  'b5f3dc78-dba8-4db8-87b6-24a0b9cca260X3',
                ],
                columns: {
                  'a8511a62-2b78-4ba4-9425-a417df6e059f': {
                    dataType: 'number',
                    isBucketed: true,
                    label: 'bytes',
                    operationType: 'range',
                    params: {
                      maxBars: 'auto',
                      ranges: [
                        {
                          from: 0,
                          label: '',
                          to: 1000,
                        },
                      ],
                      type: 'histogram',
                    },
                    scale: 'interval',
                    sourceField: 'bytes',
                  },
                  'b5f3dc78-dba8-4db8-87b6-24a0b9cca260': {
                    customLabel: true,
                    dataType: 'number',
                    isBucketed: false,
                    label: '% of visits',
                    operationType: 'formula',
                    params: {
                      format: {
                        id: 'percent',
                        params: {
                          decimals: 1,
                        },
                      },
                      formula: 'count() / overall_sum(count())',
                      isFormulaBroken: false,
                    },
                    references: ['b5f3dc78-dba8-4db8-87b6-24a0b9cca260X3'],
                    scale: 'ratio',
                  },
                  'b5f3dc78-dba8-4db8-87b6-24a0b9cca260X0': {
                    customLabel: true,
                    dataType: 'number',
                    isBucketed: false,
                    label: 'Part of count() / overall_sum(count())',
                    operationType: 'count',
                    scale: 'ratio',
                    sourceField: '___records___',
                  },
                  'b5f3dc78-dba8-4db8-87b6-24a0b9cca260X1': {
                    customLabel: true,
                    dataType: 'number',
                    isBucketed: false,
                    label: 'Part of count() / overall_sum(count())',
                    operationType: 'count',
                    scale: 'ratio',
                    sourceField: '___records___',
                  },
                  'b5f3dc78-dba8-4db8-87b6-24a0b9cca260X2': {
                    customLabel: true,
                    dataType: 'number',
                    isBucketed: false,
                    label: 'Part of count() / overall_sum(count())',
                    operationType: 'overall_sum',
                    references: ['b5f3dc78-dba8-4db8-87b6-24a0b9cca260X1'],
                    scale: 'ratio',
                  },
                  'b5f3dc78-dba8-4db8-87b6-24a0b9cca260X3': {
                    customLabel: true,
                    dataType: 'number',
                    isBucketed: false,
                    label: 'Part of count() / overall_sum(count())',
                    operationType: 'math',
                    params: {
                      tinymathAst: {
                        args: [
                          'b5f3dc78-dba8-4db8-87b6-24a0b9cca260X0',
                          'b5f3dc78-dba8-4db8-87b6-24a0b9cca260X2',
                        ],
                        location: {
                          max: 30,
                          min: 0,
                        },
                        name: 'divide',
                        text: 'count() / overall_sum(count())',
                        type: 'function',
                      },
                    },
                    references: [
                      'b5f3dc78-dba8-4db8-87b6-24a0b9cca260X0',
                      'b5f3dc78-dba8-4db8-87b6-24a0b9cca260X2',
                    ],
                    scale: 'ratio',
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
              accessors: ['b5f3dc78-dba8-4db8-87b6-24a0b9cca260'],
              layerId: '7d9a32b1-8cc2-410c-83a5-2eb66a3f0321',
              position: 'top',
              seriesType: 'bar_stacked',
              showGridlines: false,
              xAccessor: 'a8511a62-2b78-4ba4-9425-a417df6e059f',
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
    },
    references: [
      {
        id: '90943e30-9a47-11e8-b64d-95841ca0b247',
        name: 'indexpattern-datasource-current-indexpattern',
        type: 'index-pattern',
      },
      {
        id: '90943e30-9a47-11e8-b64d-95841ca0b247',
        name: 'indexpattern-datasource-layer-7d9a32b1-8cc2-410c-83a5-2eb66a3f0321',
        type: 'index-pattern',
      },
    ],
  },
  {
    id: '90943e30-9a47-11e8-b64d-95841ca0b247',
    type: 'index-pattern',
    updated_at: '2018-08-29T13:22:17.617Z',
    version: '1',
    migrationVersion: {},
    attributes: {
      title: 'kibana_sample_data_logs',
      timeFieldName: 'timestamp',
      fieldFormatMap: '{"hour_of_day":{}}',
      runtimeFieldMap:
        '{"hour_of_day":{"type":"long","script":{"source":"emit(doc[\'timestamp\'].value.getHour());"}}}',
    },
    references: [],
  },
  {
    id: 'edf84fe0-e1a0-11e7-b6d5-4dc382ef7f5b',
    type: 'dashboard',
    updated_at: '2021-10-28T15:07:36.622Z',
    version: '3',
    references: [
      {
        id: '06cf9c40-9ee8-11e7-8711-e7a007dcef99',
        name: '4:panel_4',
        type: 'visualization',
      },
      {
        id: '4eb6e500-e1c7-11e7-b6d5-4dc382ef7f5b',
        name: '9:panel_9',
        type: 'visualization',
      },
      {
        id: '69a34b00-9ee8-11e7-8711-e7a007dcef99',
        name: '11:panel_11',
        type: 'visualization',
      },
      {
        id: '7cbd2350-2223-11e8-b802-5bcf64c2cfb4',
        name: '14:panel_14',
        type: 'visualization',
      },
      {
        id: '314c6f60-2224-11e8-b802-5bcf64c2cfb4',
        name: '15:panel_15',
        type: 'visualization',
      },
      {
        id: '90943e30-9a47-11e8-b64d-95841ca0b247',
        name: '30326cdb-4ddd-49eb-a4f1-b555caa21d7c:control_30326cdb-4ddd-49eb-a4f1-b555caa21d7c_0_index_pattern',
        type: 'index-pattern',
      },
      {
        id: '90943e30-9a47-11e8-b64d-95841ca0b247',
        name: '30326cdb-4ddd-49eb-a4f1-b555caa21d7c:control_30326cdb-4ddd-49eb-a4f1-b555caa21d7c_1_index_pattern',
        type: 'index-pattern',
      },
      {
        id: '90943e30-9a47-11e8-b64d-95841ca0b247',
        name: '30326cdb-4ddd-49eb-a4f1-b555caa21d7c:control_30326cdb-4ddd-49eb-a4f1-b555caa21d7c_2_index_pattern',
        type: 'index-pattern',
      },
      {
        id: '90943e30-9a47-11e8-b64d-95841ca0b247',
        name: 'bb94016e-f4a6-49ca-87a9-296a2869d570:indexpattern-datasource-current-indexpattern',
        type: 'index-pattern',
      },
      {
        id: '90943e30-9a47-11e8-b64d-95841ca0b247',
        name: 'bb94016e-f4a6-49ca-87a9-296a2869d570:indexpattern-datasource-layer-483defd2-775b-4a62-bdef-496c819bb8ed',
        type: 'index-pattern',
      },
      {
        id: '90943e30-9a47-11e8-b64d-95841ca0b247',
        name: '01d8e435-91c0-484f-a11e-856747050b0a:indexpattern-datasource-current-indexpattern',
        type: 'index-pattern',
      },
      {
        id: '90943e30-9a47-11e8-b64d-95841ca0b247',
        name: '01d8e435-91c0-484f-a11e-856747050b0a:indexpattern-datasource-layer-f3793bb7-3971-4753-866d-4008e77a9f9a',
        type: 'index-pattern',
      },
      {
        id: '90943e30-9a47-11e8-b64d-95841ca0b247',
        name: '8c1456d4-1993-4ba2-b701-04aca02c9fef:indexpattern-datasource-current-indexpattern',
        type: 'index-pattern',
      },
      {
        id: '90943e30-9a47-11e8-b64d-95841ca0b247',
        name: '8c1456d4-1993-4ba2-b701-04aca02c9fef:indexpattern-datasource-layer-f3793bb7-3971-4753-866d-4008e77a9f9a',
        type: 'index-pattern',
      },
      {
        id: 'cb099a20-ea66-11eb-9425-113343a037e3',
        name: '8e59c7cf-6e42-4343-a113-c4a255fcf2ce:panel_8e59c7cf-6e42-4343-a113-c4a255fcf2ce',
        type: 'visualization',
      },
      {
        id: '90943e30-9a47-11e8-b64d-95841ca0b247',
        name: '1d5f0b3f-d9d2-4b26-997b-83bc5ca3090b:indexpattern-datasource-current-indexpattern',
        type: 'index-pattern',
      },
      {
        id: '90943e30-9a47-11e8-b64d-95841ca0b247',
        name: '1d5f0b3f-d9d2-4b26-997b-83bc5ca3090b:indexpattern-datasource-layer-c35dc8ee-50d1-4ef7-8b4b-9c21a7e7d3b0',
        type: 'index-pattern',
      },
      {
        id: '16b1d7d0-ea71-11eb-8b4b-f7b600de0f7d',
        name: 'cbca842c-b9fa-4523-9ce0-14e350866e33:panel_cbca842c-b9fa-4523-9ce0-14e350866e33',
        type: 'lens',
      },
    ],
    migrationVersion: {
      dashboard: '7.14.0',
    },
    attributes: {
      title: i18n.translate('home.sampleData.logsSpec.webTrafficTitle', {
        defaultMessage: '[Logs] Web Traffic',
      }),
      hits: 0,
      description: i18n.translate('home.sampleData.logsSpec.webTrafficDescription', {
        defaultMessage: "Analyze mock web traffic log data for Elastic's website",
      }),
      panelsJSON:
        '[{"version":"8.0.0","type":"map","gridData":{"x":0,"y":19,"w":24,"h":18,"i":"4"},"panelIndex":"4","embeddableConfig":{"isLayerTOCOpen":false,"enhancements":{},"mapCenter":{"lat":42.16337,"lon":-88.92107,"zoom":3.64},"mapBuffer":{"minLon":-112.5,"minLat":21.94305,"maxLon":-45,"maxLat":55.77657},"openTOCDetails":[],"hiddenLayers":[]},"panelRefName":"panel_4"},{"version":"8.0.0","type":"visualization","gridData":{"x":0,"y":52,"w":24,"h":13,"i":"9"},"panelIndex":"9","embeddableConfig":{"mapCenter":[36.8092847020594,-96.94335937500001],"vis":{"params":{"sort":{"columnIndex":null,"direction":null}}},"enhancements":{}},"panelRefName":"panel_9"},{"version":"8.0.0","type":"visualization","gridData":{"x":12,"y":6,"w":12,"h":8,"i":"11"},"panelIndex":"11","embeddableConfig":{"vis":{"colors":{"0 - 500":"#BF1B00","1000 - 1500":"#7EB26D","500 - 1000":"#F2C96D"},"defaultColors":{"0 - 500":"rgb(165,0,38)","1000 - 1500":"rgb(0,104,55)","500 - 1000":"rgb(255,255,190)"},"legendOpen":false},"enhancements":{}},"title":"","panelRefName":"panel_11"},{"version":"8.0.0","type":"visualization","gridData":{"x":24,"y":19,"w":24,"h":33,"i":"14"},"panelIndex":"14","embeddableConfig":{"enhancements":{}},"panelRefName":"panel_14"},{"version":"8.0.0","type":"visualization","gridData":{"x":24,"y":6,"w":24,"h":13,"i":"15"},"panelIndex":"15","embeddableConfig":{"enhancements":{"dynamicActions":{"events":[]}}},"panelRefName":"panel_15"},{"version":"8.0.0","type":"visualization","gridData":{"x":0,"y":0,"w":17,"h":6,"i":"343f0bef-0b19-452e-b1c8-59beb18b6f0c"},"panelIndex":"343f0bef-0b19-452e-b1c8-59beb18b6f0c","embeddableConfig":{"savedVis":{"title":"[Logs] Markdown Instructions","description":"","type":"markdown","params":{"fontSize":12,"openLinksInNewTab":true,"markdown":"### Sample Logs Data\\nThis dashboard contains sample data for you to play with. You can view it, search it, and interact with the visualizations. For more information about Kibana, check our [docs](https://www.elastic.co/guide/en/kibana/current/index.html)."},"uiState":{},"data":{"aggs":[],"searchSource":{"query":{"query":"","language":"kuery"},"filter":[]}}},"enhancements":{},"hidePanelTitles":true}},{"version":"8.0.0","type":"visualization","gridData":{"x":17,"y":0,"w":31,"h":6,"i":"30326cdb-4ddd-49eb-a4f1-b555caa21d7c"},"panelIndex":"30326cdb-4ddd-49eb-a4f1-b555caa21d7c","embeddableConfig":{"savedVis":{"title":"[Logs] Input Controls","description":"","type":"input_control_vis","params":{"controls":[{"id":"1523980210832","fieldName":"geo.src","label":"Source Country","type":"list","options":{"type":"terms","multiselect":true,"size":100,"order":"desc"},"parent":"","indexPatternRefName":"control_30326cdb-4ddd-49eb-a4f1-b555caa21d7c_0_index_pattern"},{"id":"1523980191978","fieldName":"machine.os.keyword","label":"OS","type":"list","options":{"type":"terms","multiselect":true,"size":100,"order":"desc"},"parent":"1523980210832","indexPatternRefName":"control_30326cdb-4ddd-49eb-a4f1-b555caa21d7c_1_index_pattern"},{"id":"1523980232790","fieldName":"bytes","label":"Bytes","type":"range","options":{"decimalPlaces":0,"step":1024},"indexPatternRefName":"control_30326cdb-4ddd-49eb-a4f1-b555caa21d7c_2_index_pattern"}],"updateFiltersOnChange":true,"useTimeFilter":true,"pinFilters":false},"uiState":{},"data":{"aggs":[],"searchSource":{"query":{"query":"","language":"kuery"},"filter":[]}}},"enhancements":{},"hidePanelTitles":true}},{"version":"8.0.0","type":"lens","gridData":{"x":0,"y":6,"w":12,"h":8,"i":"bb94016e-f4a6-49ca-87a9-296a2869d570"},"panelIndex":"bb94016e-f4a6-49ca-87a9-296a2869d570","embeddableConfig":{"attributes":{"title":"","type":"lens","visualizationType":"lnsMetric","state":{"datasourceStates":{"indexpattern":{"layers":{"483defd2-775b-4a62-bdef-496c819bb8ed":{"columns":{"37430d12-7452-4cc9-b035-5cfd4061edf0":{"label":"Visits","dataType":"number","operationType":"count","isBucketed":false,"scale":"ratio","sourceField":"Records","customLabel":true}},"columnOrder":["37430d12-7452-4cc9-b035-5cfd4061edf0"],"incompleteColumns":{}}}}},"visualization":{"layerId":"483defd2-775b-4a62-bdef-496c819bb8ed","accessor":"37430d12-7452-4cc9-b035-5cfd4061edf0"},"query":{"query":"","language":"kuery"},"filters":[]},"references":[{"type":"index-pattern","id":"90943e30-9a47-11e8-b64d-95841ca0b247","name":"indexpattern-datasource-current-indexpattern"},{"type":"index-pattern","id":"90943e30-9a47-11e8-b64d-95841ca0b247","name":"indexpattern-datasource-layer-483defd2-775b-4a62-bdef-496c819bb8ed"}]},"enhancements":{}}},{"version":"8.0.0","type":"lens","gridData":{"x":0,"y":14,"w":12,"h":5,"i":"01d8e435-91c0-484f-a11e-856747050b0a"},"panelIndex":"01d8e435-91c0-484f-a11e-856747050b0a","embeddableConfig":{"attributes":{"title":"","type":"lens","visualizationType":"lnsMetric","state":{"datasourceStates":{"indexpattern":{"layers":{"f3793bb7-3971-4753-866d-4008e77a9f9a":{"columns":{"71c076a6-e782-4866-b8df-5fd85a41f08bX0":{"label":"Part of HTTP 5xx","dataType":"number","operationType":"count","isBucketed":false,"scale":"ratio","sourceField":"Records","filter":{"query":"response.keyword >= 400 and response.keyword < 500","language":"kuery"},"customLabel":true},"71c076a6-e782-4866-b8df-5fd85a41f08bX1":{"label":"Part of HTTP 5xx","dataType":"number","operationType":"count","isBucketed":false,"scale":"ratio","sourceField":"Records","customLabel":true},"71c076a6-e782-4866-b8df-5fd85a41f08bX2":{"label":"Part of HTTP 5xx","dataType":"number","operationType":"math","isBucketed":false,"scale":"ratio","params":{"tinymathAst":{"type":"function","name":"divide","args":["71c076a6-e782-4866-b8df-5fd85a41f08bX0","71c076a6-e782-4866-b8df-5fd85a41f08bX1"],"location":{"min":0,"max":73},"text":"count(kql=\'response.keyword >= 400 and response.keyword < 500\') / count()"}},"references":["71c076a6-e782-4866-b8df-5fd85a41f08bX0","71c076a6-e782-4866-b8df-5fd85a41f08bX1"],"customLabel":true},"71c076a6-e782-4866-b8df-5fd85a41f08b":{"label":"HTTP 4xx","dataType":"number","operationType":"formula","isBucketed":false,"scale":"ratio","params":{"formula":"count(kql=\'response.keyword >= 400 and response.keyword < 500\') / count()","isFormulaBroken":false,"format":{"id":"percent","params":{"decimals":1}}},"references":["71c076a6-e782-4866-b8df-5fd85a41f08bX2"],"customLabel":true}},"columnOrder":["71c076a6-e782-4866-b8df-5fd85a41f08b","71c076a6-e782-4866-b8df-5fd85a41f08bX0","71c076a6-e782-4866-b8df-5fd85a41f08bX1","71c076a6-e782-4866-b8df-5fd85a41f08bX2"],"incompleteColumns":{}}}}},"visualization":{"layerId":"f3793bb7-3971-4753-866d-4008e77a9f9a","accessor":"71c076a6-e782-4866-b8df-5fd85a41f08b"},"query":{"query":"","language":"kuery"},"filters":[]},"references":[{"type":"index-pattern","id":"90943e30-9a47-11e8-b64d-95841ca0b247","name":"indexpattern-datasource-current-indexpattern"},{"type":"index-pattern","id":"90943e30-9a47-11e8-b64d-95841ca0b247","name":"indexpattern-datasource-layer-f3793bb7-3971-4753-866d-4008e77a9f9a"}]},"enhancements":{}}},{"version":"8.0.0","type":"lens","gridData":{"x":12,"y":14,"w":12,"h":5,"i":"8c1456d4-1993-4ba2-b701-04aca02c9fef"},"panelIndex":"8c1456d4-1993-4ba2-b701-04aca02c9fef","embeddableConfig":{"attributes":{"title":"","type":"lens","visualizationType":"lnsMetric","state":{"datasourceStates":{"indexpattern":{"layers":{"f3793bb7-3971-4753-866d-4008e77a9f9a":{"columns":{"71c076a6-e782-4866-b8df-5fd85a41f08bX0":{"label":"Part of HTTP 5xx","dataType":"number","operationType":"count","isBucketed":false,"scale":"ratio","sourceField":"Records","filter":{"query":"response.keyword >= 500","language":"kuery"},"customLabel":true},"71c076a6-e782-4866-b8df-5fd85a41f08bX1":{"label":"Part of HTTP 5xx","dataType":"number","operationType":"count","isBucketed":false,"scale":"ratio","sourceField":"Records","customLabel":true},"71c076a6-e782-4866-b8df-5fd85a41f08bX2":{"label":"Part of HTTP 5xx","dataType":"number","operationType":"math","isBucketed":false,"scale":"ratio","params":{"tinymathAst":{"type":"function","name":"divide","args":["71c076a6-e782-4866-b8df-5fd85a41f08bX0","71c076a6-e782-4866-b8df-5fd85a41f08bX1"],"location":{"min":0,"max":46},"text":"count(kql=\'response.keyword >= 500\') / count()"}},"references":["71c076a6-e782-4866-b8df-5fd85a41f08bX0","71c076a6-e782-4866-b8df-5fd85a41f08bX1"],"customLabel":true},"71c076a6-e782-4866-b8df-5fd85a41f08b":{"label":"HTTP 5xx","dataType":"number","operationType":"formula","isBucketed":false,"scale":"ratio","params":{"formula":"count(kql=\'response.keyword >= 500\') / count()","isFormulaBroken":false,"format":{"id":"percent","params":{"decimals":1}}},"references":["71c076a6-e782-4866-b8df-5fd85a41f08bX2"],"customLabel":true}},"columnOrder":["71c076a6-e782-4866-b8df-5fd85a41f08b","71c076a6-e782-4866-b8df-5fd85a41f08bX0","71c076a6-e782-4866-b8df-5fd85a41f08bX1","71c076a6-e782-4866-b8df-5fd85a41f08bX2"],"incompleteColumns":{}}}}},"visualization":{"layerId":"f3793bb7-3971-4753-866d-4008e77a9f9a","accessor":"71c076a6-e782-4866-b8df-5fd85a41f08b"},"query":{"query":"","language":"kuery"},"filters":[]},"references":[{"type":"index-pattern","id":"90943e30-9a47-11e8-b64d-95841ca0b247","name":"indexpattern-datasource-current-indexpattern"},{"type":"index-pattern","id":"90943e30-9a47-11e8-b64d-95841ca0b247","name":"indexpattern-datasource-layer-f3793bb7-3971-4753-866d-4008e77a9f9a"}]},"enhancements":{}}},{"version":"8.0.0","type":"visualization","gridData":{"x":0,"y":37,"w":24,"h":15,"i":"8e59c7cf-6e42-4343-a113-c4a255fcf2ce"},"panelIndex":"8e59c7cf-6e42-4343-a113-c4a255fcf2ce","embeddableConfig":{"savedVis":{"title":"","description":"","type":"vega","params":{"spec":"{\\n  $schema: https://vega.github.io/schema/vega-lite/v5.json\\n  data: {\\n    url: {\\n      %context%: true\\n      %timefield%: @timestamp\\n      index: kibana_sample_data_logs\\n      body: {\\n        aggs: {\\n          countries: {\\n            terms: {\\n              field: geo.src\\n              size: 25\\n            }\\n            aggs: {\\n              hours: {\\n                histogram: {\\n                  field: hour_of_day\\n                  interval: 1\\n                }\\n                aggs: {\\n                  unique: {\\n                    cardinality: {\\n                      field: clientip\\n                    }\\n                  }\\n                }\\n              }\\n            }\\n          }\\n        }\\n        size: 0\\n      }\\n    }\\n    format: {property: \\"aggregations.countries.buckets\\"}\\n  }\\n  \\n  transform: [\\n    {\\n      flatten: [\\"hours.buckets\\"],\\n      as: [\\"buckets\\"]\\n    }\\n  ]\\n\\n  mark: {\\n    type: rect\\n    tooltip: true\\n  }\\n\\n  encoding: {\\n    x: {\\n      field: buckets.key\\n      type: ordinal\\n      axis: {\\n        title: false\\n        labelAngle: 0\\n      }\\n    }\\n    y: {\\n      field: key\\n      type: nominal\\n      sort: {\\n        field: -buckets.unique.value\\n      }\\n      axis: {title: false}\\n    }\\n    color: {\\n      field: buckets.unique.value\\n      type: quantitative\\n      axis: {title: false}\\n      scale: {\\n        scheme: reds\\n      }\\n    }\\n  }\\n}\\n"},"uiState":{},"data":{"aggs":[],"searchSource":{"query":{"query":"","language":"kuery"},"filter":[]}}},"enhancements":{}},"panelRefName":"panel_8e59c7cf-6e42-4343-a113-c4a255fcf2ce"},{"version":"8.0.0","type":"lens","gridData":{"x":0,"y":65,"w":48,"h":19,"i":"1d5f0b3f-d9d2-4b26-997b-83bc5ca3090b"},"panelIndex":"1d5f0b3f-d9d2-4b26-997b-83bc5ca3090b","embeddableConfig":{"attributes":{"title":"","type":"lens","visualizationType":"lnsDatatable","state":{"datasourceStates":{"indexpattern":{"layers":{"c35dc8ee-50d1-4ef7-8b4b-9c21a7e7d3b0":{"columns":{"42783ad7-dbcf-4310-bc06-f21f4eaaac96":{"label":"URL","dataType":"string","operationType":"terms","scale":"ordinal","sourceField":"url.keyword","isBucketed":true,"params":{"size":1000,"orderBy":{"type":"column","columnId":"f7835375-4d5b-4839-95ea-41928192a319"},"orderDirection":"desc","otherBucket":true,"missingBucket":false},"customLabel":true},"f7835375-4d5b-4839-95ea-41928192a319":{"label":"Visits","dataType":"number","operationType":"count","isBucketed":false,"scale":"ratio","sourceField":"Records","customLabel":true},"07fc84ca-4147-4ba9-879e-d1b4e086e1daX0":{"label":"Part of HTTP 4xx","dataType":"number","operationType":"count","isBucketed":false,"scale":"ratio","sourceField":"Records","filter":{"query":"response.keyword >= 400 and response.keyword < 500","language":"kuery"},"customLabel":true},"07fc84ca-4147-4ba9-879e-d1b4e086e1daX1":{"label":"Part of HTTP 4xx","dataType":"number","operationType":"count","isBucketed":false,"scale":"ratio","sourceField":"Records","customLabel":true},"07fc84ca-4147-4ba9-879e-d1b4e086e1daX2":{"label":"Part of HTTP 4xx","dataType":"number","operationType":"math","isBucketed":false,"scale":"ratio","params":{"tinymathAst":{"type":"function","name":"divide","args":["07fc84ca-4147-4ba9-879e-d1b4e086e1daX0","07fc84ca-4147-4ba9-879e-d1b4e086e1daX1"],"location":{"min":0,"max":73},"text":"count(kql=\'response.keyword >= 400 and response.keyword < 500\') / count()"}},"references":["07fc84ca-4147-4ba9-879e-d1b4e086e1daX0","07fc84ca-4147-4ba9-879e-d1b4e086e1daX1"],"customLabel":true},"07fc84ca-4147-4ba9-879e-d1b4e086e1da":{"label":"HTTP 4xx","dataType":"number","operationType":"formula","isBucketed":false,"scale":"ratio","params":{"formula":"count(kql=\'response.keyword >= 400 and response.keyword < 500\') / count()","isFormulaBroken":false,"format":{"id":"percent","params":{"decimals":1}}},"references":["07fc84ca-4147-4ba9-879e-d1b4e086e1daX2"],"customLabel":true},"791d5a5b-a7ba-4e9e-b533-51b33c7d7747":{"label":"Unique","dataType":"number","operationType":"unique_count","scale":"ratio","sourceField":"clientip","isBucketed":false,"customLabel":true},"611e3509-e834-4fdd-b573-44e959e95d27":{"label":"95th percentile of bytes","dataType":"number","operationType":"percentile","sourceField":"bytes","isBucketed":false,"scale":"ratio","params":{"percentile":95,"format":{"id":"bytes","params":{"decimals":0}}}},"9f79ecca-123f-4098-a658-6b0e998da003":{"label":"Median of bytes","dataType":"number","operationType":"median","sourceField":"bytes","isBucketed":false,"scale":"ratio","params":{"format":{"id":"bytes","params":{"decimals":0}}}},"491285fd-0196-402c-9b7f-4660fdc1c22aX0":{"label":"Part of HTTP 5xx","dataType":"number","operationType":"count","isBucketed":false,"scale":"ratio","sourceField":"Records","filter":{"query":"response.keyword >= 500","language":"kuery"},"customLabel":true},"491285fd-0196-402c-9b7f-4660fdc1c22aX1":{"label":"Part of HTTP 5xx","dataType":"number","operationType":"count","isBucketed":false,"scale":"ratio","sourceField":"Records","customLabel":true},"491285fd-0196-402c-9b7f-4660fdc1c22aX2":{"label":"Part of HTTP 5xx","dataType":"number","operationType":"math","isBucketed":false,"scale":"ratio","params":{"tinymathAst":{"type":"function","name":"divide","args":["491285fd-0196-402c-9b7f-4660fdc1c22aX0","491285fd-0196-402c-9b7f-4660fdc1c22aX1"],"location":{"min":0,"max":46},"text":"count(kql=\'response.keyword >= 500\') / count()"}},"references":["491285fd-0196-402c-9b7f-4660fdc1c22aX0","491285fd-0196-402c-9b7f-4660fdc1c22aX1"],"customLabel":true},"491285fd-0196-402c-9b7f-4660fdc1c22a":{"label":"HTTP 5xx","dataType":"number","operationType":"formula","isBucketed":false,"scale":"ratio","params":{"formula":"count(kql=\'response.keyword >= 500\') / count()","isFormulaBroken":false,"format":{"id":"percent","params":{"decimals":1}}},"references":["491285fd-0196-402c-9b7f-4660fdc1c22aX2"],"customLabel":true}},"columnOrder":["42783ad7-dbcf-4310-bc06-f21f4eaaac96","f7835375-4d5b-4839-95ea-41928192a319","791d5a5b-a7ba-4e9e-b533-51b33c7d7747","07fc84ca-4147-4ba9-879e-d1b4e086e1da","491285fd-0196-402c-9b7f-4660fdc1c22a","491285fd-0196-402c-9b7f-4660fdc1c22aX0","491285fd-0196-402c-9b7f-4660fdc1c22aX1","491285fd-0196-402c-9b7f-4660fdc1c22aX2","07fc84ca-4147-4ba9-879e-d1b4e086e1daX0","07fc84ca-4147-4ba9-879e-d1b4e086e1daX1","07fc84ca-4147-4ba9-879e-d1b4e086e1daX2","611e3509-e834-4fdd-b573-44e959e95d27","9f79ecca-123f-4098-a658-6b0e998da003"],"incompleteColumns":{}}}}},"visualization":{"layerId":"c35dc8ee-50d1-4ef7-8b4b-9c21a7e7d3b0","columns":[{"columnId":"42783ad7-dbcf-4310-bc06-f21f4eaaac96","width":650.6666666666666},{"columnId":"f7835375-4d5b-4839-95ea-41928192a319"},{"columnId":"491285fd-0196-402c-9b7f-4660fdc1c22a","isTransposed":false,"width":81.66666666666669,"colorMode":"cell","palette":{"name":"custom","type":"palette","params":{"steps":5,"stops":[{"color":"#fbddd6","stop":0.1},{"color":"#CC5642","stop":1}],"rangeType":"number","name":"custom","colorStops":[{"color":"#fbddd6","stop":0.05},{"color":"#CC5642","stop":0.1}],"rangeMin":0.05,"rangeMax":0.1}}},{"columnId":"07fc84ca-4147-4ba9-879e-d1b4e086e1da","isTransposed":false,"colorMode":"cell","palette":{"name":"custom","type":"palette","params":{"steps":5,"stops":[{"color":"#fbddd6","stop":0.1},{"color":"#cc5642","stop":1.1}],"name":"custom","colorStops":[{"color":"#fbddd6","stop":0.05},{"color":"#cc5642","stop":0.1}],"rangeType":"number","rangeMin":0.05,"rangeMax":0.1}}},{"columnId":"791d5a5b-a7ba-4e9e-b533-51b33c7d7747","isTransposed":false},{"columnId":"611e3509-e834-4fdd-b573-44e959e95d27","isTransposed":false},{"columnId":"9f79ecca-123f-4098-a658-6b0e998da003","isTransposed":false}],"sorting":{"columnId":"491285fd-0196-402c-9b7f-4660fdc1c22a","direction":"desc"}},"query":{"query":"","language":"kuery"},"filters":[]},"references":[{"type":"index-pattern","id":"90943e30-9a47-11e8-b64d-95841ca0b247","name":"indexpattern-datasource-current-indexpattern"},{"type":"index-pattern","id":"90943e30-9a47-11e8-b64d-95841ca0b247","name":"indexpattern-datasource-layer-c35dc8ee-50d1-4ef7-8b4b-9c21a7e7d3b0"}]},"enhancements":{"dynamicActions":{"events":[]}},"hidePanelTitles":false},"title":"[Logs] Errors by host"},{"version":"8.0.0","type":"lens","gridData":{"x":24,"y":52,"w":24,"h":13,"i":"cbca842c-b9fa-4523-9ce0-14e350866e33"},"panelIndex":"cbca842c-b9fa-4523-9ce0-14e350866e33","embeddableConfig":{"hidePanelTitles":false,"enhancements":{}},"title":"[Logs] Bytes distribution","panelRefName":"panel_cbca842c-b9fa-4523-9ce0-14e350866e33"}]',
      optionsJSON: '{"hidePanelTitles":false,"useMargins":true}',
      version: 2,
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
  {
    id: '2f360f30-ea74-11eb-b4c6-3d2afc1cb389',
    type: 'search',
    updated_at: '2021-07-21T22:37:09.415Z',
    version: '1',
    migrationVersion: {
      search: '7.9.3',
    },
    attributes: {
      title: i18n.translate('home.sampleData.logsSpec.discoverTitle', {
        defaultMessage: '[Logs] Visits',
      }),
      description: '',
      columns: ['response', 'url', 'clientip', 'machine.os', 'tags'],
      hits: 0,
      kibanaSavedObjectMeta: {
        searchSourceJSON:
          '{"query":{"query":"","language":"kuery"},"filter":[],"indexRefName":"kibanaSavedObjectMeta.searchSourceJSON.index"}',
      },
      sort: [['timestamp', 'desc']],
      version: 1,
    },
    references: [
      {
        id: '90943e30-9a47-11e8-b64d-95841ca0b247',
        name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
        type: 'index-pattern',
      },
    ],
  },
];
