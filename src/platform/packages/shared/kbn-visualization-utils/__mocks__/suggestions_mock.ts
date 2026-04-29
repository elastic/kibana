/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TableChangeType } from '../src/types';

export const currentSuggestionMock = {
  title: 'Heat map',
  hide: false,
  score: 0.6,
  previewIcon: 'heatmap',
  visualizationId: 'lnsHeatmap',
  visualizationState: {
    shape: 'heatmap',
    layerId: '46aa21fa-b747-4543-bf90-0b40007c546d',
    layerType: 'data',
    legend: {
      isVisible: true,
      position: 'right',
      type: 'heatmap_legend',
    },
    gridConfig: {
      type: 'heatmap_grid',
      isCellLabelVisible: false,
      isYAxisLabelVisible: true,
      isXAxisLabelVisible: true,
      isYAxisTitleVisible: false,
      isXAxisTitleVisible: false,
    },
    valueAccessor: '5b9b8b76-0836-4a12-b9c0-980c9900502f',
    xAccessor: '81e332d6-ee37-42a8-a646-cea4fc75d2d3',
  },
  keptLayerIds: ['46aa21fa-b747-4543-bf90-0b40007c546d'],
  datasourceState: {
    layers: {
      '46aa21fa-b747-4543-bf90-0b40007c546d': {
        index: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
        query: {
          esql: 'FROM kibana_sample_data_flights | keep Dest, AvgTicketPrice',
        },
        columns: [
          {
            columnId: '81e332d6-ee37-42a8-a646-cea4fc75d2d3',
            fieldName: 'Dest',
            meta: {
              type: 'string',
            },
          },
          {
            columnId: '5b9b8b76-0836-4a12-b9c0-980c9900502f',
            fieldName: 'AvgTicketPrice',
            meta: {
              type: 'number',
            },
          },
        ],
        timeField: 'timestamp',
      },
    },
    indexPatternRefs: [],
    initialContext: {
      dataViewSpec: {
        id: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
        version: 'WzM1ODA3LDFd',
        title: 'kibana_sample_data_flights',
        timeFieldName: 'timestamp',
        sourceFilters: [],
        fields: {
          AvgTicketPrice: {
            count: 0,
            name: 'AvgTicketPrice',
            type: 'number',
            esTypes: ['float'],
            scripted: false,
            searchable: true,
            aggregatable: true,
            readFromDocValues: true,
            format: {
              id: 'number',
              params: {
                pattern: '$0,0.[00]',
              },
            },
            shortDotsEnable: false,
            isMapped: true,
          },
          Dest: {
            count: 0,
            name: 'Dest',
            type: 'string',
            esTypes: ['keyword'],
            scripted: false,
            searchable: true,
            aggregatable: true,
            readFromDocValues: true,
            format: {
              id: 'string',
            },
            shortDotsEnable: false,
            isMapped: true,
          },
          timestamp: {
            count: 0,
            name: 'timestamp',
            type: 'date',
            esTypes: ['date'],
            scripted: false,
            searchable: true,
            aggregatable: true,
            readFromDocValues: true,
            format: {
              id: 'date',
            },
            shortDotsEnable: false,
            isMapped: true,
          },
        },
        allowNoIndex: false,
        name: 'Kibana Sample Data Flights',
      },
      fieldName: '',
      contextualFields: ['Dest', 'AvgTicketPrice'],
      query: {
        esql: 'FROM "kibana_sample_data_flights"',
      },
    },
  },
  datasourceId: 'textBased',
  columns: 2,
  changeType: 'initial' as TableChangeType,
};
