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


/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import expect from '@kbn/expect';
import { buildQueryFromFilters, translateToQuery } from '../from_filters';
import indexPattern from '../../__fixtures__/index_pattern_response.json';

describe('build query', function () {
  describe('buildQueryFromFilters', function () {
    it('should return the parameters of an Elasticsearch bool query', function () {
      const result = buildQueryFromFilters([]);
      const expected = {
        must: [],
        filter: [],
        should: [],
        must_not: [],
      };
      expect(result).to.eql(expected);
    });

    it('should transform an array of kibana filters into ES queries combined in the bool clauses', function () {
      const filters = [
        {
          match_all: {},
          meta: { type: 'match_all' },
        },
        {
          exists: { field: 'foo' },
          meta: { type: 'exists' },
        },
      ];

      const expectedESQueries = [
        { match_all: {} },
        { exists: { field: 'foo' } },
      ];

      const result = buildQueryFromFilters(filters);

      expect(result.filter).to.eql(expectedESQueries);
    });

    it('should remove disabled filters', function () {
      const filters = [
        {
          match_all: {},
          meta: { type: 'match_all', negate: true, disabled: true },
        },
      ];

      const expectedESQueries = [];

      const result = buildQueryFromFilters(filters);

      expect(result.must_not).to.eql(expectedESQueries);
    });

    it('should remove falsy filters', function () {
      const filters = [null, undefined];

      const expectedESQueries = [];

      const result = buildQueryFromFilters(filters);

      expect(result.must_not).to.eql(expectedESQueries);
      expect(result.must).to.eql(expectedESQueries);
    });

    it('should place negated filters in the must_not clause', function () {
      const filters = [
        {
          match_all: {},
          meta: { type: 'match_all', negate: true },
        },
      ];

      const expectedESQueries = [{ match_all: {} }];

      const result = buildQueryFromFilters(filters);

      expect(result.must_not).to.eql(expectedESQueries);
    });

    it('should translate old ES filter syntax into ES 5+ query objects', function () {
      const filters = [
        {
          query: { exists: { field: 'foo' } },
          meta: { type: 'exists' },
        },
      ];

      const expectedESQueries = [
        {
          exists: { field: 'foo' },
        },
      ];

      const result = buildQueryFromFilters(filters);

      expect(result.filter).to.eql(expectedESQueries);
    });

    it('should migrate deprecated match syntax', function () {
      const filters = [
        {
          query: { match: { extension: { query: 'foo', type: 'phrase' } } },
          meta: { type: 'phrase' },
        },
      ];

      const expectedESQueries = [
        {
          match_phrase: { extension: { query: 'foo' } },
        },
      ];

      const result = buildQueryFromFilters(filters);

      expect(result.filter).to.eql(expectedESQueries);
    });

    it('should not add query:queryString:options to query_string filters', function () {
      const filters = [
        {
          query: { query_string: { query: 'foo' } },
          meta: { type: 'query_string' },
        },
      ];
      const expectedESQueries = [{ query_string: { query: 'foo' } }];

      const result = buildQueryFromFilters(filters);

      expect(result.filter).to.eql(expectedESQueries);
    });

    it('should convert a saved query filter into an ES query', function () {
      const savedQueryFilter = {
        '$state': {
          store: 'appState',
        },
        meta: {
          alias: null,
          disabled: false,
          key: 'Bytes more than 2000 onlu',
          negate: false,
          params: {
            savedQuery: {
              attributes: {
                description: 'no filters at all',
                query: {
                  language: 'kuery',
                  query: 'bytes >= 2000'
                },
                title: 'Bytes more than 2000 only',
              },
              id: 'Bytes more than 2000 only',
            }
          },
          type: 'savedQuery',
          value: undefined,
        },
        saved_query: 'Bytes more than 2000 only'
      };
      const expectedESQueries = [
        {
          bool: {
            must: [],
            filter: [
              {
                bool: {
                  should: [
                    {
                      range: {
                        bytes: {
                          gte: 2000
                        }
                      }
                    }
                  ],
                  minimum_should_match: 1
                }
              }
            ],
            should: [],
            must_not: []
          }
        }];
      const result = buildQueryFromFilters([savedQueryFilter]);
      expect(result.filter).to.eql(expectedESQueries);
    });
  });
  describe('translateToQuery', function () {
    it('should extract the contents of a saved query', function () {
      const savedQueryFilter = {
        '$state': {
          store: 'appState',
        },
        meta: {
          alias: null,
          disabled: false,
          key: 'Bytes more than 2000 only',
          negate: false,
          params: {
            savedQuery: {
              attributes: {
                description: 'no filters at all',
                query: {
                  language: 'kuery',
                  query: 'bytes >= 2000'
                },
                title: 'Bytes more than 2000 only',
              },
              id: 'Bytes more than 2000 only',
            }
          },
          type: 'savedQuery',
          value: undefined,
        },
        saved_query: 'Bytes more than 2000 only'
      };
      const expectedResult = {
        bool: {
          filter: [
            {
              bool: {
                minimum_should_match: 1,
                should: [{ range: { bytes: { gte: 2000 } } }],
              }
            }
          ],
          must: [],
          must_not: [],
          should: [],
        }
      };
      const result = translateToQuery(savedQueryFilter, { indexPattern });
      expect(result).to.eql(expectedResult);
    });

    it('should extract and translate saved query filters that contain saved query filters', function () {
      const savedQueryFilter = {
        '$state': {
          store: 'appState',
        },
        meta: {
          alias: null,
          disabled: false,
          key: 'Compound',
          negate: false,
          params: {
            savedQuery: {
              attributes: {
                description: 'Compound saved query',
                filters: [
                  {
                    '$state': {
                      store: 'appState',
                    },
                    meta: {
                      alias: null,
                      disabled: false,
                      key: 'Ok response',
                      negate: false,
                      params: {
                        savedQuery: {
                          attributes: {
                            description: 'saved query',
                            query: {
                              language: 'kuery',
                              query: 'response.keyword: 200'
                            },
                            title: 'Ok response',
                          },
                          id: 'Ok response',
                        }
                      },
                      type: 'savedQuery',
                      value: undefined,
                    },
                    saved_query: 'Ok response'
                  }],
                query: {
                  language: 'kuery',
                  query: ''
                },
                title: 'Compound',
              },
              id: 'Compound',
            }
          },
          type: 'savedQuery',
          value: undefined,
        },
        saved_query: 'Compound'
      };
      const expectedResult = {
        bool: {
          filter: [
            {
              match_all: {}
            },
            {
              bool: {
                filter: [
                  {
                    bool: {
                      minimum_should_match: 1,
                      should: [
                        {
                          match: {
                            'response.keyword': 200
                          }
                        }
                      ]
                    }
                  }
                ],
                must: [],
                must_not: [],
                should: [],
              }
            }
          ],
          must: [],
          must_not: [],
          should: [],
        }
      };
      const result = translateToQuery(savedQueryFilter, { indexPattern });
      expect(result).to.eql(expectedResult);
    });
  });
});

