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
import expect from '@kbn/expect';
import ngMock from 'ng_mock';
import { AppStateProvider } from '../app_state';

describe('State Management', function () {
  let $rootScope;
  let AppState;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (_$rootScope_, _$location_, Private) {
    $rootScope = _$rootScope_;
    AppState = Private(AppStateProvider);
  }));

  describe('App State', function () {
    let appState;

    beforeEach(function () {
      appState = new AppState();
    });

    it('should have _urlParam of _a', function () {
      expect(appState).to.have.property('_urlParam');
      expect(appState._urlParam).to.equal('_a');
    });

    it('should use passed in params', function () {
      const params = {
        test: true,
        mock: false
      };

      appState = new AppState(params);
      expect(appState).to.have.property('_defaults');

      Object.keys(params).forEach(function (key) {
        expect(appState._defaults).to.have.property(key);
        expect(appState._defaults[key]).to.equal(params[key]);
      });
    });

    it('should have a destroy method', function () {
      expect(appState).to.have.property('destroy');
    });

    it('should be destroyed on $routeChangeStart', function () {
      const destroySpy = sinon.spy(appState, 'destroy');

      $rootScope.$emit('$routeChangeStart');

      expect(destroySpy.callCount).to.be(1);
    });
  });
});
