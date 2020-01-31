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

import { addFilter } from '../../actions/filter';
import StubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
import NoDigestPromises from 'test_utils/no_digest_promises';
import expect from '@kbn/expect';
import ngMock from 'ng_mock';
import sinon from 'sinon';

function getFilterGeneratorStub() {
  return {
    add: sinon.stub(),
  };
}

describe('doc table filter actions', function() {
  NoDigestPromises.activateForSuite();

  let filterGen;
  let indexPattern;

  beforeEach(
    ngMock.module('kibana', 'kibana/courier', function($provide) {
      $provide.service('indexPatterns', require('fixtures/mock_index_patterns'));
    })
  );

  beforeEach(
    ngMock.inject(function(Private) {
      indexPattern = Private(StubbedLogstashIndexPatternProvider);
      filterGen = getFilterGeneratorStub();
    })
  );

  describe('add', function() {
    it('should defer to the FilterManager when dealing with a lucene query', function() {
      const state = {
        query: { query: 'foo', language: 'lucene' },
      };
      const args = ['foo', ['bar'], '+', indexPattern];
      addFilter('foo', ['bar'], '+', indexPattern, state, filterGen);
      expect(filterGen.add.calledOnce).to.be(true);
      expect(filterGen.add.calledWith(...args)).to.be(true);
    });
  });
});
