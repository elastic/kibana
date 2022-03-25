/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const getAggs = () => {
  return {
    indexPattern: {
      id: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
      title: 'kibana_sample_data_flights',
      fieldFormatMap: {
        hour_of_day: {
          id: 'number',
          params: {
            pattern: '00',
          },
        },
        AvgTicketPrice: {
          id: 'number',
          params: {
            pattern: '$0,0.[00]',
          },
        },
      },
      fields: [
        {
          count: 4,
          name: 'AvgTicketPrice',
          type: 'number',
          esTypes: ['float'],
          scripted: false,
          searchable: true,
          aggregatable: true,
          readFromDocValues: true,
        },
        {
          count: 0,
          name: 'Cancelled',
          type: 'boolean',
          esTypes: ['boolean'],
          scripted: false,
          searchable: true,
          aggregatable: true,
          readFromDocValues: true,
        },
        {
          count: 3,
          name: 'Carrier',
          type: 'string',
          esTypes: ['keyword'],
          scripted: false,
          searchable: true,
          aggregatable: true,
          readFromDocValues: true,
        },
        {
          count: 2,
          name: 'timestamp',
          type: 'date',
          esTypes: ['date'],
          scripted: false,
          searchable: true,
          aggregatable: true,
          readFromDocValues: true,
        },
      ],
      timeFieldName: 'timestamp',
      metaFields: ['_source', '_id', '_type', '_index', '_score'],
      version: 'WzQ3NjYsMl0=',
      originalSavedObjectBody: {
        fieldAttrs:
          '{"AvgTicketPrice":{"count":4},"Carrier":{"count":3},"DestAirportID":{"count":1},"DestCityName":{"count":3},"DestCountry":{"count":3},"DestLocation":{"count":1},"_score":{"count":1},"dayOfWeek":{"count":4},"timestamp":{"count":2}}',
        title: 'kibana_sample_data_flights',
        timeFieldName: 'timestamp',
        fields:
          '[{"count":0,"script":"doc[\'timestamp\'].value.getHour()","lang":"painless","name":"hour_of_day","type":"number","scripted":true,"searchable":true,"aggregatable":true,"readFromDocValues":false}]',
        fieldFormatMap:
          '{"hour_of_day":{"id":"number","params":{"pattern":"00"}},"AvgTicketPrice":{"id":"number","params":{"pattern":"$0,0.[00]"}}}',
        runtimeFieldMap: '{}',
      },
      shortDotsEnable: false,
      fieldFormats: {
        fieldFormats: {},
        defaultMap: {
          ip: {
            id: 'ip',
            params: {},
          },
          date: {
            id: 'date',
            params: {},
          },
          date_nanos: {
            id: 'date_nanos',
            params: {},
            es: true,
          },
          number: {
            id: 'number',
            params: {},
          },
          boolean: {
            id: 'boolean',
            params: {},
          },
          _source: {
            id: '_source',
            params: {},
          },
          _default_: {
            id: 'string',
            params: {},
          },
        },
        metaParamsOptions: {
          parsedUrl: {
            origin: 'http://localhost:5601',
            pathname: '/thz/app/visualize',
            basePath: '/thz',
          },
        },
      },
      fieldAttrs: {
        AvgTicketPrice: {
          count: 4,
        },
        Carrier: {
          count: 3,
        },
        timestamp: {
          count: 2,
        },
      },
      runtimeFieldMap: {},
      allowNoIndex: false,
    },
    typesRegistry: {},
    aggs: [
      {
        id: '1',
        enabled: true,
        type: 'count',
        params: {},
        schema: 'metric',
      },
      {
        id: '2',
        enabled: true,
        type: 'date_histogram',
        params: {
          field: 'timestamp',
          timeRange: {
            from: 'now-15m',
            to: 'now',
          },
          useNormalizedEsInterval: true,
          scaleMetricValues: false,
          interval: 'auto',
          drop_partials: false,
          min_doc_count: 1,
          extended_bounds: {},
        },
        schema: 'segment',
      },
    ],
  };
};

export const getVis = (bucketType: string) => {
  return {
    data: {
      aggs: {
        indexPattern: {
          id: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
          title: 'kibana_sample_data_flights',
          fieldFormatMap: {
            hour_of_day: {
              id: 'number',
              params: {
                pattern: '00',
              },
            },
            AvgTicketPrice: {
              id: 'number',
              params: {
                pattern: '$0,0.[00]',
              },
            },
          },
          fields: [
            {
              count: 4,
              name: 'AvgTicketPrice',
              type: 'number',
              esTypes: ['float'],
              scripted: false,
              searchable: true,
              aggregatable: true,
              readFromDocValues: true,
            },
            {
              count: 0,
              name: 'Cancelled',
              type: 'boolean',
              esTypes: ['boolean'],
              scripted: false,
              searchable: true,
              aggregatable: true,
              readFromDocValues: true,
            },
            {
              count: 3,
              name: 'Carrier',
              type: 'string',
              esTypes: ['keyword'],
              scripted: false,
              searchable: true,
              aggregatable: true,
              readFromDocValues: true,
            },
            {
              count: 2,
              name: 'timestamp',
              type: 'date',
              esTypes: ['date'],
              scripted: false,
              searchable: true,
              aggregatable: true,
              readFromDocValues: true,
            },
          ],
          timeFieldName: 'timestamp',
          metaFields: ['_source', '_id', '_type', '_index', '_score'],
          version: 'WzQ3NjYsMl0=',
          originalSavedObjectBody: {
            fieldAttrs:
              '{"AvgTicketPrice":{"count":4},"Carrier":{"count":3},"DestAirportID":{"count":1},"DestCityName":{"count":3},"DestCountry":{"count":3},"DestLocation":{"count":1},"_score":{"count":1},"dayOfWeek":{"count":4},"timestamp":{"count":2}}',
            title: 'kibana_sample_data_flights',
            timeFieldName: 'timestamp',
            fields:
              '[{"count":0,"script":"doc[\'timestamp\'].value.getHour()","lang":"painless","name":"hour_of_day","type":"number","scripted":true,"searchable":true,"aggregatable":true,"readFromDocValues":false}]',
            fieldFormatMap:
              '{"hour_of_day":{"id":"number","params":{"pattern":"00"}},"AvgTicketPrice":{"id":"number","params":{"pattern":"$0,0.[00]"}}}',
            runtimeFieldMap: '{}',
          },
          shortDotsEnable: false,
          fieldFormats: {
            fieldFormats: {},
            defaultMap: {
              ip: {
                id: 'ip',
                params: {},
              },
              date: {
                id: 'date',
                params: {},
              },
              date_nanos: {
                id: 'date_nanos',
                params: {},
                es: true,
              },
              number: {
                id: 'number',
                params: {},
              },
              boolean: {
                id: 'boolean',
                params: {},
              },
              _source: {
                id: '_source',
                params: {},
              },
              _default_: {
                id: 'string',
                params: {},
              },
            },
            metaParamsOptions: {
              parsedUrl: {
                origin: 'http://localhost:5601',
                pathname: '/thz/app/visualize',
                basePath: '/thz',
              },
            },
          },
          fieldAttrs: {
            AvgTicketPrice: {
              count: 4,
            },
            Carrier: {
              count: 3,
            },
            timestamp: {
              count: 2,
            },
          },
          runtimeFieldMap: {},
          allowNoIndex: false,
        },
        typesRegistry: {},
        aggs: [
          {
            id: '1',
            enabled: true,
            type: 'count',
            params: {},
            schema: 'metric',
          },
          {
            id: '2',
            enabled: true,
            type: {
              name: bucketType,
            },
            params: {
              field: 'timestamp',
              timeRange: {
                from: 'now-15m',
                to: 'now',
              },
              useNormalizedEsInterval: true,
              scaleMetricValues: false,
              interval: 'auto',
              drop_partials: false,
              min_doc_count: 1,
              extended_bounds: {},
            },
            schema: 'segment',
          },
        ],
      },
    },
    type: {
      name: 'area',
      title: 'Area',
      description: 'Emphasize the data between an axis and a line.',
      note: '',
      icon: 'visArea',
      stage: 'production',
      group: 'aggbased',
      titleInWizard: '',
      options: {
        showTimePicker: true,
        showQueryBar: true,
        showFilterBar: true,
        showIndexSelection: true,
        hierarchicalData: false,
      },
      visConfig: {
        defaults: {
          type: 'area',
          grid: {
            categoryLines: false,
          },
          categoryAxes: [
            {
              id: 'CategoryAxis-1',
              type: 'category',
              position: 'bottom',
              show: true,
              scale: {
                type: 'linear',
              },
              labels: {
                show: true,
                filter: true,
                truncate: 100,
              },
              title: {},
              style: {},
            },
          ],
          valueAxes: [
            {
              id: 'ValueAxis-1',
              name: 'LeftAxis-1',
              type: 'value',
              position: 'left',
              show: true,
              scale: {
                type: 'linear',
                mode: 'normal',
              },
              labels: {
                show: true,
                rotate: 0,
                filter: true,
                truncate: 100,
              },
              title: {
                text: 'Count',
              },
              style: {},
            },
          ],
          seriesParams: [
            {
              show: true,
              type: 'area',
              mode: 'stacked',
              data: {
                label: 'Count',
                id: '1',
              },
              drawLinesBetweenPoints: true,
              lineWidth: 2,
              showCircles: true,
              circlesRadius: 3,
              interpolate: 'linear',
              valueAxis: 'ValueAxis-1',
            },
          ],
          addTooltip: true,
          detailedTooltip: true,
          palette: {
            type: 'palette',
            name: 'default',
          },
          addLegend: true,
          legendPosition: 'right',
          fittingFunction: 'linear',
          times: [],
          addTimeMarker: false,
          maxLegendLines: 1,
          truncateLegend: true,
          radiusRatio: 9,
          thresholdLine: {
            show: false,
            value: 10,
            width: 1,
            style: 'full',
            color: '#E7664C',
          },
          labels: {},
        },
      },
      editorConfig: {
        collections: {
          legendPositions: [
            {
              text: 'Top',
              value: 'top',
            },
            {
              text: 'Left',
              value: 'left',
            },
            {
              text: 'Right',
              value: 'right',
            },
            {
              text: 'Bottom',
              value: 'bottom',
            },
          ],
          positions: [
            {
              text: 'Top',
              value: 'top',
            },
            {
              text: 'Left',
              value: 'left',
            },
            {
              text: 'Right',
              value: 'right',
            },
            {
              text: 'Bottom',
              value: 'bottom',
            },
          ],
          chartTypes: [
            {
              text: 'Line',
              value: 'line',
            },
            {
              text: 'Area',
              value: 'area',
            },
            {
              text: 'Bar',
              value: 'histogram',
            },
          ],
          axisModes: [
            {
              text: 'Normal',
              value: 'normal',
            },
            {
              text: 'Percentage',
              value: 'percentage',
            },
            {
              text: 'Wiggle',
              value: 'wiggle',
            },
            {
              text: 'Silhouette',
              value: 'silhouette',
            },
          ],
          scaleTypes: [
            {
              text: 'Linear',
              value: 'linear',
            },
            {
              text: 'Log',
              value: 'log',
            },
            {
              text: 'Square root',
              value: 'square root',
            },
          ],
          chartModes: [
            {
              text: 'Normal',
              value: 'normal',
            },
            {
              text: 'Stacked',
              value: 'stacked',
            },
          ],
          interpolationModes: [
            {
              text: 'Straight',
              value: 'linear',
            },
            {
              text: 'Smoothed',
              value: 'cardinal',
            },
            {
              text: 'Stepped',
              value: 'step-after',
            },
          ],
          thresholdLineStyles: [
            {
              value: 'full',
              text: 'Full',
            },
            {
              value: 'dashed',
              text: 'Dashed',
            },
            {
              value: 'dot-dashed',
              text: 'Dot-dashed',
            },
          ],
          fittingFunctions: [
            {
              value: 'none',
              text: 'Hide (Do not fill gaps)',
            },
            {
              value: 'zero',
              text: 'Zero (Fill gaps with zeros)',
            },
            {
              value: 'linear',
              text: 'Linear (Fill gaps with a line)',
            },
            {
              value: 'carry',
              text: 'Last (Fill gaps with the last value)',
            },
            {
              value: 'lookahead',
              text: 'Next (Fill gaps with the next value)',
            },
          ],
        },
        optionTabs: [
          {
            name: 'advanced',
            title: 'Metrics & axes',
          },
          {
            name: 'options',
            title: 'Panel settings',
          },
        ],
        schemas: [
          {
            group: 'metrics',
            name: 'metric',
            title: 'Y-axis',
            aggFilter: ['!geo_centroid', '!geo_bounds'],
            min: 1,
            defaults: [
              {
                schema: 'metric',
                type: 'count',
              },
            ],
            max: null,
            params: [],
          },
          {
            group: 'metrics',
            name: 'radius',
            title: 'Dot size',
            min: 0,
            max: 1,
            aggFilter: ['count', 'avg', 'sum', 'min', 'max', 'cardinality'],
            params: [],
          },
          {
            group: 'buckets',
            name: 'segment',
            title: 'X-axis',
            min: 0,
            max: 1,
            aggFilter: [
              '!geohash_grid',
              '!geotile_grid',
              '!filter',
              '!sampler',
              '!diversified_sampler',
              '!multi_terms',
              '!significant_text',
            ],
            params: [],
          },
          {
            group: 'buckets',
            name: 'group',
            title: 'Split series',
            min: 0,
            max: 3,
            aggFilter: [
              '!geohash_grid',
              '!geotile_grid',
              '!filter',
              '!sampler',
              '!diversified_sampler',
              '!multi_terms',
              '!significant_text',
            ],
            params: [],
          },
          {
            group: 'buckets',
            name: 'split',
            title: 'Split chart',
            min: 0,
            max: 1,
            aggFilter: [
              '!geohash_grid',
              '!geotile_grid',
              '!filter',
              '!sampler',
              '!diversified_sampler',
              '!multi_terms',
              '!significant_text',
            ],
            params: [
              {
                name: 'row',
                default: true,
              },
            ],
          },
        ],
      },
      hidden: false,
      requiresSearch: true,
      hierarchicalData: false,
      schemas: {
        all: [
          {
            group: 'metrics',
            name: 'metric',
            title: 'Y-axis',
            aggFilter: ['!geo_centroid', '!geo_bounds'],
            min: 1,
            defaults: [
              {
                schema: 'metric',
                type: 'count',
              },
            ],
            max: null,
            params: [],
          },
          {
            group: 'metrics',
            name: 'radius',
            title: 'Dot size',
            min: 0,
            max: 1,
            aggFilter: ['count', 'avg', 'sum', 'min', 'max', 'cardinality'],
            params: [],
          },
          {
            group: 'buckets',
            name: 'segment',
            title: 'X-axis',
            min: 0,
            max: 1,
            aggFilter: [
              '!geohash_grid',
              '!geotile_grid',
              '!filter',
              '!sampler',
              '!diversified_sampler',
              '!multi_terms',
              '!significant_text',
            ],
            params: [],
          },
          {
            group: 'buckets',
            name: 'group',
            title: 'Split series',
            min: 0,
            max: 3,
            aggFilter: [
              '!geohash_grid',
              '!geotile_grid',
              '!filter',
              '!sampler',
              '!diversified_sampler',
              '!multi_terms',
              '!significant_text',
            ],
            params: [],
          },
          {
            group: 'buckets',
            name: 'split',
            title: 'Split chart',
            min: 0,
            max: 1,
            aggFilter: [
              '!geohash_grid',
              '!geotile_grid',
              '!filter',
              '!sampler',
              '!diversified_sampler',
              '!multi_terms',
              '!significant_text',
            ],
            params: [
              {
                name: 'row',
                default: true,
              },
            ],
          },
        ],
        buckets: [
          {
            group: 'buckets',
            name: 'segment',
            title: 'X-axis',
            min: 0,
            max: 1,
            aggFilter: [
              '!geohash_grid',
              '!geotile_grid',
              '!filter',
              '!sampler',
              '!diversified_sampler',
              '!multi_terms',
              '!significant_text',
            ],
            params: [],
          },
          {
            group: 'buckets',
            name: 'group',
            title: 'Split series',
            min: 0,
            max: 3,
            aggFilter: [
              '!geohash_grid',
              '!geotile_grid',
              '!filter',
              '!sampler',
              '!diversified_sampler',
              '!multi_terms',
              '!significant_text',
            ],
            params: [],
          },
          {
            group: 'buckets',
            name: 'split',
            title: 'Split chart',
            min: 0,
            max: 1,
            aggFilter: [
              '!geohash_grid',
              '!geotile_grid',
              '!filter',
              '!sampler',
              '!diversified_sampler',
              '!multi_terms',
              '!significant_text',
            ],
            params: [
              {
                name: 'row',
                default: true,
              },
            ],
          },
        ],
        metrics: [
          {
            group: 'metrics',
            name: 'metric',
            title: 'Y-axis',
            aggFilter: ['!geo_centroid', '!geo_bounds'],
            min: 1,
            defaults: [
              {
                schema: 'metric',
                type: 'count',
              },
            ],
            max: null,
            params: [],
          },
          {
            group: 'metrics',
            name: 'radius',
            title: 'Dot size',
            min: 0,
            max: 1,
            aggFilter: ['count', 'avg', 'sum', 'min', 'max', 'cardinality'],
            params: [],
          },
        ],
      },
    },
  };
};

export const getStateParams = (type: string, thresholdPanelOn: boolean) => {
  return {
    type: 'area',
    grid: {
      categoryLines: false,
      style: {
        color: '#eee',
      },
    },
    categoryAxes: [
      {
        id: 'CategoryAxis-1',
        type: 'category',
        position: 'bottom',
        show: true,
        style: {},
        scale: {
          type: 'linear',
        },
        labels: {
          show: true,
          truncate: 100,
          filter: true,
        },
        title: {},
      },
    ],
    valueAxes: [
      {
        id: 'ValueAxis-1',
        name: 'LeftAxis-1',
        type: 'value',
        position: 'left',
        show: true,
        style: {},
        scale: {
          type: 'linear',
          mode: 'normal',
        },
        labels: {
          show: true,
          rotate: 0,
          filter: true,
          truncate: 100,
        },
        title: {
          text: 'Count',
        },
      },
    ],
    seriesParams: [
      {
        show: 'true',
        type,
        mode: 'stacked',
        data: {
          label: 'Count',
          id: '1',
        },
        drawLinesBetweenPoints: true,
        showCircles: true,
        circlesRadius: 3,
        interpolate: 'cardinal',
        valueAxis: 'ValueAxis-1',
      },
    ],
    addTooltip: true,
    addLegend: true,
    legendPosition: 'right',
    times: [],
    addTimeMarker: false,
    maxLegendLines: 1,
    truncateLegend: true,
    detailedTooltip: true,
    palette: {
      type: 'palette',
      name: 'kibana_palette',
    },
    isVislibVis: true,
    fittingFunction: 'zero',
    radiusRatio: 9,
    thresholdLine: {
      show: thresholdPanelOn,
      value: 10,
      width: 1,
      style: 'full',
      color: '#E7664C',
    },
    labels: {},
  };
};
