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

import { FilterManagerProvider } from 'ui/filter_manager';

import { createStateStub } from './_utils';
import { QueryParameterActionsProvider } from '../actions';


describe('context app', function () {
  beforeEach(ngMock.module('kibana'));

  describe('action increasePredecessorCount', function () {
    let increasePredecessorCount;

    beforeEach(ngMock.inject(function createPrivateStubs(Private) {
      Private.stub(FilterManagerProvider, {});

      increasePredecessorCount = Private(QueryParameterActionsProvider).increasePredecessorCount;
    }));

    it('should increase the predecessorCount by the given value', function () {
      const state = createStateStub();

      increasePredecessorCount(state)(20);

      expect(state.queryParameters.predecessorCount).to.equal(30);
    });

    it('should increase the predecessorCount by the default step size if not value is given', function () {
      const state = createStateStub();

      increasePredecessorCount(state)();

      expect(state.queryParameters.predecessorCount).to.equal(13);
    });

    it('should limit the predecessorCount to 0 as a lower bound', function () {
      const state = createStateStub();

      increasePredecessorCount(state)(-20);

      expect(state.queryParameters.predecessorCount).to.equal(0);
    });

    it('should limit the predecessorCount to 10000 as an upper bound', function () {
      const state = createStateStub();

      increasePredecessorCount(state)(20000);

      expect(state.queryParameters.predecessorCount).to.equal(10000);
    });
  });
});
