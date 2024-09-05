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
    id: '571aaf70-4c88-11e8-b3d7-01146121b73d',
    type: 'search',
    updated_at: '2021-07-01T20:41:40.379Z',
    version: '1',
    coreMigrationVersion: '8.8.0',
    typeMigrationVersion: '7.9.3',
    managed: false,
    attributes: {
      title: i18n.translate('home.sampleData.flightsSpec.flightLogTitle', {
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
          '{"highlightAll":true,"version":true,"query":{"language":"kuery","query":""},"filter":[],"indexRefName":"kibanaSavedObjectMeta.searchSourceJSON.index"}',
      },
    },
    references: [
      {
        id: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
        name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
        type: 'index-pattern',
      },
    ],
  },
  {
    id: 'ed78a660-53a0-11e8-acbd-0be0ad9d822b',
    type: 'visualization',
    updated_at: '2021-07-07T01:36:42.568Z',
    version: '4',
    attributes: {
      title: i18n.translate('home.sampleData.flightsSpec.airportConnectionsTitle', {
        defaultMessage: '[Flights] Airport Connections (Hover Over Airport)',
      }),
      visState:
        '{"title":"[Flights] Airport Connections (Hover Over Airport)","type":"vega","aggs":[],"params":{"spec":"{\\n  $schema: https://vega.github.io/schema/vega/v5.json\\n  config: {\\n    kibana: {type: \\"map\\", latitude: 25, longitude: -70, zoom: 2}\\n  }\\n  data: [\\n    {\\n      name: table\\n      url: {\\n        index: kibana_sample_data_flights\\n        %context%: true\\n        // Uncomment to enable time filtering\\n        // %timefield%: timestamp\\n        body: {\\n          size: 0\\n          aggs: {\\n            origins: {\\n              terms: {field: \\"OriginAirportID\\", size: 10000}\\n              aggs: {\\n                originLocation: {\\n                  top_hits: {\\n                    size: 1\\n                    _source: {\\n                      includes: [\\"OriginLocation\\", \\"Origin\\"]\\n                    }\\n                  }\\n                }\\n                distinations: {\\n                  terms: {field: \\"DestAirportID\\", size: 10000}\\n                  aggs: {\\n                    destLocation: {\\n                      top_hits: {\\n                        size: 1\\n                        _source: {\\n                          includes: [\\"DestLocation\\"]\\n                        }\\n                      }\\n                    }\\n                  }\\n                }\\n              }\\n            }\\n          }\\n        }\\n      }\\n      format: {property: \\"aggregations.origins.buckets\\"}\\n      transform: [\\n        {\\n          type: geopoint\\n          projection: projection\\n          fields: [\\n            originLocation.hits.hits[0]._source.OriginLocation.lon\\n            originLocation.hits.hits[0]._source.OriginLocation.lat\\n          ]\\n        }\\n      ]\\n    }\\n    {\\n      name: selectedDatum\\n      on: [\\n        {trigger: \\"!selected\\", remove: true}\\n        {trigger: \\"selected\\", insert: \\"selected\\"}\\n      ]\\n    }\\n  ]\\n  signals: [\\n    {\\n      name: selected\\n      value: null\\n      on: [\\n        {events: \\"@airport:mouseover\\", update: \\"datum\\"}\\n        {events: \\"@airport:mouseout\\", update: \\"null\\"}\\n      ]\\n    }\\n  ]\\n  scales: [\\n    {\\n      name: airportSize\\n      type: linear\\n      domain: {data: \\"table\\", field: \\"doc_count\\"}\\n      range: [\\n        {signal: \\"zoom*zoom*2+1\\"}\\n        {signal: \\"zoom*zoom*20+1\\"}\\n      ]\\n    }\\n  ]\\n  marks: [\\n    {\\n      type: group\\n      from: {\\n        facet: {\\n          name: facetedDatum\\n          data: selectedDatum\\n          field: distinations.buckets\\n        }\\n      }\\n      data: [\\n        {\\n          name: facetDatumElems\\n          source: facetedDatum\\n          transform: [\\n            {\\n              type: geopoint\\n              projection: projection\\n              fields: [\\n                destLocation.hits.hits[0]._source.DestLocation.lon\\n                destLocation.hits.hits[0]._source.DestLocation.lat\\n              ]\\n            }\\n            {type: \\"formula\\", expr: \\"{x:parent.x, y:parent.y}\\", as: \\"source\\"}\\n            {type: \\"formula\\", expr: \\"{x:datum.x, y:datum.y}\\", as: \\"target\\"}\\n            {type: \\"linkpath\\", shape: \\"diagonal\\"}\\n          ]\\n        }\\n      ]\\n      scales: [\\n        {\\n          name: lineThickness\\n          type: log\\n          clamp: true\\n          range: [1, 8]\\n        }\\n        {\\n          name: lineOpacity\\n          type: log\\n          clamp: true\\n          range: [0.2, 0.8]\\n        }\\n      ]\\n      marks: [\\n        {\\n          from: {data: \\"facetDatumElems\\"}\\n          type: path\\n          interactive: false\\n          encode: {\\n            update: {\\n              path: {field: \\"path\\"}\\n              stroke: {value: \\"black\\"}\\n              strokeWidth: {scale: \\"lineThickness\\", field: \\"doc_count\\"}\\n              strokeOpacity: {scale: \\"lineOpacity\\", field: \\"doc_count\\"}\\n            }\\n          }\\n        }\\n      ]\\n    }\\n    {\\n      name: airport\\n      type: symbol\\n      from: {data: \\"table\\"}\\n      encode: {\\n        update: {\\n          size: {scale: \\"airportSize\\", field: \\"doc_count\\"}\\n          xc: {signal: \\"datum.x\\"}\\n          yc: {signal: \\"datum.y\\"}\\n          tooltip: {\\n            signal: \\"{title: datum.originLocation.hits.hits[0]._source.Origin + \' (\' + datum.key + \')\', connnections: length(datum.distinations.buckets), flights: datum.doc_count}\\"\\n          }\\n        }\\n      }\\n    }\\n  ]\\n}"}}',
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
    id: '334084f0-52fd-11e8-a160-89cc2ad9e8e2',
    type: 'visualization',
    updated_at: '2018-05-09T15:49:03.736Z',
    version: '1',
    coreMigrationVersion: '8.8.0',
    typeMigrationVersion: '7.14.0',
    managed: false,
    attributes: {
      title: i18n.translate('home.sampleData.flightsSpec.departuresCountMapTitle', {
        defaultMessage: '[Flights] Departures Count Map',
      }),
      visState:
        '{"title":"[Flights] Departure Count Map","type":"vega","aggs":[],"params":{"spec":"{\\n  $schema: https://vega.github.io/schema/vega/v5.json\\n  config: {\\n    kibana: {type: \\"map\\", latitude: 25, longitude: -40, zoom: 3}\\n  }\\n  data: [\\n    {\\n      name: table\\n      url: {\\n        index: kibana_sample_data_flights\\n        %context%: true\\n        %timefield%: timestamp\\n        body: {\\n          size: 0\\n          aggs: {\\n            gridSplit: {\\n              geotile_grid: {field: \\"OriginLocation\\", precision: 4, size: 10000}\\n              aggs: {\\n                gridCentroid: {\\n                  geo_centroid: {\\n                    field: \\"OriginLocation\\"\\n                  }\\n                }\\n              }\\n            }\\n          }\\n        }\\n      }\\n      format: {property: \\"aggregations.gridSplit.buckets\\"}\\n      transform: [\\n        {\\n          type: geopoint\\n          projection: projection\\n          fields: [\\n            gridCentroid.location.lon\\n            gridCentroid.location.lat\\n          ]\\n        }\\n      ]\\n    }\\n  ]\\n  scales: [\\n    {\\n      name: gridSize\\n      type: linear\\n      domain: {data: \\"table\\", field: \\"doc_count\\"}\\n      range: [\\n        50\\n        1000\\n      ]\\n    }\\n  ]\\n  marks: [\\n    {\\n      name: gridMarker\\n      type: symbol\\n      from: {data: \\"table\\"}\\n      encode: {\\n        update: {\\n          size: {scale: \\"gridSize\\", field: \\"doc_count\\"}\\n          xc: {signal: \\"datum.x\\"}\\n          yc: {signal: \\"datum.y\\"}\\n          tooltip: {\\n            signal: \\"{flights: datum.doc_count}\\"\\n          }\\n        }\\n      }\\n    }\\n  ]\\n}"}}',
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
        id: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
        name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
        type: 'index-pattern',
      },
    ],
  },
  {
    id: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
    type: 'index-pattern',
    updated_at: '2018-05-09T15:49:03.736Z',
    version: '1',
    attributes: {
      title: 'kibana_sample_data_flights',
      name: 'Kibana Sample Data Flights',
      timeFieldName: 'timestamp',
      fieldFormatMap:
        '{"hour_of_day":{"id":"number","params":{"pattern":"00"}},"AvgTicketPrice":{"id":"number","params":{"pattern":"$0,0.[00]"}}}',
      runtimeFieldMap:
        '{"hour_of_day":{"type":"long","script":{"source":"emit(doc[\'timestamp\'].value.getHour());"}}}',
    },
    references: [],
  },
  {
    id: '7adfa750-4c81-11e8-b3d7-01146121b73d',
    type: 'dashboard',
    namespaces: ['default'],
    updated_at: '2023-03-24T10:44:51.432Z',
    created_at: '2023-03-24T10:44:51.432Z',
    version: 'WzI2NCwxXQ==',
    attributes: {
      controlGroupInput: {
        controlStyle: 'oneLine',
        chainingSystem: 'HIERARCHICAL',
        panelsJSON:
          '{"85b632c8-3b7b-408d-8223-b0caccf75bd3":{"order":0,"width":"small","grow":true,"type":"optionsListControl","explicitInput":{"title":"Origin City","fieldName":"OriginCityName","id":"85b632c8-3b7b-408d-8223-b0caccf75bd3","selectedOptions":[],"enhancements":{}}},"d4dc9d2b-5850-402a-921d-8a2cd0107156":{"order":1,"width":"small","grow":true,"type":"optionsListControl","explicitInput":{"title":"Destination City","fieldName":"DestCityName","id":"d4dc9d2b-5850-402a-921d-8a2cd0107156","enhancements":{}}},"bee4a16a-f5c1-40b2-887e-db1b9ad9e15f":{"order":2,"width":"small","grow":true,"type":"rangeSliderControl","explicitInput":{"title":"Average Ticket Price","fieldName":"AvgTicketPrice","id":"bee4a16a-f5c1-40b2-887e-db1b9ad9e15f","enhancements":{}}}}',
        ignoreParentSettingsJSON:
          '{"ignoreFilters":false,"ignoreQuery":false,"ignoreTimerange":false,"ignoreValidations":false}',
      },
      kibanaSavedObjectMeta: {
        searchSourceJSON: '{"query":{"language":"kuery","query":""},"filter":[]}',
      },
      description:
        'Analyze mock flight data for ES-Air, Logstash Airways, Kibana Airlines and JetBeats',
      refreshInterval: {
        pause: true,
        value: 60000,
      },
      timeRestore: true,
      optionsJSON:
        '{"useMargins":true,"syncColors":false,"syncCursor":true,"syncTooltips":false,"hidePanelTitles":false}',
      panelsJSON:
        '[{"version":"8.8.0","type":"search","gridData":{"x":0,"y":69,"w":48,"h":15,"i":"4"},"panelIndex":"4","embeddableConfig":{"enhancements":{}},"panelRefName":"panel_4"},{"version":"8.8.0","type":"lens","gridData":{"x":0,"y":16,"w":24,"h":9,"i":"7"},"panelIndex":"7","embeddableConfig":{"attributes":{"title":"[Flights] Delays & Cancellations (converted)","visualizationType":"lnsXY","type":"lens","references":[{"type":"index-pattern","id":"d3d7af60-4c81-11e8-b3d7-01146121b73d","name":"indexpattern-datasource-layer-dc8cf715-b56b-4dd7-a624-7c3ef9e2f2ce"},{"type":"index-pattern","id":"d3d7af60-4c81-11e8-b3d7-01146121b73d","name":"xy-visualization-layer-10fed425-accd-411b-a773-ee825bc3945b"}],"state":{"visualization":{"legend":{"isVisible":false,"showSingleSeries":false,"position":"bottom","shouldTruncate":true,"maxLines":1},"valueLabels":"hide","fittingFunction":"None","fillOpacity":0.5,"yLeftExtent":{"upperBound":1,"mode":"custom"},"yRightExtent":{"mode":"full"},"yLeftScale":"linear","yRightScale":"linear","axisTitlesVisibilitySettings":{"x":true,"yLeft":true,"yRight":true},"tickLabelsVisibilitySettings":{"x":true,"yLeft":true,"yRight":true},"labelsOrientation":{"x":0,"yLeft":0,"yRight":0},"gridlinesVisibilitySettings":{"x":true,"yLeft":true,"yRight":true},"preferredSeriesType":"bar_stacked","layers":[{"seriesType":"area","layerType":"data","layerId":"dc8cf715-b56b-4dd7-a624-7c3ef9e2f2ce","accessors":["b9d6187b-8a7e-4c49-bffd-7a60cc075a4a"],"yConfig":[{"forAccessor":"b9d6187b-8a7e-4c49-bffd-7a60cc075a4a","color":"rgba(0,156,224,1)","axisMode":"left"}],"xAccessor":"6944431b-f90a-4dab-a282-0961cb97edd1","palette":{"name":"default","type":"palette"}},{"layerId":"10fed425-accd-411b-a773-ee825bc3945b","layerType":"annotations","ignoreGlobalFilters":true,"annotations":[{"type":"query","id":"53b7dff0-4c89-11e8-a66a-6989ad5a0a39","label":"Event","key":{"type":"point_in_time"},"timeField":"timestamp","color":"#0062B1","icon":"alert","filter":{"type":"kibana_query","query":"FlightDelay:true AND Cancelled:true","language":"lucene"},"extraFields":["FlightDelay","Cancelled","Carrier"]}]}]},"query":{"query":"","language":"kuery"},"filters":[],"datasourceStates":{"formBased":{"layers":{"dc8cf715-b56b-4dd7-a624-7c3ef9e2f2ce":{"columns":{"6944431b-f90a-4dab-a282-0961cb97edd1":{"label":"timestamp","dataType":"date","operationType":"date_histogram","sourceField":"timestamp","isBucketed":true,"scale":"interval","params":{"interval":"auto","includeEmptyRows":true,"dropPartials":false}},"b9d6187b-8a7e-4c49-bffd-7a60cc075a4aX0":{"label":"Part of count(lucene=\'FlightDelay:true\') / count(kql=\'*\')","dataType":"number","operationType":"count","isBucketed":false,"scale":"ratio","sourceField":"___records___","filter":{"query":"FlightDelay:true","language":"lucene"},"params":{"emptyAsNull":false},"customLabel":true},"b9d6187b-8a7e-4c49-bffd-7a60cc075a4aX1":{"label":"Part of count(lucene=\'FlightDelay:true\') / count(kql=\'*\')","dataType":"number","operationType":"count","isBucketed":false,"scale":"ratio","sourceField":"___records___","filter":{"query":"*","language":"kuery"},"params":{"emptyAsNull":false},"customLabel":true},"b9d6187b-8a7e-4c49-bffd-7a60cc075a4aX2":{"label":"Part of count(lucene=\'FlightDelay:true\') / count(kql=\'*\')","dataType":"number","operationType":"math","isBucketed":false,"scale":"ratio","params":{"tinymathAst":{"type":"function","name":"divide","args":["b9d6187b-8a7e-4c49-bffd-7a60cc075a4aX0","b9d6187b-8a7e-4c49-bffd-7a60cc075a4aX1"],"location":{"min":0,"max":49},"text":"count(lucene=\'FlightDelay:true\') / count(kql=\'*\')"}},"references":["b9d6187b-8a7e-4c49-bffd-7a60cc075a4aX0","b9d6187b-8a7e-4c49-bffd-7a60cc075a4aX1"],"customLabel":true},"b9d6187b-8a7e-4c49-bffd-7a60cc075a4a":{"label":"Percent Delays","dataType":"number","operationType":"formula","isBucketed":false,"scale":"ratio","params":{"format":{"id":"percent"},"formula":"count(lucene=\'FlightDelay:true\') / count(kql=\'*\')","isFormulaBroken":false},"references":["b9d6187b-8a7e-4c49-bffd-7a60cc075a4aX2"],"customLabel":true}},"columnOrder":["6944431b-f90a-4dab-a282-0961cb97edd1","b9d6187b-8a7e-4c49-bffd-7a60cc075a4aX0","b9d6187b-8a7e-4c49-bffd-7a60cc075a4aX1","b9d6187b-8a7e-4c49-bffd-7a60cc075a4aX2","b9d6187b-8a7e-4c49-bffd-7a60cc075a4a"],"incompleteColumns":{}}}},"textBased":{"layers":{}}},"internalReferences":[],"adHocDataViews":{}}},"enhancements":{},"hidePanelTitles":false},"title":"[Flights] Delays & Cancellations"},{"version":"8.8.0","type":"lens","gridData":{"x":0,"y":58,"w":24,"h":11,"i":"10"},"panelIndex":"10","embeddableConfig":{"attributes":{"title":"[Flights] Delay Buckets (converted)","visualizationType":"lnsXY","type":"lens","references":[{"type":"index-pattern","id":"d3d7af60-4c81-11e8-b3d7-01146121b73d","name":"indexpattern-datasource-layer-247b176d-e81d-47dc-bbd1-4de85d098961"},{"type":"index-pattern","name":"c61f29fc-1ff3-4d46-a6c2-bde8a5b97f4a","id":"d3d7af60-4c81-11e8-b3d7-01146121b73d"}],"state":{"visualization":{"legend":{"isVisible":false,"position":"right","legendSize":"auto","shouldTruncate":true,"maxLines":1,"showSingleSeries":true},"valueLabels":"hide","curveType":"LINEAR","yTitle":"Count","yLeftExtent":{"mode":"full","enforce":true},"yLeftScale":"linear","yRightScale":"linear","axisTitlesVisibilitySettings":{"x":true,"yLeft":true,"yRight":true},"tickLabelsVisibilitySettings":{"x":true,"yLeft":true,"yRight":true},"labelsOrientation":{"x":0,"yLeft":0,"yRight":-90},"gridlinesVisibilitySettings":{"x":false,"yLeft":false,"yRight":true},"preferredSeriesType":"bar_stacked","layers":[{"layerId":"247b176d-e81d-47dc-bbd1-4de85d098961","accessors":["c84f9fa9-e2a1-4845-8fcf-f5a34f5f92da"],"layerType":"data","seriesType":"bar_stacked","xAccessor":"c7936be7-e59b-424e-a912-69ba820d8e24","simpleView":false,"palette":{"type":"palette","name":"default"},"yConfig":[{"forAccessor":"c84f9fa9-e2a1-4845-8fcf-f5a34f5f92da","axisMode":"left","color":"#1F78C1"}],"xScaleType":"linear","isHistogram":true}]},"query":{"query":"","language":"kuery"},"filters":[{"meta":{"negate":true,"disabled":false,"alias":null,"type":"phrase","key":"FlightDelayMin","value":"0","params":{"query":0,"type":"phrase"},"index":"c61f29fc-1ff3-4d46-a6c2-bde8a5b97f4a"},"query":{"match":{"FlightDelayMin":{"query":0,"type":"phrase"}}},"$state":{"store":"appState"}}],"datasourceStates":{"formBased":{"layers":{"247b176d-e81d-47dc-bbd1-4de85d098961":{"columns":{"c7936be7-e59b-424e-a912-69ba820d8e24":{"label":"Flight Delay Minutes","dataType":"number","operationType":"range","sourceField":"FlightDelayMin","isBucketed":true,"scale":"interval","params":{"includeEmptyRows":false,"type":"histogram","ranges":[{"from":0,"to":1000,"label":""}],"maxBars":"auto"},"customLabel":true},"c84f9fa9-e2a1-4845-8fcf-f5a34f5f92da":{"label":"Count","dataType":"number","operationType":"count","isBucketed":false,"scale":"ratio","sourceField":"___records___","params":{"emptyAsNull":true},"customLabel":true}},"columnOrder":["c7936be7-e59b-424e-a912-69ba820d8e24","c84f9fa9-e2a1-4845-8fcf-f5a34f5f92da"],"incompleteColumns":{}}}},"textBased":{"layers":{}}},"internalReferences":[],"adHocDataViews":{}}},"enhancements":{},"hidePanelTitles":false},"title":"[Flights] Delay Buckets"},{"version":"8.8.0","type":"map","gridData":{"x":0,"y":36,"w":24,"h":22,"i":"23"},"panelIndex":"23","embeddableConfig":{"isLayerTOCOpen":true,"hiddenLayers":[],"mapCenter":{"lat":48.72307,"lon":-115.18171,"zoom":4.28},"openTOCDetails":[],"enhancements":{}},"panelRefName":"panel_23"},{"version":"8.8.0","type":"visualization","gridData":{"x":24,"y":36,"w":24,"h":22,"i":"31"},"panelIndex":"31","embeddableConfig":{"enhancements":{}},"panelRefName":"panel_31"},{"version":"8.8.0","type":"visualization","gridData":{"x":0,"y":0,"w":24,"h":8,"i":"6afc61f7-e2d5-45a3-9e7a-281160ad3eb9"},"panelIndex":"6afc61f7-e2d5-45a3-9e7a-281160ad3eb9","embeddableConfig":{"savedVis":{"title":"[Flights] Markdown Instructions","description":"","type":"markdown","params":{"fontSize":10,"openLinksInNewTab":true,"markdown":"## Sample Flight data\\nThis dashboard contains sample data for you to play with. You can view it, search it, and interact with the visualizations. For more information about Kibana, check our [docs](https://www.elastic.co/guide/en/kibana/current/index.html)."},"uiState":{},"data":{"aggs":[],"searchSource":{}}},"hidePanelTitles":true,"enhancements":{}}},{"version":"8.8.0","type":"lens","gridData":{"x":24,"y":0,"w":8,"h":8,"i":"392b4936-f753-47bc-a98d-a4e41a0a4cd4"},"panelIndex":"392b4936-f753-47bc-a98d-a4e41a0a4cd4","embeddableConfig":{"enhancements":{},"attributes":{"title":"[Flights] Total Flights","description":"","visualizationType":"lnsMetric","type":"lens","references":[{"type":"index-pattern","id":"d3d7af60-4c81-11e8-b3d7-01146121b73d","name":"indexpattern-datasource-layer-8fa993db-c147-4954-adf7-4ff264d42576"}],"state":{"visualization":{"layerId":"8fa993db-c147-4954-adf7-4ff264d42576","layerType":"data","metricAccessor":"81124c45-6ab6-42f4-8859-495d55eb8065"},"query":{"query":"","language":"kuery"},"filters":[],"datasourceStates":{"formBased":{"layers":{"8fa993db-c147-4954-adf7-4ff264d42576":{"columns":{"81124c45-6ab6-42f4-8859-495d55eb8065":{"label":"Total flights","dataType":"number","operationType":"count","isBucketed":false,"scale":"ratio","sourceField":"___records___","customLabel":true}},"columnOrder":["81124c45-6ab6-42f4-8859-495d55eb8065"],"incompleteColumns":{}}}}},"internalReferences":[],"adHocDataViews":{}}},"hidePanelTitles":true}},{"version":"8.8.0","type":"lens","gridData":{"x":32,"y":0,"w":8,"h":4,"i":"9271deff-5a61-4665-83fc-f9fdc6bf0c0b"},"panelIndex":"9271deff-5a61-4665-83fc-f9fdc6bf0c0b","embeddableConfig":{"attributes":{"title":"","visualizationType":"lnsMetric","type":"lens","references":[{"type":"index-pattern","id":"d3d7af60-4c81-11e8-b3d7-01146121b73d","name":"indexpattern-datasource-layer-b4712d43-1e84-4f5b-878d-8e38ba748317"}],"state":{"visualization":{"layerId":"b4712d43-1e84-4f5b-878d-8e38ba748317","layerType":"data","metricAccessor":"7e8fe9b1-f45c-4f3d-9561-30febcd357ec"},"query":{"query":"","language":"kuery"},"filters":[],"datasourceStates":{"formBased":{"layers":{"b4712d43-1e84-4f5b-878d-8e38ba748317":{"columns":{"7e8fe9b1-f45c-4f3d-9561-30febcd357ec":{"label":"Delayed","dataType":"number","operationType":"formula","isBucketed":false,"scale":"ratio","params":{"formula":"count(kql=\'FlightDelay : true\') / count()","isFormulaBroken":false,"format":{"id":"percent","params":{"decimals":1}}},"references":["7e8fe9b1-f45c-4f3d-9561-30febcd357ecX2"],"customLabel":true},"7e8fe9b1-f45c-4f3d-9561-30febcd357ecX0":{"label":"Part of count(kql=\'FlightDelay : true\') / count()","dataType":"number","operationType":"count","isBucketed":false,"scale":"ratio","sourceField":"___records___","filter":{"query":"FlightDelay : true","language":"kuery"},"customLabel":true},"7e8fe9b1-f45c-4f3d-9561-30febcd357ecX1":{"label":"Part of count(kql=\'FlightDelay : true\') / count()","dataType":"number","operationType":"count","isBucketed":false,"scale":"ratio","sourceField":"___records___","customLabel":true},"7e8fe9b1-f45c-4f3d-9561-30febcd357ecX2":{"label":"Part of count(kql=\'FlightDelay : true\') / count()","dataType":"number","operationType":"math","isBucketed":false,"scale":"ratio","params":{"tinymathAst":{"type":"function","name":"divide","args":["7e8fe9b1-f45c-4f3d-9561-30febcd357ecX0","7e8fe9b1-f45c-4f3d-9561-30febcd357ecX1"],"location":{"min":0,"max":41},"text":"count(kql=\'FlightDelay : true\') / count()"}},"references":["7e8fe9b1-f45c-4f3d-9561-30febcd357ecX0","7e8fe9b1-f45c-4f3d-9561-30febcd357ecX1"],"customLabel":true}},"columnOrder":["7e8fe9b1-f45c-4f3d-9561-30febcd357ec","7e8fe9b1-f45c-4f3d-9561-30febcd357ecX0","7e8fe9b1-f45c-4f3d-9561-30febcd357ecX1","7e8fe9b1-f45c-4f3d-9561-30febcd357ecX2"],"incompleteColumns":{}}}}},"internalReferences":[],"adHocDataViews":{}}},"enhancements":{}}},{"version":"8.8.0","type":"lens","gridData":{"x":40,"y":0,"w":8,"h":4,"i":"aa591c29-1a31-4ee1-a71d-b829c06fd162"},"panelIndex":"aa591c29-1a31-4ee1-a71d-b829c06fd162","embeddableConfig":{"attributes":{"title":"","visualizationType":"lnsMetric","type":"lens","references":[{"type":"index-pattern","id":"d3d7af60-4c81-11e8-b3d7-01146121b73d","name":"indexpattern-datasource-layer-b4712d43-1e84-4f5b-878d-8e38ba748317"},{"type":"index-pattern","name":"c804c161-375f-4d52-a1cc-2e98b966957d","id":"d3d7af60-4c81-11e8-b3d7-01146121b73d"}],"state":{"visualization":{"layerId":"b4712d43-1e84-4f5b-878d-8e38ba748317","layerType":"data","metricAccessor":"c7851241-5526-499a-960b-357af8c2ce5b"},"query":{"query":"","language":"kuery"},"filters":[{"meta":{"alias":null,"negate":false,"disabled":false,"type":"phrase","key":"FlightDelay","params":{"query":true},"index":"c804c161-375f-4d52-a1cc-2e98b966957d"},"query":{"match_phrase":{"FlightDelay":true}},"$state":{"store":"appState"}}],"datasourceStates":{"formBased":{"layers":{"b4712d43-1e84-4f5b-878d-8e38ba748317":{"columns":{"c7851241-5526-499a-960b-357af8c2ce5b":{"label":"Delayed vs 1 week earlier","dataType":"number","operationType":"formula","isBucketed":false,"scale":"ratio","params":{"formula":"count() / count(shift=\'1w\') - 1","isFormulaBroken":false,"format":{"id":"percent","params":{"decimals":1}}},"references":["c7851241-5526-499a-960b-357af8c2ce5bX2"],"customLabel":true},"c7851241-5526-499a-960b-357af8c2ce5bX2":{"label":"Part of Delayed","dataType":"number","operationType":"math","isBucketed":false,"scale":"ratio","params":{"tinymathAst":{"type":"function","name":"subtract","args":[{"type":"function","name":"divide","args":["c7851241-5526-499a-960b-357af8c2ce5bX0","c7851241-5526-499a-960b-357af8c2ce5bX1"],"location":{"min":0,"max":28},"text":"count() / count(shift=\'1w\') "},1],"location":{"min":0,"max":31},"text":"count() / count(shift=\'1w\') - 1"}},"references":["c7851241-5526-499a-960b-357af8c2ce5bX0","c7851241-5526-499a-960b-357af8c2ce5bX1"],"customLabel":true},"c7851241-5526-499a-960b-357af8c2ce5bX0":{"label":"Part of Delayed","dataType":"number","operationType":"count","isBucketed":false,"scale":"ratio","sourceField":"___records___","customLabel":true},"c7851241-5526-499a-960b-357af8c2ce5bX1":{"label":"Part of Delayed","dataType":"number","operationType":"count","isBucketed":false,"scale":"ratio","sourceField":"___records___","timeShift":"1w","customLabel":true}},"columnOrder":["c7851241-5526-499a-960b-357af8c2ce5b","c7851241-5526-499a-960b-357af8c2ce5bX2","c7851241-5526-499a-960b-357af8c2ce5bX0","c7851241-5526-499a-960b-357af8c2ce5bX1"],"incompleteColumns":{}}}}},"internalReferences":[],"adHocDataViews":{}}},"enhancements":{}}},{"version":"8.8.0","type":"lens","gridData":{"x":32,"y":4,"w":8,"h":4,"i":"b766e3b8-4544-46ed-99e6-9ecc4847e2a2"},"panelIndex":"b766e3b8-4544-46ed-99e6-9ecc4847e2a2","embeddableConfig":{"attributes":{"title":"","visualizationType":"lnsMetric","type":"lens","references":[{"type":"index-pattern","id":"d3d7af60-4c81-11e8-b3d7-01146121b73d","name":"indexpattern-datasource-layer-b4712d43-1e84-4f5b-878d-8e38ba748317"}],"state":{"visualization":{"layerId":"b4712d43-1e84-4f5b-878d-8e38ba748317","layerType":"data","metricAccessor":"7e8fe9b1-f45c-4f3d-9561-30febcd357ec"},"query":{"query":"","language":"kuery"},"filters":[],"datasourceStates":{"formBased":{"layers":{"b4712d43-1e84-4f5b-878d-8e38ba748317":{"columns":{"7e8fe9b1-f45c-4f3d-9561-30febcd357ec":{"label":"Cancelled","dataType":"number","operationType":"formula","isBucketed":false,"scale":"ratio","params":{"formula":"count(kql=\'Cancelled : true\') / count()","isFormulaBroken":false,"format":{"id":"percent","params":{"decimals":1}}},"references":["7e8fe9b1-f45c-4f3d-9561-30febcd357ecX2"],"customLabel":true},"7e8fe9b1-f45c-4f3d-9561-30febcd357ecX0":{"label":"Part of Cancelled","dataType":"number","operationType":"count","isBucketed":false,"scale":"ratio","sourceField":"___records___","filter":{"query":"Cancelled : true","language":"kuery"},"customLabel":true},"7e8fe9b1-f45c-4f3d-9561-30febcd357ecX1":{"label":"Part of Cancelled","dataType":"number","operationType":"count","isBucketed":false,"scale":"ratio","sourceField":"___records___","customLabel":true},"7e8fe9b1-f45c-4f3d-9561-30febcd357ecX2":{"label":"Part of Cancelled","dataType":"number","operationType":"math","isBucketed":false,"scale":"ratio","params":{"tinymathAst":{"type":"function","name":"divide","args":["7e8fe9b1-f45c-4f3d-9561-30febcd357ecX0","7e8fe9b1-f45c-4f3d-9561-30febcd357ecX1"],"location":{"min":0,"max":39},"text":"count(kql=\'Cancelled : true\') / count()"}},"references":["7e8fe9b1-f45c-4f3d-9561-30febcd357ecX0","7e8fe9b1-f45c-4f3d-9561-30febcd357ecX1"],"customLabel":true}},"columnOrder":["7e8fe9b1-f45c-4f3d-9561-30febcd357ec","7e8fe9b1-f45c-4f3d-9561-30febcd357ecX0","7e8fe9b1-f45c-4f3d-9561-30febcd357ecX1","7e8fe9b1-f45c-4f3d-9561-30febcd357ecX2"],"incompleteColumns":{}}}}},"internalReferences":[],"adHocDataViews":{}}},"enhancements":{}}},{"version":"8.8.0","type":"lens","gridData":{"x":40,"y":4,"w":8,"h":4,"i":"2e33ade5-96e5-40b4-b460-493e5d4fa834"},"panelIndex":"2e33ade5-96e5-40b4-b460-493e5d4fa834","embeddableConfig":{"attributes":{"title":"","visualizationType":"lnsMetric","type":"lens","references":[{"type":"index-pattern","id":"d3d7af60-4c81-11e8-b3d7-01146121b73d","name":"indexpattern-datasource-layer-b4712d43-1e84-4f5b-878d-8e38ba748317"},{"type":"index-pattern","name":"14cea722-a629-4c69-a06d-94a4a4c9a718","id":"d3d7af60-4c81-11e8-b3d7-01146121b73d"}],"state":{"visualization":{"layerId":"b4712d43-1e84-4f5b-878d-8e38ba748317","layerType":"data","metricAccessor":"c7851241-5526-499a-960b-357af8c2ce5b"},"query":{"query":"","language":"kuery"},"filters":[{"meta":{"alias":null,"negate":false,"disabled":false,"type":"phrase","key":"Cancelled","params":{"query":true},"index":"14cea722-a629-4c69-a06d-94a4a4c9a718"},"query":{"match_phrase":{"Cancelled":true}},"$state":{"store":"appState"}}],"datasourceStates":{"formBased":{"layers":{"b4712d43-1e84-4f5b-878d-8e38ba748317":{"columns":{"c7851241-5526-499a-960b-357af8c2ce5b":{"label":"Cancelled vs 1 week earlier","dataType":"number","operationType":"formula","isBucketed":false,"scale":"ratio","params":{"formula":"count() / count(shift=\'1w\') - 1","isFormulaBroken":false,"format":{"id":"percent","params":{"decimals":1}}},"references":["c7851241-5526-499a-960b-357af8c2ce5bX2"],"customLabel":true},"c7851241-5526-499a-960b-357af8c2ce5bX2":{"label":"Part of Delayed vs 1 week earlier","dataType":"number","operationType":"math","isBucketed":false,"scale":"ratio","params":{"tinymathAst":{"type":"function","name":"subtract","args":[{"type":"function","name":"divide","args":["c7851241-5526-499a-960b-357af8c2ce5bX0","c7851241-5526-499a-960b-357af8c2ce5bX1"],"location":{"min":0,"max":28},"text":"count() / count(shift=\'1w\') "},1],"location":{"min":0,"max":31},"text":"count() / count(shift=\'1w\') - 1"}},"references":["c7851241-5526-499a-960b-357af8c2ce5bX0","c7851241-5526-499a-960b-357af8c2ce5bX1"],"customLabel":true},"c7851241-5526-499a-960b-357af8c2ce5bX0":{"label":"Part of Delayed vs 1 week earlier","dataType":"number","operationType":"count","isBucketed":false,"scale":"ratio","sourceField":"___records___","customLabel":true},"c7851241-5526-499a-960b-357af8c2ce5bX1":{"label":"Part of Delayed vs 1 week earlier","dataType":"number","operationType":"count","isBucketed":false,"scale":"ratio","sourceField":"___records___","timeShift":"1w","customLabel":true}},"columnOrder":["c7851241-5526-499a-960b-357af8c2ce5b","c7851241-5526-499a-960b-357af8c2ce5bX2","c7851241-5526-499a-960b-357af8c2ce5bX0","c7851241-5526-499a-960b-357af8c2ce5bX1"],"incompleteColumns":{}}}}},"internalReferences":[],"adHocDataViews":{}}},"enhancements":{}}},{"version":"8.8.0","type":"lens","gridData":{"x":0,"y":8,"w":24,"h":8,"i":"086ac2e9-dd16-4b45-92b8-1e43ff7e3f65"},"panelIndex":"086ac2e9-dd16-4b45-92b8-1e43ff7e3f65","embeddableConfig":{"attributes":{"title":"","type":"lens","visualizationType":"lnsXY","state":{"datasourceStates":{"formBased":{"layers":{"03c34665-471c-49c7-acf1-5a11f517421c":{"columns":{"a5b94e30-4e77-4b0a-9187-1d8b13de1456":{"label":"timestamp","dataType":"date","operationType":"date_histogram","sourceField":"timestamp","isBucketed":true,"scale":"interval","params":{"interval":"auto","includeEmptyRows":true}},"3e267327-7317-4310-aee3-320e0f7c1e70":{"label":"Count of records","dataType":"number","operationType":"count","isBucketed":false,"scale":"ratio","sourceField":"___records___"}},"columnOrder":["a5b94e30-4e77-4b0a-9187-1d8b13de1456","3e267327-7317-4310-aee3-320e0f7c1e70"],"incompleteColumns":{}}}}},"visualization":{"legend":{"isVisible":true,"position":"right","legendSize":"auto"},"valueLabels":"hide","fittingFunction":"None","yLeftExtent":{"mode":"full"},"yRightExtent":{"mode":"custom","lowerBound":0,"upperBound":1},"axisTitlesVisibilitySettings":{"x":false,"yLeft":false,"yRight":true},"tickLabelsVisibilitySettings":{"x":true,"yLeft":true,"yRight":true},"gridlinesVisibilitySettings":{"x":true,"yLeft":true,"yRight":true},"preferredSeriesType":"bar_stacked","layers":[{"layerId":"03c34665-471c-49c7-acf1-5a11f517421c","accessors":["3e267327-7317-4310-aee3-320e0f7c1e70"],"position":"top","seriesType":"bar_stacked","showGridlines":false,"xAccessor":"a5b94e30-4e77-4b0a-9187-1d8b13de1456","layerType":"data"}]},"query":{"query":"","language":"kuery"},"filters":[]},"references":[{"id":"d3d7af60-4c81-11e8-b3d7-01146121b73d","name":"indexpattern-datasource-current-indexpattern","type":"index-pattern"},{"id":"d3d7af60-4c81-11e8-b3d7-01146121b73d","name":"indexpattern-datasource-layer-03c34665-471c-49c7-acf1-5a11f517421c","type":"index-pattern"}]},"hidePanelTitles":false,"enhancements":{}},"title":"[Flights] Flight count"},{"version":"8.8.0","type":"lens","gridData":{"x":24,"y":8,"w":24,"h":28,"i":"fb86b32f-fb7a-45cf-9511-f366fef51bbd"},"panelIndex":"fb86b32f-fb7a-45cf-9511-f366fef51bbd","embeddableConfig":{"attributes":{"title":"Cities by delay, cancellation","type":"lens","visualizationType":"lnsDatatable","state":{"datasourceStates":{"formBased":{"layers":{"f26e8f7a-4118-4227-bea0-5c02d8b270f7":{"columns":{"3dd24cb4-45ef-4dd8-b22a-d7b802cb6da0":{"label":"Top values of OriginCityName","dataType":"string","operationType":"terms","scale":"ordinal","sourceField":"OriginCityName","isBucketed":true,"params":{"size":1000,"orderBy":{"type":"alphabetical","fallback":true},"orderDirection":"asc","otherBucket":true,"missingBucket":false}},"52f6f2e9-6242-4c44-be63-b799150e7e60X0":{"label":"Part of Delay %","dataType":"number","operationType":"count","isBucketed":false,"scale":"ratio","sourceField":"___records___","filter":{"query":"FlightDelay : true ","language":"kuery"},"customLabel":true},"52f6f2e9-6242-4c44-be63-b799150e7e60X1":{"label":"Part of Delay %","dataType":"number","operationType":"count","isBucketed":false,"scale":"ratio","sourceField":"___records___","customLabel":true},"52f6f2e9-6242-4c44-be63-b799150e7e60X2":{"label":"Part of Delay %","dataType":"number","operationType":"math","isBucketed":false,"scale":"ratio","params":{"tinymathAst":{"type":"function","name":"divide","args":["52f6f2e9-6242-4c44-be63-b799150e7e60X0","52f6f2e9-6242-4c44-be63-b799150e7e60X1"],"location":{"min":0,"max":42},"text":"count(kql=\'FlightDelay : true \') / count()"}},"references":["52f6f2e9-6242-4c44-be63-b799150e7e60X0","52f6f2e9-6242-4c44-be63-b799150e7e60X1"],"customLabel":true},"52f6f2e9-6242-4c44-be63-b799150e7e60":{"label":"Delay %","dataType":"number","operationType":"formula","isBucketed":false,"scale":"ratio","params":{"formula":"count(kql=\'FlightDelay : true \') / count()","isFormulaBroken":false,"format":{"id":"percent","params":{"decimals":0}}},"references":["52f6f2e9-6242-4c44-be63-b799150e7e60X2"],"customLabel":true},"7b9f3ece-9da3-4c27-b582-d3f8e8cc31d6X0":{"label":"Part of Cancel %","dataType":"number","operationType":"count","isBucketed":false,"scale":"ratio","sourceField":"___records___","filter":{"query":"Cancelled: true","language":"kuery"},"customLabel":true},"7b9f3ece-9da3-4c27-b582-d3f8e8cc31d6X1":{"label":"Part of Cancel %","dataType":"number","operationType":"count","isBucketed":false,"scale":"ratio","sourceField":"___records___","customLabel":true},"7b9f3ece-9da3-4c27-b582-d3f8e8cc31d6X2":{"label":"Part of Cancel %","dataType":"number","operationType":"math","isBucketed":false,"scale":"ratio","params":{"tinymathAst":{"type":"function","name":"divide","args":["7b9f3ece-9da3-4c27-b582-d3f8e8cc31d6X0","7b9f3ece-9da3-4c27-b582-d3f8e8cc31d6X1"],"location":{"min":0,"max":38},"text":"count(kql=\'Cancelled: true\') / count()"}},"references":["7b9f3ece-9da3-4c27-b582-d3f8e8cc31d6X0","7b9f3ece-9da3-4c27-b582-d3f8e8cc31d6X1"],"customLabel":true},"7b9f3ece-9da3-4c27-b582-d3f8e8cc31d6":{"label":"Cancel %","dataType":"number","operationType":"formula","isBucketed":false,"scale":"ratio","params":{"formula":"count(kql=\'Cancelled: true\') / count()","isFormulaBroken":false,"format":{"id":"percent","params":{"decimals":0}}},"references":["7b9f3ece-9da3-4c27-b582-d3f8e8cc31d6X2"],"customLabel":true}},"columnOrder":["3dd24cb4-45ef-4dd8-b22a-d7b802cb6da0","52f6f2e9-6242-4c44-be63-b799150e7e60","52f6f2e9-6242-4c44-be63-b799150e7e60X0","52f6f2e9-6242-4c44-be63-b799150e7e60X1","52f6f2e9-6242-4c44-be63-b799150e7e60X2","7b9f3ece-9da3-4c27-b582-d3f8e8cc31d6X0","7b9f3ece-9da3-4c27-b582-d3f8e8cc31d6X1","7b9f3ece-9da3-4c27-b582-d3f8e8cc31d6X2","7b9f3ece-9da3-4c27-b582-d3f8e8cc31d6"],"incompleteColumns":{}}}}},"visualization":{"columns":[{"isTransposed":false,"columnId":"3dd24cb4-45ef-4dd8-b22a-d7b802cb6da0","width":262.75},{"columnId":"52f6f2e9-6242-4c44-be63-b799150e7e60","isTransposed":false,"width":302.5,"colorMode":"cell","palette":{"name":"custom","type":"palette","params":{"steps":5,"stops":[{"color":"#f7e0b8","stop":0.6},{"color":"#e7664c","stop":1}],"name":"custom","colorStops":[{"color":"#f7e0b8","stop":0.2},{"color":"#e7664c","stop":0.6}],"rangeType":"number","rangeMin":0.2,"rangeMax":0.6}},"alignment":"center"},{"columnId":"7b9f3ece-9da3-4c27-b582-d3f8e8cc31d6","isTransposed":false,"alignment":"center","colorMode":"cell","palette":{"name":"custom","type":"palette","params":{"steps":5,"stops":[{"color":"#f7e0b8","stop":0.6},{"color":"#e7664c","stop":0.6666666666666666}],"rangeType":"number","name":"custom","colorStops":[{"color":"#f7e0b8","stop":0.2},{"color":"#e7664c","stop":0.6}],"rangeMin":0.2,"rangeMax":0.6}}}],"layerId":"f26e8f7a-4118-4227-bea0-5c02d8b270f7","sorting":{"columnId":"52f6f2e9-6242-4c44-be63-b799150e7e60","direction":"desc"},"layerType":"data","rowHeight":"single","rowHeightLines":1},"query":{"query":"","language":"kuery"},"filters":[]},"references":[{"id":"d3d7af60-4c81-11e8-b3d7-01146121b73d","name":"indexpattern-datasource-current-indexpattern","type":"index-pattern"},{"id":"d3d7af60-4c81-11e8-b3d7-01146121b73d","name":"indexpattern-datasource-layer-f26e8f7a-4118-4227-bea0-5c02d8b270f7","type":"index-pattern"}]},"enhancements":{},"hidePanelTitles":false},"title":"[Flights] Most delayed cities"},{"version":"8.8.0","type":"lens","gridData":{"x":0,"y":25,"w":24,"h":11,"i":"0cc42484-16f7-42ec-b38c-9bf8be69cde7"},"panelIndex":"0cc42484-16f7-42ec-b38c-9bf8be69cde7","embeddableConfig":{"attributes":{"title":"","type":"lens","visualizationType":"lnsXY","state":{"datasourceStates":{"formBased":{"layers":{"e80cc05e-c52a-4e5f-ac71-4b37274867f5":{"columns":{"caf7421e-93a3-439e-ab0a-fbdead93c21c":{"label":"Top values of FlightDelayType","dataType":"string","operationType":"terms","scale":"ordinal","sourceField":"FlightDelayType","isBucketed":true,"params":{"size":10,"orderBy":{"type":"column","columnId":"0233d302-ec81-4fbe-96cb-7fac84cf035c"},"orderDirection":"desc","otherBucket":true,"missingBucket":false}},"13ec79e3-9d73-4536-9056-3d92802bb30a":{"label":"timestamp","dataType":"date","operationType":"date_histogram","sourceField":"timestamp","isBucketed":true,"scale":"interval","params":{"interval":"auto","includeEmptyRows":true}},"0233d302-ec81-4fbe-96cb-7fac84cf035c":{"label":"Count of records","dataType":"number","operationType":"count","isBucketed":false,"scale":"ratio","sourceField":"___records___"}},"columnOrder":["caf7421e-93a3-439e-ab0a-fbdead93c21c","13ec79e3-9d73-4536-9056-3d92802bb30a","0233d302-ec81-4fbe-96cb-7fac84cf035c"],"incompleteColumns":{}}}}},"visualization":{"legend":{"isVisible":true,"position":"bottom","legendSize":"auto"},"valueLabels":"hide","fittingFunction":"None","yLeftExtent":{"mode":"full"},"yRightExtent":{"mode":"full"},"axisTitlesVisibilitySettings":{"x":true,"yLeft":false,"yRight":true},"tickLabelsVisibilitySettings":{"x":true,"yLeft":true,"yRight":true},"gridlinesVisibilitySettings":{"x":true,"yLeft":true,"yRight":true},"preferredSeriesType":"bar_percentage_stacked","layers":[{"layerId":"e80cc05e-c52a-4e5f-ac71-4b37274867f5","accessors":["0233d302-ec81-4fbe-96cb-7fac84cf035c"],"position":"top","seriesType":"bar_percentage_stacked","showGridlines":false,"palette":{"type":"palette","name":"cool"},"xAccessor":"13ec79e3-9d73-4536-9056-3d92802bb30a","splitAccessor":"caf7421e-93a3-439e-ab0a-fbdead93c21c","layerType":"data"}]},"query":{"query":"","language":"kuery"},"filters":[]},"references":[{"id":"d3d7af60-4c81-11e8-b3d7-01146121b73d","name":"indexpattern-datasource-current-indexpattern","type":"index-pattern"},{"id":"d3d7af60-4c81-11e8-b3d7-01146121b73d","name":"indexpattern-datasource-layer-e80cc05e-c52a-4e5f-ac71-4b37274867f5","type":"index-pattern"}]},"hidePanelTitles":false,"enhancements":{}},"title":"[Flights] Delay Type"},{"version":"8.8.0","type":"lens","gridData":{"x":24,"y":58,"w":12,"h":11,"i":"5d53db36-2d5a-4adc-af7b-cec4c1a294e0"},"panelIndex":"5d53db36-2d5a-4adc-af7b-cec4c1a294e0","embeddableConfig":{"attributes":{"title":"","type":"lens","visualizationType":"lnsPie","state":{"datasourceStates":{"formBased":{"layers":{"0c8e136b-a822-4fb3-836d-e06cbea4eea4":{"columns":{"d1cee8bf-34cf-4141-99d7-ff043ee77b56":{"label":"Top values of FlightDelayType","dataType":"string","operationType":"terms","scale":"ordinal","sourceField":"FlightDelayType","isBucketed":true,"params":{"size":10,"orderBy":{"type":"column","columnId":"aa152ace-ee2d-447b-b86d-459bef4d7880"},"orderDirection":"desc","otherBucket":true,"missingBucket":false}},"aa152ace-ee2d-447b-b86d-459bef4d7880":{"label":"Count of records","dataType":"number","operationType":"count","isBucketed":false,"scale":"ratio","sourceField":"___records___"}},"columnOrder":["d1cee8bf-34cf-4141-99d7-ff043ee77b56","aa152ace-ee2d-447b-b86d-459bef4d7880"],"incompleteColumns":{}}}}},"visualization":{"shape":"pie","palette":{"type":"palette","name":"cool"},"layers":[{"layerId":"0c8e136b-a822-4fb3-836d-e06cbea4eea4","numberDisplay":"percent","categoryDisplay":"default","legendDisplay":"default","nestedLegend":false,"layerType":"data","legendSize":"auto","primaryGroups":["d1cee8bf-34cf-4141-99d7-ff043ee77b56"],"metrics":["aa152ace-ee2d-447b-b86d-459bef4d7880"]}]},"query":{"query":"","language":"kuery"},"filters":[{"meta":{"type":"phrase","key":"FlightDelayType","params":{"query":"No Delay"},"disabled":false,"negate":true,"alias":null,"index":"filter-index-pattern-0"},"query":{"match_phrase":{"FlightDelayType":"No Delay"}},"$state":{"store":"appState"}}]},"references":[{"id":"d3d7af60-4c81-11e8-b3d7-01146121b73d","name":"indexpattern-datasource-current-indexpattern","type":"index-pattern"},{"id":"d3d7af60-4c81-11e8-b3d7-01146121b73d","name":"indexpattern-datasource-layer-0c8e136b-a822-4fb3-836d-e06cbea4eea4","type":"index-pattern"},{"id":"d3d7af60-4c81-11e8-b3d7-01146121b73d","name":"filter-index-pattern-0","type":"index-pattern"}]},"enhancements":{},"hidePanelTitles":false},"title":"[Flights] Delay Type"},{"version":"8.8.0","type":"lens","gridData":{"x":36,"y":58,"w":12,"h":11,"i":"ecd89a7c-9124-4472-bdc6-9bdbd70d45d5"},"panelIndex":"ecd89a7c-9124-4472-bdc6-9bdbd70d45d5","embeddableConfig":{"attributes":{"title":"","visualizationType":"lnsXY","type":"lens","references":[{"type":"index-pattern","id":"d3d7af60-4c81-11e8-b3d7-01146121b73d","name":"indexpattern-datasource-layer-dffd86e7-01a9-4990-b974-3706608b5532"}],"state":{"visualization":{"title":"Empty XY chart","legend":{"isVisible":true,"position":"right"},"valueLabels":"hide","preferredSeriesType":"bar_horizontal","layers":[{"layerId":"dffd86e7-01a9-4990-b974-3706608b5532","accessors":["9d212159-afac-41f5-9303-5fb62ff04ba3"],"position":"top","seriesType":"bar_horizontal","showGridlines":false,"layerType":"data","splitAccessor":"d99ad4d7-26ff-4d65-a8ce-34656fdafa0a","palette":{"type":"palette","name":"temperature"}}]},"query":{"query":"","language":"kuery"},"filters":[],"datasourceStates":{"formBased":{"layers":{"dffd86e7-01a9-4990-b974-3706608b5532":{"columns":{"9d212159-afac-41f5-9303-5fb62ff04ba3":{"label":"Count of records","dataType":"number","operationType":"count","isBucketed":false,"scale":"ratio","sourceField":"___records___","params":{"emptyAsNull":true}},"d99ad4d7-26ff-4d65-a8ce-34656fdafa0a":{"label":"Top 10 values of DestWeather","dataType":"string","operationType":"terms","scale":"ordinal","sourceField":"DestWeather","isBucketed":true,"params":{"size":10,"orderBy":{"type":"column","columnId":"9d212159-afac-41f5-9303-5fb62ff04ba3"},"orderDirection":"desc","otherBucket":true,"missingBucket":false,"parentFormat":{"id":"terms"},"include":[],"exclude":[],"includeIsRegex":false,"excludeIsRegex":false}}},"columnOrder":["d99ad4d7-26ff-4d65-a8ce-34656fdafa0a","9d212159-afac-41f5-9303-5fb62ff04ba3"],"sampling":1,"incompleteColumns":{}}}},"textBased":{"layers":{}}},"internalReferences":[],"adHocDataViews":{}}},"enhancements":{}}}]',
      timeFrom: 'now-7d',
      title: '[Flights] Global Flight Dashboard',
      timeTo: 'now',
      version: 1,
    },
    references: [
      {
        name: '4:panel_4',
        type: 'search',
        id: '571aaf70-4c88-11e8-b3d7-01146121b73d',
      },
      {
        type: 'index-pattern',
        id: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
        name: '7:indexpattern-datasource-layer-dc8cf715-b56b-4dd7-a624-7c3ef9e2f2ce',
      },
      {
        type: 'index-pattern',
        id: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
        name: '7:xy-visualization-layer-10fed425-accd-411b-a773-ee825bc3945b',
      },
      {
        type: 'index-pattern',
        id: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
        name: '10:indexpattern-datasource-layer-247b176d-e81d-47dc-bbd1-4de85d098961',
      },
      {
        type: 'index-pattern',
        name: '10:c61f29fc-1ff3-4d46-a6c2-bde8a5b97f4a',
        id: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
      },
      {
        name: '23:panel_23',
        type: 'visualization',
        id: '334084f0-52fd-11e8-a160-89cc2ad9e8e2',
      },
      {
        name: '31:panel_31',
        type: 'visualization',
        id: 'ed78a660-53a0-11e8-acbd-0be0ad9d822b',
      },
      {
        type: 'index-pattern',
        id: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
        name: '392b4936-f753-47bc-a98d-a4e41a0a4cd4:indexpattern-datasource-layer-8fa993db-c147-4954-adf7-4ff264d42576',
      },
      {
        type: 'index-pattern',
        id: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
        name: '9271deff-5a61-4665-83fc-f9fdc6bf0c0b:indexpattern-datasource-layer-b4712d43-1e84-4f5b-878d-8e38ba748317',
      },
      {
        type: 'index-pattern',
        id: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
        name: 'aa591c29-1a31-4ee1-a71d-b829c06fd162:indexpattern-datasource-layer-b4712d43-1e84-4f5b-878d-8e38ba748317',
      },
      {
        type: 'index-pattern',
        name: 'aa591c29-1a31-4ee1-a71d-b829c06fd162:c804c161-375f-4d52-a1cc-2e98b966957d',
        id: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
      },
      {
        type: 'index-pattern',
        id: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
        name: 'b766e3b8-4544-46ed-99e6-9ecc4847e2a2:indexpattern-datasource-layer-b4712d43-1e84-4f5b-878d-8e38ba748317',
      },
      {
        type: 'index-pattern',
        id: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
        name: '2e33ade5-96e5-40b4-b460-493e5d4fa834:indexpattern-datasource-layer-b4712d43-1e84-4f5b-878d-8e38ba748317',
      },
      {
        type: 'index-pattern',
        name: '2e33ade5-96e5-40b4-b460-493e5d4fa834:14cea722-a629-4c69-a06d-94a4a4c9a718',
        id: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
      },
      {
        id: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
        name: '086ac2e9-dd16-4b45-92b8-1e43ff7e3f65:indexpattern-datasource-current-indexpattern',
        type: 'index-pattern',
      },
      {
        id: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
        name: '086ac2e9-dd16-4b45-92b8-1e43ff7e3f65:indexpattern-datasource-layer-03c34665-471c-49c7-acf1-5a11f517421c',
        type: 'index-pattern',
      },
      {
        id: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
        name: 'fb86b32f-fb7a-45cf-9511-f366fef51bbd:indexpattern-datasource-current-indexpattern',
        type: 'index-pattern',
      },
      {
        id: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
        name: 'fb86b32f-fb7a-45cf-9511-f366fef51bbd:indexpattern-datasource-layer-f26e8f7a-4118-4227-bea0-5c02d8b270f7',
        type: 'index-pattern',
      },
      {
        id: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
        name: '0cc42484-16f7-42ec-b38c-9bf8be69cde7:indexpattern-datasource-current-indexpattern',
        type: 'index-pattern',
      },
      {
        id: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
        name: '0cc42484-16f7-42ec-b38c-9bf8be69cde7:indexpattern-datasource-layer-e80cc05e-c52a-4e5f-ac71-4b37274867f5',
        type: 'index-pattern',
      },
      {
        id: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
        name: '5d53db36-2d5a-4adc-af7b-cec4c1a294e0:indexpattern-datasource-current-indexpattern',
        type: 'index-pattern',
      },
      {
        id: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
        name: '5d53db36-2d5a-4adc-af7b-cec4c1a294e0:indexpattern-datasource-layer-0c8e136b-a822-4fb3-836d-e06cbea4eea4',
        type: 'index-pattern',
      },
      {
        id: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
        name: '5d53db36-2d5a-4adc-af7b-cec4c1a294e0:filter-index-pattern-0',
        type: 'index-pattern',
      },
      {
        type: 'index-pattern',
        id: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
        name: 'ecd89a7c-9124-4472-bdc6-9bdbd70d45d5:indexpattern-datasource-layer-dffd86e7-01a9-4990-b974-3706608b5532',
      },
      {
        name: 'controlGroup_85b632c8-3b7b-408d-8223-b0caccf75bd3:optionsListDataView',
        type: 'index-pattern',
        id: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
      },
      {
        name: 'controlGroup_d4dc9d2b-5850-402a-921d-8a2cd0107156:optionsListDataView',
        type: 'index-pattern',
        id: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
      },
      {
        name: 'controlGroup_bee4a16a-f5c1-40b2-887e-db1b9ad9e15f:rangeSliderDataView',
        type: 'index-pattern',
        id: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
      },
    ],
    coreMigrationVersion: '8.8.0',
    typeMigrationVersion: '8.7.0',
    managed: false,
  },
];
