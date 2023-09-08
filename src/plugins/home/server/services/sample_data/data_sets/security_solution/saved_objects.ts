/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/* eslint max-len: 0 */

import { SavedObject } from '@kbn/core/server';

export const getSavedObjects = (): SavedObject[] => [
  {
    attributes: {
      fieldAttrs: '{}',
      fieldFormatMap: '{}',
      fields: '[]',
      name: 'Kibana Sample Data Security Solution',
      runtimeFieldMap: '{}',
      sourceFilters: '[]',
      timeFieldName: '@timestamp',
      title: 'kibana_sample_data_securitysolution_*',
      typeMeta: '{}',
    },
    coreMigrationVersion: '8.8.0',
    created_at: '2023-08-16T10:09:47.143Z',
    id: 'c89b196d-d0cd-4cfb-8d95-787e4ce51551',
    managed: false,
    references: [],
    type: 'index-pattern',
    typeMigrationVersion: '8.0.0',
    updated_at: '2023-08-16T10:09:47.143Z',
    version: 'WzQ1LDFd',
  },
  {
    id: '717d50d0-3c37-11ee-ae29-adafdb6b4012',
    type: 'search',
    version: 'WzE2NiwxXQ==',
    attributes: {
      kibanaSavedObjectMeta: {
        searchSourceJSON:
          '{"highlightAll":true,"version":true,"query":{"query":"","language":"kuery"},"filter":[],"indexRefName":"kibanaSavedObjectMeta.searchSourceJSON.index"}',
      },
      title: '[Auditbeat] Auditbeat sample data',
      sort: [['@timestamp', 'desc']],
      columns: ['agent.name', 'agent.type', 'ecs.version', 'event.kind', 'host.hostname'],
      description: '',
      grid: {},
      hideChart: false,
      isTextBasedQuery: false,
      usesAdHocDataView: false,
      timeRestore: false,
    },
    references: [
      {
        name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
        type: 'index-pattern',
        id: 'c89b196d-d0cd-4cfb-8d95-787e4ce51551',
      },
    ],
    managed: false,
    coreMigrationVersion: '8.8.0',
    typeMigrationVersion: '8.0.0',
  },
  {
    id: '6b348ca0-4e45-11ee-8ec1-71bbd0b34722',
    type: 'dashboard',
    version: 'WzEzNiwxXQ==',
    attributes: {
      version: 1,
      kibanaSavedObjectMeta: {
        searchSourceJSON: '{"query":{"query":"","language":"kuery"},"filter":[]}',
      },
      description: '',
      timeRestore: false,
      optionsJSON:
        '{"useMargins":true,"syncColors":false,"syncCursor":true,"syncTooltips":false,"hidePanelTitles":false}',
      panelsJSON:
        '[{"type":"lens","gridData":{"x":24,"y":0,"w":24,"h":15,"i":"a29281de-6719-4b41-9aef-226d8f327519"},"panelIndex":"a29281de-6719-4b41-9aef-226d8f327519","embeddableConfig":{"attributes":{"visualizationType":"lnsXY","state":{"visualization":{"title":"Empty XY chart","legend":{"isVisible":true,"position":"right","legendSize":"xlarge"},"valueLabels":"hide","preferredSeriesType":"bar_stacked","layers":[{"layerId":"4021420a-6943-4f45-b7cb-3f0e033da384","accessors":["e09e0380-0740-4105-becc-0a4ca12e3944"],"position":"top","seriesType":"bar_stacked","showGridlines":false,"layerType":"data","xAccessor":"aac9d7d0-13a3-480a-892b-08207a787926","splitAccessor":"34919782-4546-43a5-b668-06ac934d3acd"}],"yRightExtent":{"mode":"full"},"yLeftExtent":{"mode":"full"},"axisTitlesVisibilitySettings":{"x":false,"yLeft":false,"yRight":true},"valuesInLegend":true},"query":{"query":"","language":"kuery"},"filters":[{"meta":{"type":"custom","key":"query","disabled":false,"negate":false,"alias":null},"query":{"bool":{"must":[],"filter":[],"should":[],"must_not":[]}},"$state":{"store":"appState"}},{"meta":{"type":"phrases","key":"_index","params":["auditbeat-*","packetbeat-*"],"alias":null,"negate":false,"disabled":false},"query":{"bool":{"should":[{"match_phrase":{"_index":"auditbeat-*"}},{"match_phrase":{"_index":"packetbeat-*"}}],"minimum_should_match":1}},"$state":{"store":"appState"}}],"datasourceStates":{"formBased":{"layers":{"4021420a-6943-4f45-b7cb-3f0e033da384":{"columns":{"aac9d7d0-13a3-480a-892b-08207a787926":{"label":"@timestamp","dataType":"date","operationType":"date_histogram","sourceField":"@timestamp","isBucketed":true,"scale":"interval","params":{"interval":"auto"}},"e09e0380-0740-4105-becc-0a4ca12e3944":{"label":"Count of records","dataType":"number","operationType":"count","isBucketed":false,"scale":"ratio","sourceField":"___records___"},"34919782-4546-43a5-b668-06ac934d3acd":{"label":"Top values of event.dataset","dataType":"string","operationType":"terms","scale":"ordinal","sourceField":"event.dataset","isBucketed":true,"params":{"size":10,"orderBy":{"type":"column","columnId":"e09e0380-0740-4105-becc-0a4ca12e3944"},"orderDirection":"desc","otherBucket":true,"missingBucket":false,"parentFormat":{"id":"terms"}}}},"columnOrder":["34919782-4546-43a5-b668-06ac934d3acd","aac9d7d0-13a3-480a-892b-08207a787926","e09e0380-0740-4105-becc-0a4ca12e3944"],"incompleteColumns":{}}}}},"internalReferences":[],"adHocDataViews":{}},"references":[{"type":"index-pattern","id":"c89b196d-d0cd-4cfb-8d95-787e4ce51551","name":"indexpattern-datasource-layer-4021420a-6943-4f45-b7cb-3f0e033da384"}]},"enhancements":{}},"title":"Security Solution sample events data"},{"type":"lens","gridData":{"x":0,"y":15,"w":24,"h":15,"i":"60fa5218-4ab5-4cae-8655-f0cb4bd213e0"},"panelIndex":"60fa5218-4ab5-4cae-8655-f0cb4bd213e0","embeddableConfig":{"attributes":{"title":"Security Solution sample alerts data","description":"","visualizationType":"lnsXY","type":"lens","references":[{"type":"index-pattern","id":"security-solution-default","name":"indexpattern-datasource-layer-a578b0a4-d2d8-4e74-9ff2-c371933b26e8"}],"state":{"visualization":{"title":"Empty XY chart","legend":{"isVisible":true,"position":"right","legendSize":"xlarge"},"valueLabels":"hide","preferredSeriesType":"bar_stacked","layers":[{"layerId":"a578b0a4-d2d8-4e74-9ff2-c371933b26e8","accessors":["e09e0380-0740-4105-becc-0a4ca12e3944"],"position":"top","seriesType":"bar_stacked","showGridlines":false,"layerType":"data","xAccessor":"aac9d7d0-13a3-480a-892b-08207a787926","splitAccessor":"34919782-4546-43a5-b668-06ac934d3acd"}],"yRightExtent":{"mode":"full"},"yLeftExtent":{"mode":"full"},"axisTitlesVisibilitySettings":{"x":false,"yLeft":false,"yRight":true},"valuesInLegend":true},"query":{"query":"","language":"kuery"},"filters":[{"meta":{"alias":null,"negate":true,"disabled":false,"type":"exists","key":"kibana.alert.building_block_type"},"query":{"exists":{"field":"kibana.alert.building_block_type"}},"$state":{"store":"appState"}},{"meta":{"type":"phrases","key":"_index","params":[".alerts-security.alerts-default"],"alias":null,"negate":false,"disabled":false},"query":{"bool":{"should":[{"match_phrase":{"_index":".alerts-security.alerts-default"}}],"minimum_should_match":1}},"$state":{"store":"appState"}}],"datasourceStates":{"formBased":{"layers":{"a578b0a4-d2d8-4e74-9ff2-c371933b26e8":{"columns":{"aac9d7d0-13a3-480a-892b-08207a787926":{"label":"@timestamp","dataType":"date","operationType":"date_histogram","sourceField":"@timestamp","isBucketed":true,"scale":"interval","params":{"interval":"auto"}},"e09e0380-0740-4105-becc-0a4ca12e3944":{"label":"Count of records","dataType":"number","operationType":"count","isBucketed":false,"scale":"ratio","sourceField":"___records___"},"34919782-4546-43a5-b668-06ac934d3acd":{"label":"Top values of kibana.alert.rule.name","dataType":"string","operationType":"terms","scale":"ordinal","sourceField":"kibana.alert.rule.name","isBucketed":true,"params":{"size":1000,"orderBy":{"type":"column","columnId":"e09e0380-0740-4105-becc-0a4ca12e3944"},"orderDirection":"desc","otherBucket":true,"missingBucket":false,"parentFormat":{"id":"terms"},"secondaryFields":[]}}},"columnOrder":["34919782-4546-43a5-b668-06ac934d3acd","aac9d7d0-13a3-480a-892b-08207a787926","e09e0380-0740-4105-becc-0a4ca12e3944"],"incompleteColumns":{}}}}},"internalReferences":[],"adHocDataViews":{}}},"enhancements":{}}}]',
      title: 'Security Solution Sample data dashboard',
    },
    references: [
      {
        type: 'index-pattern',
        id: 'c89b196d-d0cd-4cfb-8d95-787e4ce51551',
        name: 'a29281de-6719-4b41-9aef-226d8f327519:indexpattern-datasource-layer-4021420a-6943-4f45-b7cb-3f0e033da384',
      },
      {
        type: 'index-pattern',
        id: 'security-solution-default',
        name: '60fa5218-4ab5-4cae-8655-f0cb4bd213e0:indexpattern-datasource-layer-a578b0a4-d2d8-4e74-9ff2-c371933b26e8',
      },
      {
        type: 'tag',
        id: 'security-solution-default',
        name: 'tag-ref-security-solution-default',
      },
    ],
    managed: false,
    coreMigrationVersion: '8.8.0',
    typeMigrationVersion: '8.9.0',
  },
];
