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
import { getQueryParameterActions } from '../actions';

describe('context app', function() {
  beforeEach(() => pluginInstance.initializeInnerAngular());
  beforeEach(() => pluginInstance.initializeServices());
  beforeEach(ngMock.module('app/discover'));

  describe('action setQueryParameters', function() {
    let setQueryParameters;

    beforeEach(
      ngMock.inject(function createPrivateStubs() {
        setQueryParameters = getQueryParameterActions().setQueryParameters;
      })
    );

    it('should update the queryParameters with valid properties from the given object', function() {
      const state = createStateStub({
        queryParameters: {
          additionalParameter: 'ADDITIONAL_PARAMETER',
        },
      });

      setQueryParameters(state)({
        anchorId: 'ANCHOR_ID',
        columns: ['column'],
        defaultStepSize: 3,
        filters: ['filter'],
        indexPatternId: 'INDEX_PATTERN',
        predecessorCount: 100,
        successorCount: 100,
        sort: ['field'],
      });

      expect(state.queryParameters).to.eql({
        additionalParameter: 'ADDITIONAL_PARAMETER',
        anchorId: 'ANCHOR_ID',
        columns: ['column'],
        defaultStepSize: 3,
        filters: ['filter'],
        indexPatternId: 'INDEX_PATTERN',
        predecessorCount: 100,
        successorCount: 100,
        sort: ['field'],
      });
    });

    it('should ignore invalid properties', function() {
      const state = createStateStub();

      setQueryParameters(state)({
        additionalParameter: 'ADDITIONAL_PARAMETER',
      });

      expect(state.queryParameters).to.eql(createStateStub().queryParameters);
    });
  });
});
