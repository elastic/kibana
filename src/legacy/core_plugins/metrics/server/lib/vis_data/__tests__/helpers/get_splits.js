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

import { expect } from 'chai';
import { getSplits } from '../../helpers/get_splits';

describe('getSplits(resp, panel, series)', () => {
  it('should return a splits for everything/filter group bys', () => {
    const resp = {
      aggregations: {
        SERIES: {
          timeseries: { buckets: [] },
          SIBAGG: { value: 1 },
          meta: { bucketSize: 10 },
        },
      },
    };
    const panel = { type: 'timeseries' };
    const series = {
      id: 'SERIES',
      color: 'rgb(255, 0, 0)',
      split_mode: 'everything',
      metrics: [
        { id: 'AVG', type: 'avg', field: 'cpu' },
        { id: 'SIBAGG', type: 'avg_bucket', field: 'AVG' },
      ],
    };
    expect(getSplits(resp, panel, series)).to.eql([
      {
        id: 'SERIES',
        label: 'Overall Average of Average of cpu',
        meta: { bucketSize: 10 },
        color: 'rgb(255, 0, 0)',
        timeseries: { buckets: [] },
        SIBAGG: { value: 1 },
      },
    ]);
  });

  it('should return a splits for terms group bys for top_n', () => {
    const resp = {
      aggregations: {
        SERIES: {
          buckets: [
            {
              key: 'example-01',
              timeseries: { buckets: [] },
              SIBAGG: { value: 1 },
            },
            {
              key: 'example-02',
              timeseries: { buckets: [] },
              SIBAGG: { value: 2 },
            },
          ],
          meta: { bucketSize: 10 },
        },
      },
    };
    const series = {
      id: 'SERIES',
      color: '#F00',
      split_mode: 'terms',
      terms_field: 'beat.hostname',
      terms_size: 10,
      metrics: [
        { id: 'AVG', type: 'avg', field: 'cpu' },
        { id: 'SIBAGG', type: 'avg_bucket', field: 'AVG' },
      ],
    };
    const panel = { type: 'top_n' };
    expect(getSplits(resp, panel, series)).to.eql([
      {
        id: 'SERIES:example-01',
        key: 'example-01',
        label: 'example-01',
        meta: { bucketSize: 10 },
        color: 'rgb(255, 0, 0)',
        timeseries: { buckets: [] },
        SIBAGG: { value: 1 },
      },
      {
        id: 'SERIES:example-02',
        key: 'example-02',
        label: 'example-02',
        meta: { bucketSize: 10 },
        color: 'rgb(255, 0, 0)',
        timeseries: { buckets: [] },
        SIBAGG: { value: 2 },
      },
    ]);
  });

  it('should return a splits for terms group bys', () => {
    const resp = {
      aggregations: {
        SERIES: {
          buckets: [
            {
              key: 'example-01',
              timeseries: { buckets: [] },
              SIBAGG: { value: 1 },
            },
            {
              key: 'example-02',
              timeseries: { buckets: [] },
              SIBAGG: { value: 2 },
            },
          ],
          meta: { bucketSize: 10 },
        },
      },
    };
    const series = {
      id: 'SERIES',
      color: '#F00',
      split_mode: 'terms',
      terms_field: 'beat.hostname',
      terms_size: 10,
      metrics: [
        { id: 'AVG', type: 'avg', field: 'cpu' },
        { id: 'SIBAGG', type: 'avg_bucket', field: 'AVG' },
      ],
    };
    const panel = { type: 'timeseries' };
    expect(getSplits(resp, panel, series)).to.eql([
      {
        id: 'SERIES:example-01',
        key: 'example-01',
        label: 'example-01',
        meta: { bucketSize: 10 },
        color: 'rgb(255, 0, 0)',
        timeseries: { buckets: [] },
        SIBAGG: { value: 1 },
      },
      {
        id: 'SERIES:example-02',
        key: 'example-02',
        label: 'example-02',
        meta: { bucketSize: 10 },
        color: 'rgb(147, 0, 0)',
        timeseries: { buckets: [] },
        SIBAGG: { value: 2 },
      },
    ]);
  });

  it('should return a splits for filters group bys', () => {
    const resp = {
      aggregations: {
        SERIES: {
          buckets: {
            'filter-1': {
              timeseries: { buckets: [] },
            },
            'filter-2': {
              timeseries: { buckets: [] },
            },
          },
          meta: { bucketSize: 10 },
        },
      },
    };
    const series = {
      id: 'SERIES',
      color: 'rgb(255, 0, 0)',
      split_mode: 'filters',
      split_filters: [
        { id: 'filter-1', color: '#F00', filter: 'status_code:[* TO 200]', label: '200s' },
        { id: 'filter-2', color: '#0F0', filter: 'status_code:[300 TO *]', label: '300s' },
      ],
      metrics: [{ id: 'COUNT', type: 'count' }],
    };
    const panel = { type: 'timeseries' };
    expect(getSplits(resp, panel, series)).to.eql([
      {
        id: 'SERIES:filter-1',
        key: 'filter-1',
        label: '200s',
        meta: { bucketSize: 10 },
        color: '#F00',
        timeseries: { buckets: [] },
      },
      {
        id: 'SERIES:filter-2',
        key: 'filter-2',
        label: '300s',
        meta: { bucketSize: 10 },
        color: '#0F0',
        timeseries: { buckets: [] },
      },
    ]);
  });
});
