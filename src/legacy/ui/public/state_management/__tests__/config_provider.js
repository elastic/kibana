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
import '../config_provider';

describe('State Management Config', function () {
  let stateManagementConfig;

  describe('is enabled', () => {
    beforeEach(ngMock.module('kibana'));
    beforeEach(ngMock.inject(function (_stateManagementConfig_) {
      stateManagementConfig = _stateManagementConfig_;
    }));

    it('should be enabled by default', () => {
      expect(stateManagementConfig.enabled).to.be(true);
    });
  });

  describe('can be disabled', () => {
    beforeEach(ngMock.module('kibana', function (stateManagementConfigProvider) {
      stateManagementConfigProvider.disable();
    }));

    beforeEach(ngMock.inject(function (_stateManagementConfig_) {
      stateManagementConfig = _stateManagementConfig_;
    }));

    it('is disabled by config', () => {
      expect(stateManagementConfig.enabled).to.be(false);
    });
  });
});
