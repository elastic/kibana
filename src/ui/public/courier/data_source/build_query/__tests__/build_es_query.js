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

import { BuildESQueryProvider } from '../build_es_query';
import StubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
import ngMock from 'ng_mock';
import { expectDeepEqual } from '../../../../../../test_utils/expect_deep_equal.js';
import { fromKueryExpression, toElasticsearchQuery } from '../../../../kuery';
import { luceneStringToDsl } from '../lucene_string_to_dsl';
import { decorateQuery } from '../../_decorate_query';

let indexPattern;
let buildEsQuery;

describe('build query', function () {

  describe('buildESQuery', function () {

    beforeEach(ngMock.module('kibana'));
    beforeEach(ngMock.inject(function (Private) {
      indexPattern = Private(StubbedLogstashIndexPatternProvider);
      buildEsQuery = Private(BuildESQueryProvider);
    }));

    it('should return the parameters of an Elasticsearch bool query', function () {
      const result = buildEsQuery();
      const expected = {
        bool: {
          must: [],
          filter: [],
          should: [],
          must_not: [],
        }
      };
      expectDeepEqual(result, expected);
    });

    it('should combine queries and filters from multiple query languages into a single ES bool query', function () {
      const queries = [
        { query: 'extension:jpg', language: 'kuery' },
        { query: 'bar:baz', language: 'lucene' },
      ];
      const filters = [
        {
          match_all: {},
          meta: { type: 'match_all' },
        },
      ];

      const expectedResult = {
        bool: {
          must: [
            decorateQuery(luceneStringToDsl('bar:baz')),
            { match_all: {} },
          ],
          filter: [
            toElasticsearchQuery(fromKueryExpression('extension:jpg'), indexPattern),
          ],
          should: [],
          must_not: [],
        }
      };

      const result = buildEsQuery(indexPattern, queries, filters);

      expectDeepEqual(result, expectedResult);
    });

  });

});
