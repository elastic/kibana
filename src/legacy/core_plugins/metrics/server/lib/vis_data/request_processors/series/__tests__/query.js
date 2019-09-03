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

import { query } from '../query';
import { expect } from 'chai';
import sinon from 'sinon';

describe('query(req, panel, series)', () => {
  let panel;
  let series;
  let req;

  const config = {
    allowLeadingWildcards: true,
    queryStringOptions: { analyze_wildcard: true },
  };
  beforeEach(() => {
    req = {
      payload: {
        timerange: {
          min: '2017-01-01T00:00:00Z',
          max: '2017-01-01T01:00:00Z',
        },
      },
    };
    panel = {
      index_pattern: '*',
      time_field: 'timestamp',
      interval: '10s',
    };
    series = { id: 'test' };
  });

  it('calls next when finished', () => {
    const next = sinon.spy();
    query(req, panel, series, config)(next)({});
    expect(next.calledOnce).to.equal(true);
  });

  it('returns doc with query for timerange', () => {
    const next = doc => doc;
    const doc = query(req, panel, series, config)(next)({});
    expect(doc).to.eql({
      size: 0,
      query: {
        bool: {
          filter: [],
          must: [
            {
              range: {
                timestamp: {
                  gte: '2017-01-01T00:00:00.000Z',
                  lte: '2017-01-01T01:00:00.000Z',
                  format: 'strict_date_optional_time',
                },
              },
            },
          ],
          must_not: [],
          should: [],
        },
      },
    });
  });

  it('returns doc with query for timerange (offset by 1h)', () => {
    series.offset_time = '1h';
    const next = doc => doc;
    const doc = query(req, panel, series, config)(next)({});
    expect(doc).to.eql({
      size: 0,
      query: {
        bool: {
          filter: [],
          must: [
            {
              range: {
                timestamp: {
                  gte: '2016-12-31T23:00:00.000Z',
                  lte: '2017-01-01T00:00:00.000Z',
                  format: 'strict_date_optional_time',
                },
              },
            },
          ],
          must_not: [],
          should: [],
        },
      },
    });
  });

  it('returns doc with global query', () => {
    req.payload.filters = [
      {
        bool: {
          must: [
            {
              term: {
                host: 'example',
              },
            },
          ],
        },
      },
    ];
    const next = doc => doc;
    const doc = query(req, panel, series, config)(next)({});
    expect(doc).to.eql({
      size: 0,
      query: {
        bool: {
          filter: [
            {
              bool: {
                must: [
                  {
                    term: {
                      host: 'example',
                    },
                  },
                ],
              },
            },
          ],
          must: [
            {
              range: {
                timestamp: {
                  gte: '2017-01-01T00:00:00.000Z',
                  lte: '2017-01-01T01:00:00.000Z',
                  format: 'strict_date_optional_time',
                },
              },
            },
          ],
          must_not: [],
          should: [],
        },
      },
    });
  });

  it('returns doc with series filter', () => {
    series.filter = { query: 'host:web-server', language: 'lucene' };
    const next = doc => doc;
    const doc = query(req, panel, series, config)(next)({});
    expect(doc).to.eql({
      size: 0,
      query: {
        bool: {
          filter: [],
          must: [
            {
              range: {
                timestamp: {
                  gte: '2017-01-01T00:00:00.000Z',
                  lte: '2017-01-01T01:00:00.000Z',
                  format: 'strict_date_optional_time',
                },
              },
            },
            {
              bool: {
                filter: [],
                must: [
                  {
                    query_string: {
                      analyze_wildcard: true,
                      query: series.filter.query,
                    },
                  },
                ],
                must_not: [],
                should: [],
              },
            },
          ],
          must_not: [],
          should: [],
        },
      },
    });
  });
  it('returns doc with panel filter and global', () => {
    req.payload.filters = [
      {
        bool: {
          must: [
            {
              term: {
                host: 'example',
              },
            },
          ],
        },
      },
    ];
    panel.filter = { query: 'host:web-server', language: 'lucene' };
    const next = doc => doc;
    const doc = query(req, panel, series, config)(next)({});
    expect(doc).to.eql({
      size: 0,
      query: {
        bool: {
          filter: [
            {
              bool: {
                must: [
                  {
                    term: {
                      host: 'example',
                    },
                  },
                ],
              },
            },
          ],
          must: [
            {
              range: {
                timestamp: {
                  gte: '2017-01-01T00:00:00.000Z',
                  lte: '2017-01-01T01:00:00.000Z',
                  format: 'strict_date_optional_time',
                },
              },
            },
            {
              bool: {
                filter: [],
                must: [
                  {
                    query_string: {
                      query: panel.filter.query,
                      analyze_wildcard: true,
                    },
                  },
                ],
                must_not: [],
                should: [],
              },
            },
          ],
          must_not: [],
          should: [],
        },
      },
    });
  });

  it('returns doc with panel filter (ignoring globals)', () => {
    req.payload.filters = [
      {
        bool: {
          must: [
            {
              term: {
                host: 'example',
              },
            },
          ],
        },
      },
    ];
    panel.filter = { query: 'host:web-server', language: 'lucene' };
    panel.ignore_global_filter = true;
    const next = doc => doc;
    const doc = query(req, panel, series, config)(next)({});
    expect(doc).to.eql({
      size: 0,
      query: {
        bool: {
          filter: [],
          must: [
            {
              range: {
                timestamp: {
                  gte: '2017-01-01T00:00:00.000Z',
                  lte: '2017-01-01T01:00:00.000Z',
                  format: 'strict_date_optional_time',
                },
              },
            },
            {
              bool: {
                filter: [],
                must: [
                  {
                    query_string: {
                      query: panel.filter.query,
                      analyze_wildcard: true,
                    },
                  },
                ],
                must_not: [],
                should: [],
              },
            },
          ],
          must_not: [],
          should: [],
        },
      },
    });
  });
});
