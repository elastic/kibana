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

import ngMock from 'ng_mock';
import expect from '@kbn/expect';

import StubIndexPatternProvider from 'test_utils/stub_index_pattern';

import { SerializeFetchParamsProvider } from '../serialize_fetch_params_provider';

describe('SerializeFetchParamsProvider', () => {
  let serializeFetchParams;
  let IndexPattern;

  require('test_utils/no_digest_promises').activateForSuite();

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject((Private) => {
    serializeFetchParams = Private(SerializeFetchParamsProvider);
    IndexPattern = Private(StubIndexPatternProvider);
  }));

  describe('when passed IndexPatterns', () => {
    it(' that are out of range, queries .kibana', () => {
      // Check out https://github.com/elastic/kibana/issues/10905 for the reasons behind this
      // test. When an IndexPattern is out of time range, it returns an array that is then stored in a cache.  This
      // cached object was being modified in a following function, which was a subtle side affect - it looked like
      // only a local change.
      const indexPattern = new IndexPattern('logstash-*', null, []);
      // Stub the call so it looks like the request returns an empty list, which will happen if the time range
      // selected doesn't contain any data for the particular index.
      indexPattern.toIndexList = () => Promise.resolve([]);
      const reqsFetchParams = [
        {
          index: indexPattern,
          type: 'planet',
          search_type: 'water',
          body: { foo: 'earth' }
        },
        {
          index: indexPattern,
          type: 'planet',
          search_type: 'rings',
          body: { foo: 'saturn' }
        }
      ];
      return serializeFetchParams(reqsFetchParams).then(value => {
        const indexLineMatch = value.match(/"index":\[".kibana"\]/g);
        expect(indexLineMatch).to.not.be(null);
        expect(indexLineMatch.length).to.be(2);
        const queryLineMatch = value.match(/"query":\{"bool":\{"must_not":\[\{"match_all":\{\}\}\]\}\}/g);
        expect(queryLineMatch).to.not.be(null);
        expect(queryLineMatch.length).to.be(2);
      });
    });
  });
});
