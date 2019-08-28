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

import { splitByFilters } from '../split_by_filters';
import { expect } from 'chai';
import sinon from 'sinon';

describe('splitByFilters(req, panel, series)', () => {
  let panel;
  let series;
  let req;
  beforeEach(() => {
    panel = {
      time_field: 'timestamp',
    };
    series = {
      id: 'test',
      split_mode: 'filters',
      split_filters: [
        {
          id: 'filter-1',
          color: '#F00',
          filter: { query: 'status_code:[* TO 200]', language: 'lucene' },
          label: '200s',
        },
        {
          id: 'filter-2',
          color: '#0F0',
          filter: { query: 'status_code:[300 TO *]', language: 'lucene' },
          label: '300s',
        },
      ],
      metrics: [{ id: 'avgmetric', type: 'avg', field: 'cpu' }],
    };
    req = {
      payload: {
        timerange: {
          min: '2017-01-01T00:00:00Z',
          max: '2017-01-01T01:00:00Z',
        },
      },
    };
  });

  it('calls next when finished', () => {
    const next = sinon.spy();
    splitByFilters(req, panel, series)(next)({});
    expect(next.calledOnce).to.equal(true);
  });

  it('returns a valid terms agg', () => {
    const next = doc => doc;
    const doc = splitByFilters(req, panel, series)(next)({});
    expect(doc).to.eql({
      aggs: {
        test: {
          filters: {
            filters: {
              'filter-1': {
                bool: {
                  filter: [],
                  must: [
                    {
                      query_string: {
                        query: 'status_code:[* TO 200]',
                      },
                    },
                  ],
                  must_not: [],
                  should: [],
                },
              },
              'filter-2': {
                bool: {
                  filter: [],
                  must: [
                    {
                      query_string: {
                        query: 'status_code:[300 TO *]',
                      },
                    },
                  ],
                  must_not: [],
                  should: [],
                },
              },
            },
          },
        },
      },
    });
  });

  it('calls next and does not add a terms agg', () => {
    series.split_mode = 'everything';
    const next = sinon.spy(doc => doc);
    const doc = splitByFilters(req, panel, series)(next)({});
    expect(next.calledOnce).to.equal(true);
    expect(doc).to.eql({});
  });
});
