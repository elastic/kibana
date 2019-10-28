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

import expect from '@kbn/expect';
import ngMock from 'ng_mock';
import sinon from 'sinon';

import { FilterBarQueryFilterProvider } from 'ui/filter_manager/query_filter';

import { createStateStub } from './_utils';
import { QueryParameterActionsProvider } from '../actions';


describe('context app', function () {
  beforeEach(ngMock.module('kibana'));

  describe('action addFilter', function () {
    let filterManagerStub;
    let addFilter;

    beforeEach(ngMock.inject(function createPrivateStubs(Private) {
      filterManagerStub = createQueryFilterStub();
      Private.stub(FilterBarQueryFilterProvider, filterManagerStub);

      addFilter = Private(QueryParameterActionsProvider).addFilter;
    }));

    it('should pass the given arguments to the filterManager', function () {
      const state = createStateStub();

      addFilter(state)('FIELD_NAME', 'FIELD_VALUE', 'FILTER_OPERATION');

      const filterManagerAddStub = filterManagerStub.addFilters;
      //get the generated filter
      const generatedFilter = filterManagerAddStub.firstCall.args[0][0];
      const queryKeys = Object.keys(generatedFilter.query.match_phrase);
      expect(filterManagerAddStub.calledOnce).to.be(true);
      expect(queryKeys[0]).to.eql('FIELD_NAME');
      expect(generatedFilter.query.match_phrase[queryKeys[0]]).to.eql('FIELD_VALUE');
    });

    it('should pass the index pattern id to the filterManager', function () {
      const state = createStateStub();

      addFilter(state)('FIELD_NAME', 'FIELD_VALUE', 'FILTER_OPERATION');

      const filterManagerAddStub = filterManagerStub.addFilters;
      const generatedFilter = filterManagerAddStub.firstCall.args[0][0];
      expect(filterManagerAddStub.calledOnce).to.be(true);
      expect(generatedFilter.meta.index).to.eql('INDEX_PATTERN_ID');
    });
  });
});

function createQueryFilterStub() {
  return {
    addFilters: sinon.stub(),
    getAppFilters: sinon.stub(),
  };
}
