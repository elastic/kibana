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
import { pluginInstance } from 'plugins/kibana/discover/index';

import { createStateStub } from './_utils';
import { getQueryParameterActions } from '../../np_ready/angular/context/query_parameters/actions';

describe('context app', function() {
  beforeEach(() => pluginInstance.initializeInnerAngular());
  beforeEach(() => pluginInstance.initializeServices());
  beforeEach(ngMock.module('app/discover'));

  describe('action setSuccessorCount', function() {
    let setSuccessorCount;

    beforeEach(
      ngMock.inject(function createPrivateStubs() {
        setSuccessorCount = getQueryParameterActions().setSuccessorCount;
      })
    );

    it('should set the successorCount to the given value', function() {
      const state = createStateStub();

      setSuccessorCount(state)(20);

      expect(state.queryParameters.successorCount).to.equal(20);
    });

    it('should limit the successorCount to 0 as a lower bound', function() {
      const state = createStateStub();

      setSuccessorCount(state)(-1);

      expect(state.queryParameters.successorCount).to.equal(0);
    });

    it('should limit the successorCount to 10000 as an upper bound', function() {
      const state = createStateStub();

      setSuccessorCount(state)(20000);

      expect(state.queryParameters.successorCount).to.equal(10000);
    });
  });
});
