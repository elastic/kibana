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

import angular, { IRootScopeService, IScope, ICompileService } from 'angular';
import 'angular-mocks';
import 'angular-sanitize';
import '../table_vis.mock';
import $ from 'jquery';

// @ts-ignore
import StubIndexPattern from 'test_utils/stub_index_pattern';
import { getAngularModule } from '../get_inner_angular';
import { initTableVisLegacyModule } from '../shim/table_vis_legacy_module';
import {
  npStart,
  legacyResponseHandlerProvider,
  Vis,
  AggConfig,
  tabifyAggResponse,
} from '../legacy_imports';
import { createTableVisTypeDefinition } from '../table_vis_type';
import { setup as visualizationsSetup } from '../../../visualizations/public/np_ready/public/legacy';

interface TableVisScope extends IScope {
  [key: string]: any;
}

const metricOnly = {
  hits: { total: 1000, hits: [], max_score: 0 },
  aggregations: {
    agg_1: { value: 412032 },
  },
};
const threeTermBuckets = {
  hits: { total: 1000, hits: [], max_score: 0 },
  aggregations: {
    agg_2: {
      buckets: [
        {
          key: 'png',
          doc_count: 50,
          agg_1: { value: 412032 },
          agg_3: {
            buckets: [
              {
                key: 'IT',
                doc_count: 10,
                agg_1: { value: 9299 },
                agg_4: {
                  buckets: [
                    { key: 'win', doc_count: 4, agg_1: { value: 0 } },
                    { key: 'mac', doc_count: 6, agg_1: { value: 9299 } },
                  ],
                },
              },
              {
                key: 'US',
                doc_count: 20,
                agg_1: { value: 8293 },
                agg_4: {
                  buckets: [
                    { key: 'linux', doc_count: 12, agg_1: { value: 3992 } },
                    { key: 'mac', doc_count: 8, agg_1: { value: 3029 } },
                  ],
                },
              },
            ],
          },
        },
        {
          key: 'css',
          doc_count: 20,
          agg_1: { value: 412032 },
          agg_3: {
            buckets: [
              {
                key: 'MX',
                doc_count: 7,
                agg_1: { value: 9299 },
                agg_4: {
                  buckets: [
                    { key: 'win', doc_count: 3, agg_1: { value: 4992 } },
                    { key: 'mac', doc_count: 4, agg_1: { value: 5892 } },
                  ],
                },
              },
              {
                key: 'US',
                doc_count: 13,
                agg_1: { value: 8293 },
                agg_4: {
                  buckets: [
                    { key: 'linux', doc_count: 12, agg_1: { value: 3992 } },
                    { key: 'mac', doc_count: 1, agg_1: { value: 3029 } },
                  ],
                },
              },
            ],
          },
        },
        {
          key: 'html',
          doc_count: 90,
          agg_1: { value: 412032 },
          agg_3: {
            buckets: [
              {
                key: 'CN',
                doc_count: 85,
                agg_1: { value: 9299 },
                agg_4: {
                  buckets: [
                    { key: 'win', doc_count: 46, agg_1: { value: 4992 } },
                    { key: 'mac', doc_count: 39, agg_1: { value: 5892 } },
                  ],
                },
              },
              {
                key: 'FR',
                doc_count: 15,
                agg_1: { value: 8293 },
                agg_4: {
                  buckets: [
                    { key: 'win', doc_count: 3, agg_1: { value: 3992 } },
                    { key: 'mac', doc_count: 12, agg_1: { value: 3029 } },
                  ],
                },
              },
            ],
          },
        },
      ],
    },
  },
};
const oneTermOneHistogramBucketWithTwoMetricsOneTopHitOneDerivative = {
  hits: { total: 1000, hits: [], max_score: 0 },
  aggregations: {
    agg_3: {
      buckets: [
        {
          key: 'png',
          doc_count: 50,
          agg_4: {
            buckets: [
              {
                key_as_string: '2014-09-28T00:00:00.000Z',
                key: 1411862400000,
                doc_count: 1,
                agg_1: { value: 9283 },
                agg_2: { value: 1411862400000 },
                agg_6: {
                  hits: {
                    total: 2,
                    hits: [
                      {
                        fields: {
                          bytes: 23,
                        },
                      },
                    ],
                  },
                },
              },
              {
                key_as_string: '2014-09-29T00:00:00.000Z',
                key: 1411948800000,
                doc_count: 2,
                agg_1: { value: 28349 },
                agg_2: { value: 1411948800000 },
                agg_5: { value: 203 },
                agg_6: {
                  hits: {
                    total: 2,
                    hits: [
                      {
                        fields: {
                          bytes: 39,
                        },
                      },
                    ],
                  },
                },
              },
              {
                key_as_string: '2014-09-30T00:00:00.000Z',
                key: 1412035200000,
                doc_count: 3,
                agg_1: { value: 84330 },
                agg_2: { value: 1412035200000 },
                agg_5: { value: 200 },
                agg_6: {
                  hits: {
                    total: 2,
                    hits: [
                      {
                        fields: {
                          bytes: 329,
                        },
                      },
                    ],
                  },
                },
              },
              {
                key_as_string: '2014-10-01T00:00:00.000Z',
                key: 1412121600000,
                doc_count: 4,
                agg_1: { value: 34992 },
                agg_2: { value: 1412121600000 },
                agg_5: { value: 103 },
                agg_6: {
                  hits: {
                    total: 2,
                    hits: [
                      {
                        fields: {
                          bytes: 22,
                        },
                      },
                    ],
                  },
                },
              },
              {
                key_as_string: '2014-10-02T00:00:00.000Z',
                key: 1412208000000,
                doc_count: 5,
                agg_1: { value: 145432 },
                agg_2: { value: 1412208000000 },
                agg_5: { value: 153 },
                agg_6: {
                  hits: {
                    total: 2,
                    hits: [
                      {
                        fields: {
                          bytes: 93,
                        },
                      },
                    ],
                  },
                },
              },
              {
                key_as_string: '2014-10-03T00:00:00.000Z',
                key: 1412294400000,
                doc_count: 35,
                agg_1: { value: 220943 },
                agg_2: { value: 1412294400000 },
                agg_5: { value: 239 },
                agg_6: {
                  hits: {
                    total: 2,
                    hits: [
                      {
                        fields: {
                          bytes: 72,
                        },
                      },
                    ],
                  },
                },
              },
            ],
          },
        },
        {
          key: 'css',
          doc_count: 20,
          agg_4: {
            buckets: [
              {
                key_as_string: '2014-09-28T00:00:00.000Z',
                key: 1411862400000,
                doc_count: 1,
                agg_1: { value: 9283 },
                agg_2: { value: 1411862400000 },
                agg_6: {
                  hits: {
                    total: 2,
                    hits: [
                      {
                        fields: {
                          bytes: 75,
                        },
                      },
                    ],
                  },
                },
              },
              {
                key_as_string: '2014-09-29T00:00:00.000Z',
                key: 1411948800000,
                doc_count: 2,
                agg_1: { value: 28349 },
                agg_2: { value: 1411948800000 },
                agg_5: { value: 10 },
                agg_6: {
                  hits: {
                    total: 2,
                    hits: [
                      {
                        fields: {
                          bytes: 11,
                        },
                      },
                    ],
                  },
                },
              },
              {
                key_as_string: '2014-09-30T00:00:00.000Z',
                key: 1412035200000,
                doc_count: 3,
                agg_1: { value: 84330 },
                agg_2: { value: 1412035200000 },
                agg_5: { value: 24 },
                agg_6: {
                  hits: {
                    total: 2,
                    hits: [
                      {
                        fields: {
                          bytes: 238,
                        },
                      },
                    ],
                  },
                },
              },
              {
                key_as_string: '2014-10-01T00:00:00.000Z',
                key: 1412121600000,
                doc_count: 4,
                agg_1: { value: 34992 },
                agg_2: { value: 1412121600000 },
                agg_5: { value: 49 },
                agg_6: {
                  hits: {
                    total: 2,
                    hits: [
                      {
                        fields: {
                          bytes: 343,
                        },
                      },
                    ],
                  },
                },
              },
              {
                key_as_string: '2014-10-02T00:00:00.000Z',
                key: 1412208000000,
                doc_count: 5,
                agg_1: { value: 145432 },
                agg_2: { value: 1412208000000 },
                agg_5: { value: 100 },
                agg_6: {
                  hits: {
                    total: 2,
                    hits: [
                      {
                        fields: {
                          bytes: 837,
                        },
                      },
                    ],
                  },
                },
              },
              {
                key_as_string: '2014-10-03T00:00:00.000Z',
                key: 1412294400000,
                doc_count: 5,
                agg_1: { value: 220943 },
                agg_2: { value: 1412294400000 },
                agg_5: { value: 23 },
                agg_6: {
                  hits: {
                    total: 2,
                    hits: [
                      {
                        fields: {
                          bytes: 302,
                        },
                      },
                    ],
                  },
                },
              },
            ],
          },
        },
        {
          key: 'html',
          doc_count: 90,
          agg_4: {
            buckets: [
              {
                key_as_string: '2014-09-28T00:00:00.000Z',
                key: 1411862400000,
                doc_count: 10,
                agg_1: { value: 9283 },
                agg_2: { value: 1411862400000 },
                agg_6: {
                  hits: {
                    total: 2,
                    hits: [
                      {
                        fields: {
                          bytes: 30,
                        },
                      },
                    ],
                  },
                },
              },
              {
                key_as_string: '2014-09-29T00:00:00.000Z',
                key: 1411948800000,
                doc_count: 20,
                agg_1: { value: 28349 },
                agg_2: { value: 1411948800000 },
                agg_5: { value: 1 },
                agg_6: {
                  hits: {
                    total: 2,
                    hits: [
                      {
                        fields: {
                          bytes: 43,
                        },
                      },
                    ],
                  },
                },
              },
              {
                key_as_string: '2014-09-30T00:00:00.000Z',
                key: 1412035200000,
                doc_count: 30,
                agg_1: { value: 84330 },
                agg_2: { value: 1412035200000 },
                agg_5: { value: 5 },
                agg_6: {
                  hits: {
                    total: 2,
                    hits: [
                      {
                        fields: {
                          bytes: 88,
                        },
                      },
                    ],
                  },
                },
              },
              {
                key_as_string: '2014-10-01T00:00:00.000Z',
                key: 1412121600000,
                doc_count: 11,
                agg_1: { value: 34992 },
                agg_2: { value: 1412121600000 },
                agg_5: { value: 10 },
                agg_6: {
                  hits: {
                    total: 2,
                    hits: [
                      {
                        fields: {
                          bytes: 91,
                        },
                      },
                    ],
                  },
                },
              },
              {
                key_as_string: '2014-10-02T00:00:00.000Z',
                key: 1412208000000,
                doc_count: 12,
                agg_1: { value: 145432 },
                agg_2: { value: 1412208000000 },
                agg_5: { value: 43 },
                agg_6: {
                  hits: {
                    total: 2,
                    hits: [
                      {
                        fields: {
                          bytes: 534,
                        },
                      },
                    ],
                  },
                },
              },
              {
                key_as_string: '2014-10-03T00:00:00.000Z',
                key: 1412294400000,
                doc_count: 7,
                agg_1: { value: 220943 },
                agg_2: { value: 1412294400000 },
                agg_5: { value: 1 },
                agg_6: {
                  hits: {
                    total: 2,
                    hits: [
                      {
                        fields: {
                          bytes: 553,
                        },
                      },
                    ],
                  },
                },
              },
            ],
          },
        },
      ],
    },
  },
};

describe.skip('Table Vis - AggTable Directive', () => {
  let $rootScope: IRootScopeService & { [key: string]: any };
  let $compile: ICompileService;
  let $scope: TableVisScope;
  let tableAggResponse: any;
  const tabifiedData: {
    [key: string]: any;
  } = {};
  const mockUiSettings: any = {
    get: (item: string): any => {
      return mockUiSettings[item];
    },
    getUpdate$: () => ({
      subscribe: jest.fn(),
    }),
    'query:allowLeadingWildcards': true,
    'query:queryString:options': {},
    'courier:ignoreFilterIfFieldNotInIndex': true,
    'dateFormat:tz': 'Browser',
    'format:defaultTypeMap': {},
  };
  const indexPattern = new StubIndexPattern(
    'logstash-*',
    (cfg: any) => cfg,
    'time',
    // [...stubFields,
    //     { name: 'extension', esType: 'text', aggregatable: true, searchable: true },
    //     { name: 'geo.src', esType: 'keyword', aggregatable: true, searchable: true },
    // ],
    [
      {
        name: 'bytes',
        type: 'number',
        esTypes: ['long'],
        readFromDocValues: true,
        aggregatable: true,
        searchable: true,
        count: 10,
        scripted: false,
        sortable: true,
        filterable: true,
        displayName: 'bytes',
      },
      {
        name: 'ssl',
        type: 'boolean',
        esTypes: ['boolean'],
        readFromDocValues: true,
        aggregatable: true,
        searchable: true,
        count: 20,
        scripted: false,
        sortable: true,
        filterable: true,
        displayName: 'ssl',
      },
      {
        name: '@timestamp',
        type: 'date',
        esTypes: ['date'],
        readFromDocValues: true,
        aggregatable: true,
        searchable: true,
        count: 30,
        scripted: false,
        sortable: true,
        filterable: true,
        displayName: '@timestamp',
      },
      {
        name: 'time',
        type: 'date',
        esTypes: ['date'],
        readFromDocValues: true,
        aggregatable: true,
        searchable: true,
        count: 30,
        scripted: false,
        sortable: true,
        filterable: true,
        displayName: 'time',
      },
      {
        name: '@tags',
        type: 'string',
        esTypes: ['keyword'],
        readFromDocValues: true,
        aggregatable: true,
        searchable: true,
        count: 0,
        scripted: false,
        sortable: true,
        filterable: true,
        displayName: '@tags',
      },
      {
        name: 'utc_time',
        type: 'date',
        esTypes: ['date'],
        readFromDocValues: true,
        aggregatable: true,
        searchable: true,
        count: 0,
        scripted: false,
        sortable: true,
        filterable: true,
        displayName: 'utc_time',
      },
      {
        name: 'phpmemory',
        type: 'number',
        esTypes: ['integer'],
        readFromDocValues: true,
        aggregatable: true,
        searchable: true,
        count: 0,
        scripted: false,
        sortable: true,
        filterable: true,
        displayName: 'phpmemory',
      },
      {
        name: 'ip',
        type: 'ip',
        esTypes: ['ip'],
        readFromDocValues: true,
        aggregatable: true,
        searchable: true,
        count: 0,
        scripted: false,
        sortable: true,
        filterable: true,
        displayName: 'ip',
      },
      {
        name: 'request_body',
        type: 'attachment',
        esTypes: ['attachment'],
        readFromDocValues: true,
        aggregatable: true,
        searchable: true,
        count: 0,
        scripted: false,
        sortable: false,
        filterable: false,
        displayName: 'request_body',
      },
      {
        name: 'point',
        type: 'geo_point',
        esTypes: ['geo_point'],
        readFromDocValues: true,
        aggregatable: true,
        searchable: true,
        count: 0,
        scripted: false,
        sortable: false,
        filterable: false,
        displayName: 'point',
      },
      {
        name: 'area',
        type: 'geo_shape',
        esTypes: ['geo_shape'],
        readFromDocValues: true,
        aggregatable: true,
        searchable: true,
        count: 0,
        scripted: false,
        sortable: false,
        filterable: false,
        displayName: 'area',
      },
      {
        name: 'hashed',
        type: 'murmur3',
        esTypes: ['murmur3'],
        readFromDocValues: false,
        aggregatable: false,
        searchable: true,
        count: 0,
        scripted: false,
        sortable: false,
        filterable: false,
        displayName: 'hashed',
      },
      {
        name: 'geo.coordinates',
        type: 'geo_point',
        esTypes: ['geo_point'],
        readFromDocValues: true,
        aggregatable: true,
        searchable: true,
        count: 0,
        scripted: false,
        sortable: false,
        filterable: false,
        displayName: 'geo.coordinates',
      },
      {
        name: 'extension',
        type: 'string',
        esTypes: ['text'],
        readFromDocValues: false,
        aggregatable: true,
        searchable: true,
        count: 0,
        scripted: false,
        sortable: true,
        filterable: true,
        displayName: 'extension',
      },
      {
        name: 'extension.keyword',
        type: 'string',
        esTypes: ['keyword'],
        readFromDocValues: true,
        aggregatable: true,
        searchable: true,
        count: 0,
        scripted: false,
        subType: { multi: { parent: 'extension' } },
        sortable: true,
        filterable: true,
        displayName: 'extension.keyword',
      },
      {
        name: 'machine.os',
        type: 'string',
        esTypes: ['text'],
        readFromDocValues: false,
        aggregatable: true,
        searchable: true,
        count: 0,
        scripted: false,
        sortable: true,
        filterable: true,
        displayName: 'machine.os',
      },
      {
        name: 'machine.os.raw',
        type: 'string',
        esTypes: ['keyword'],
        readFromDocValues: true,
        aggregatable: true,
        searchable: true,
        count: 0,
        scripted: false,
        subType: { multi: { parent: 'machine.os' } },
        sortable: true,
        filterable: true,
        displayName: 'machine.os.raw',
      },
      {
        name: 'geo.src',
        type: 'string',
        esTypes: ['keyword'],
        readFromDocValues: true,
        aggregatable: true,
        searchable: true,
        count: 0,
        scripted: false,
        sortable: true,
        filterable: true,
        displayName: 'geo.src',
      },
      {
        name: '_id',
        type: 'string',
        esTypes: ['_id'],
        readFromDocValues: false,
        aggregatable: true,
        searchable: true,
        count: 0,
        scripted: false,
        sortable: true,
        filterable: true,
        displayName: '_id',
      },
      {
        name: '_type',
        type: 'string',
        esTypes: ['_type'],
        readFromDocValues: false,
        aggregatable: true,
        searchable: true,
        count: 0,
        scripted: false,
        sortable: true,
        filterable: true,
        displayName: '_type',
      },
      {
        name: '_source',
        type: '_source',
        esTypes: ['_source'],
        readFromDocValues: false,
        aggregatable: true,
        searchable: true,
        count: 0,
        scripted: false,
        sortable: false,
        filterable: false,
        displayName: '_source',
      },
      {
        name: 'non-filterable',
        type: 'string',
        esTypes: ['text'],
        readFromDocValues: false,
        aggregatable: true,
        searchable: false,
        count: 0,
        scripted: false,
        sortable: true,
        filterable: true,
        displayName: 'non-filterable',
      },
      {
        name: 'non-sortable',
        type: 'string',
        esTypes: ['text'],
        readFromDocValues: false,
        aggregatable: false,
        searchable: false,
        count: 0,
        scripted: false,
        sortable: true,
        filterable: true,
        displayName: 'non-sortable',
      },
      {
        name: 'custom_user_field',
        type: 'conflict',
        esTypes: ['conflict'],
        readFromDocValues: true,
        aggregatable: true,
        searchable: true,
        count: 0,
        scripted: false,
        sortable: false,
        filterable: false,
        displayName: 'custom_user_field',
      },
      {
        name: 'script string',
        type: 'string',
        esTypes: ['text'],
        readFromDocValues: false,
        aggregatable: true,
        searchable: false,
        count: 0,
        script: "'i am a string'",
        lang: 'expression',
        scripted: true,
        sortable: true,
        filterable: true,
        displayName: 'script string',
      },
      {
        name: 'script number',
        type: 'number',
        esTypes: ['long'],
        readFromDocValues: true,
        aggregatable: true,
        searchable: false,
        count: 0,
        script: '1234',
        lang: 'expression',
        scripted: true,
        sortable: true,
        filterable: true,
        displayName: 'script number',
      },
      {
        name: 'script date',
        type: 'date',
        esTypes: ['date'],
        readFromDocValues: true,
        aggregatable: true,
        searchable: false,
        count: 0,
        script: '1234',
        lang: 'painless',
        scripted: true,
        sortable: true,
        filterable: true,
        displayName: 'script date',
      },
      {
        name: 'script murmur3',
        type: 'murmur3',
        esTypes: ['murmur3'],
        readFromDocValues: true,
        aggregatable: true,
        searchable: false,
        count: 0,
        script: '1234',
        lang: 'expression',
        scripted: true,
        sortable: false,
        filterable: false,
        displayName: 'script murmur3',
      },
    ],
    // npStart.core.uiSettings
    mockUiSettings
  );
  indexPattern.id = 'logstash-*';
  indexPattern.isTimeNanosBased = () => false;

  const init = () => {
    const vis1 = new Vis(indexPattern, 'table');
    tabifiedData.metricOnly = tabifyAggResponse(vis1.aggs, metricOnly);
    // console.log(JSON.stringify(tabifiedData.metricOnly));
    const vis2 = new Vis(indexPattern, {
      type: 'table',
      params: {
        showMetricsAtAllLevels: true,
      },
      aggs: [
        { type: 'avg', schema: 'metric', params: { field: 'bytes' } },
        { type: 'terms', schema: 'bucket', params: { field: 'extension' } },
        { type: 'terms', schema: 'bucket', params: { field: 'geo.src' } },
        { type: 'terms', schema: 'bucket', params: { field: 'machine.os' } },
      ],
    });
    vis2.aggs.aggs.forEach((agg: AggConfig, i: number) => {
      agg.id = 'agg_' + (i + 1);
    });
    tabifiedData.threeTermBuckets = tabifyAggResponse(vis2.aggs, threeTermBuckets, {
      metricsAtAllLevels: true,
    });

    const vis3 = new Vis(indexPattern, {
      type: 'table',
      aggs: [
        { type: 'avg', schema: 'metric', params: { field: 'bytes' } },
        { type: 'min', schema: 'metric', params: { field: '@timestamp' } },
        { type: 'terms', schema: 'bucket', params: { field: 'extension' } },
        {
          type: 'date_histogram',
          schema: 'bucket',
          params: { field: '@timestamp', interval: 'd' },
        },
        {
          type: 'derivative',
          schema: 'metric',
          params: { metricAgg: 'custom', customMetric: { id: '5-orderAgg', type: 'count' } },
        },
        {
          type: 'top_hits',
          schema: 'metric',
          params: { field: 'bytes', aggregate: { val: 'min' }, size: 1 },
        },
      ],
    });
    vis3.aggs.aggs.forEach((agg: AggConfig, i: number) => {
      agg.id = 'agg_' + (i + 1);
    });

    tabifiedData.oneTermOneHistogramBucketWithTwoMetricsOneTopHitOneDerivative = tabifyAggResponse(
      vis3.aggs,
      oneTermOneHistogramBucketWithTwoMetricsOneTopHitOneDerivative
    );
  };

  const initLocalAngular = () => {
    const tableVisModule = getAngularModule('kibana/table_vis', npStart.core);
    initTableVisLegacyModule(tableVisModule);
  };

  beforeEach(initLocalAngular);
  beforeAll(() => {
    visualizationsSetup.types.registerVisualization(() => createTableVisTypeDefinition());
  });
  beforeEach(angular.mock.module('kibana/table_vis'));

  beforeEach(
    angular.mock.inject(
      (_$rootScope_: IRootScopeService, _$compile_: ICompileService, config: any) => {
        $rootScope = _$rootScope_;
        $compile = _$compile_;
        tableAggResponse = legacyResponseHandlerProvider().handler;
        // settings = config;

        init();
      }
    )
  );

  beforeEach(function() {
    $scope = $rootScope.$new();
  });
  afterEach(function() {
    $scope.$destroy();
  });

  it('renders a simple response properly', async function() {
    $scope.dimensions = {
      metrics: [{ accessor: 0, format: { id: 'number' }, params: {} }],
      buckets: [],
    };
    $scope.table = (await tableAggResponse(tabifiedData.metricOnly, $scope.dimensions)).tables[0];

    const $el = $compile('<kbn-agg-table table="table" dimensions="dimensions"></kbn-agg-table>')(
      $scope
    );
    $scope.$digest();

    expect($el.find('tbody').length).toBe(1);
    expect($el.find('td').length).toBe(1);
    expect($el.find('td').text()).toEqual('1,000');
  });

  it('renders nothing if the table is empty', function() {
    $scope.dimensions = {};
    $scope.table = null;
    const $el = $compile('<kbn-agg-table table="table" dimensions="dimensions"></kbn-agg-table>')(
      $scope
    );
    $scope.$digest();

    expect($el.find('tbody').length).toBe(0);
  });

  it('renders a complex response properly', async function() {
    $scope.dimensions = {
      buckets: [
        { accessor: 0, params: {} },
        { accessor: 2, params: {} },
        { accessor: 4, params: {} },
      ],
      metrics: [
        { accessor: 1, params: {} },
        { accessor: 3, params: {} },
        { accessor: 5, params: {} },
      ],
    };
    $scope.table = (
      await tableAggResponse(tabifiedData.threeTermBuckets, $scope.dimensions)
    ).tables[0];

    const $el = $('<kbn-agg-table table="table" dimensions="dimensions"></kbn-agg-table>');
    $compile($el)($scope);
    $scope.$digest();

    expect($el.find('tbody').length).toBe(1);

    const $rows = $el.find('tbody tr');
    expect($rows.length).toBeGreaterThan(0);

    function validBytes(str: string) {
      const num = str.replace(/,/g, '');
      if (num !== '-') {
        expect(num).toMatch(/^\d+$/);
      }
    }

    $rows.each(function() {
      // 6 cells in every row
      const $cells = $(this).find('td');
      expect($cells.length).toBe(6);

      const txts = $cells.map(function() {
        return $(this)
          .text()
          .trim();
      });
      // two character country code
      expect(txts[0]).toMatch(/^(png|jpg|gif|html|css)$/);
      validBytes(txts[1]);

      // country
      expect(txts[2]).toMatch(/^\w\w$/);
      validBytes(txts[3]);

      // os
      expect(txts[4]).toMatch(/^(win|mac|linux)$/);
      validBytes(txts[5]);
    });
  });
});
