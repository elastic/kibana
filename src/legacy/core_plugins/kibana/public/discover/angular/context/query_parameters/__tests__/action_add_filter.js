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
import { createStateStub } from './_utils';
import { getQueryParameterActions } from '../actions';
import { createIndexPatternsStub } from '../../api/__tests__/_stubs';
import { pluginInstance } from 'plugins/kibana/discover/index';
import { npStart } from 'ui/new_platform';

describe('context app', function() {
  beforeEach(() => pluginInstance.initializeInnerAngular());
  beforeEach(() => pluginInstance.initializeServices(true));
  beforeEach(ngMock.module('app/discover'));
  beforeEach(
    ngMock.module(function createServiceStubs($provide) {
      $provide.value('indexPatterns', createIndexPatternsStub());
    })
  );

  describe('action addFilter', function() {
    let addFilter;

    beforeEach(
      ngMock.inject(function createPrivateStubs() {
        addFilter = getQueryParameterActions().addFilter;
      })
    );

    it('should pass the given arguments to the filterManager', function() {
      const state = createStateStub();
      const filterManagerAddStub = npStart.plugins.data.query.filterManager.addFilters;

      addFilter(state)('FIELD_NAME', 'FIELD_VALUE', 'FILTER_OPERATION');

      //get the generated filter
      const generatedFilter = filterManagerAddStub.firstCall.args[0][0];
      const queryKeys = Object.keys(generatedFilter.query.match_phrase);
      expect(filterManagerAddStub.calledOnce).to.be(true);
      expect(queryKeys[0]).to.eql('FIELD_NAME');
      expect(generatedFilter.query.match_phrase[queryKeys[0]]).to.eql('FIELD_VALUE');
    });

    it('should pass the index pattern id to the filterManager', function() {
      const state = createStateStub();
      const filterManagerAddStub = npStart.plugins.data.query.filterManager.addFilters;

      addFilter(state)('FIELD_NAME', 'FIELD_VALUE', 'FILTER_OPERATION');

      const generatedFilter = filterManagerAddStub.firstCall.args[0][0];
      expect(generatedFilter.meta.index).to.eql('INDEX_PATTERN_ID');
    });
  });
});
