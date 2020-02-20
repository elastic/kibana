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

import sinon from 'sinon';
import searchResponse from 'fixtures/search_response';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';

export default function stubSearchSource(Private, $q, Promise) {
  let deferedResult = $q.defer();
  const indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);

  let onResultsCount = 0;
  return {
    setField: sinon.spy(),
    fetch: sinon.spy(),
    destroy: sinon.spy(),
    getField: function(param) {
      switch (param) {
        case 'index':
          return indexPattern;
        default:
          throw new Error(`Param "${param}" is not implemented in the stubbed search source`);
      }
    },
    crankResults: function() {
      deferedResult.resolve(searchResponse);
      deferedResult = $q.defer();
    },
    onResults: function() {
      onResultsCount++;

      // Up to the test to resolve this manually
      // For example:
      // someHandler.resolve(require('fixtures/search_response'))
      return deferedResult.promise;
    },
    getOnResultsCount: function() {
      return onResultsCount;
    },
    _flatten: function() {
      return Promise.resolve({ index: indexPattern, body: {} });
    },
    _requestStartHandlers: [],
    onRequestStart(fn) {
      this._requestStartHandlers.push(fn);
    },
    requestIsStopped() {},
  };
}
