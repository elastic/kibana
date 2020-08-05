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
import '../global_state';

describe('State Management', function () {
  let $location;
  let state;

  beforeEach(ngMock.module('kibana'));
  beforeEach(
    ngMock.inject(function (_$location_, globalState) {
      $location = _$location_;
      state = globalState;
    })
  );

  describe('Global State', function () {
    it('should use previous state when not in URL', function () {
      // set satte via URL
      $location.search({ _g: '(foo:(bar:baz))' });
      state.fetch();
      expect(state.toObject()).to.eql({ foo: { bar: 'baz' } });

      $location.search({ _g: '(fizz:buzz)' });
      state.fetch();
      expect(state.toObject()).to.eql({ fizz: 'buzz' });

      $location.search({});
      state.fetch();
      expect(state.toObject()).to.eql({ fizz: 'buzz' });
    });
  });
});
