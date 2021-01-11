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
import { getAllSeries } from './get_all_series';

const rowsNoSplitSeries = [
  {
    'col-0-4': 'Kibana Airlines',
    'col-1-1': 85,
  },
  {
    'col-0-4': 'ES-Air',
    'col-1-1': 84,
  },
  {
    'col-0-4': 'Logstash Airways',
    'col-1-1': 82,
  },
  {
    'col-0-4': 'JetBeats',
    'col-1-1': 81,
  },
];

const rowsWithSplitSeries = [
  {
    'col-0-4': 'ES-Air',
    'col-1-5': 0,
    'col-2-1': 71,
  },
  {
    'col-0-4': 'ES-Air',
    'col-1-5': 1,
    'col-2-1': 14,
  },
  {
    'col-0-4': 'Kibana Airlines',
    'col-1-5': 0,
    'col-2-1': 71,
  },
  {
    'col-0-4': 'Kibana Airlines',
    'col-1-5': 1,
    'col-2-1': 13,
  },
  {
    'col-0-4': 'JetBeats',
    'col-1-5': 0,
    'col-2-1': 72,
  },
  {
    'col-0-4': 'JetBeats',
    'col-1-5': 1,
    'col-2-1': 9,
  },
  {
    'col-0-4': 'Logstash Airways',
    'col-1-5': 0,
    'col-2-1': 71,
  },
  {
    'col-0-4': 'Logstash Airways',
    'col-1-5': 1,
    'col-2-1': 10,
  },
];

const yAspects = [
  {
    accessor: 'col-2-1',
    column: 2,
    title: 'Count',
    format: {
      id: 'number',
    },
    aggType: 'count',
    aggId: '1',
    params: {},
  },
];

const myltipleYAspects = [
  {
    accessor: 'col-2-1',
    column: 2,
    title: 'Count',
    format: {
      id: 'number',
    },
    aggType: 'count',
    aggId: '1',
    params: {},
  },
  {
    accessor: 'col-3-4',
    column: 3,
    title: 'Average AvgTicketPrice',
    format: {
      id: 'number',
      params: {
        pattern: '$0,0.[00]',
      },
    },
    aggType: 'avg',
    aggId: '4',
    params: {},
  },
];

describe('getFilterClickData', () => {
  it('returns empty array if splitAccessors is undefined', () => {
    const splitAccessors = undefined;
    const series = getAllSeries(rowsNoSplitSeries, splitAccessors, yAspects);
    expect(series).toStrictEqual([]);
  });

  it('returns an array of series names if splitAccessors is an array', () => {
    const splitAccessors = [
      {
        accessor: 'col-1-5',
      },
    ];
    const series = getAllSeries(rowsWithSplitSeries, splitAccessors, yAspects);
    expect(series).toStrictEqual([0, 1]);
  });

  it('returns the correct array of series names for two splitAccessors without duplicates', () => {
    const splitAccessors = [
      {
        accessor: 'col-0-4',
      },
      {
        accessor: 'col-1-5',
      },
    ];
    const series = getAllSeries(rowsWithSplitSeries, splitAccessors, yAspects);
    expect(series).toStrictEqual([
      'ES-Air - 0',
      'ES-Air - 1',
      'Kibana Airlines - 0',
      'Kibana Airlines - 1',
      'JetBeats - 0',
      'JetBeats - 1',
      'Logstash Airways - 0',
      'Logstash Airways - 1',
    ]);
  });

  it('returns the correct array of series names for two splitAccessors and two y axis', () => {
    const splitAccessors = [
      {
        accessor: 'col-0-4',
      },
      {
        accessor: 'col-1-5',
      },
    ];
    const series = getAllSeries(rowsWithSplitSeries, splitAccessors, myltipleYAspects);
    expect(series).toStrictEqual([
      'ES-Air - 0: Count',
      'ES-Air - 0: Average AvgTicketPrice',
      'ES-Air - 1: Count',
      'ES-Air - 1: Average AvgTicketPrice',
      'Kibana Airlines - 0: Count',
      'Kibana Airlines - 0: Average AvgTicketPrice',
      'Kibana Airlines - 1: Count',
      'Kibana Airlines - 1: Average AvgTicketPrice',
      'JetBeats - 0: Count',
      'JetBeats - 0: Average AvgTicketPrice',
      'JetBeats - 1: Count',
      'JetBeats - 1: Average AvgTicketPrice',
      'Logstash Airways - 0: Count',
      'Logstash Airways - 0: Average AvgTicketPrice',
      'Logstash Airways - 1: Count',
      'Logstash Airways - 1: Average AvgTicketPrice',
    ]);
  });
});
