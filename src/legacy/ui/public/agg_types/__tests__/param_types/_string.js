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

import _ from 'lodash';
import expect from '@kbn/expect';
import { BaseParamType } from '../../param_types/base';
import { StringParamType } from '../../param_types/string';

// eslint-disable-next-line import/no-default-export
export default describe('String', function() {
  const paramName = 'json_test';
  let aggParam;
  let aggConfig;
  let output;

  function initAggParam(config) {
    config = config || {};
    const defaults = {
      name: paramName,
      type: 'string',
    };

    aggParam = new StringParamType(_.defaults(config, defaults));
  }

  // fetch our deps
  beforeEach(function() {
    aggConfig = { params: {} };
    output = { params: {} };
  });

  describe('constructor', function() {
    it('it is an instance of BaseParamType', function() {
      initAggParam();
      expect(aggParam).to.be.a(BaseParamType);
    });
  });

  describe('write', function() {
    it('should append param by name', function() {
      const paramName = 'testing';
      const params = {};
      params[paramName] = 'some input';

      initAggParam({ name: paramName });

      aggConfig.params = params;
      aggParam.write(aggConfig, output);

      expect(output.params).to.eql(params);
    });

    it('should not be in output with empty input', function() {
      const paramName = 'more_testing';
      const params = {};
      params[paramName] = '';

      initAggParam({ name: paramName });

      aggConfig.params = params;
      aggParam.write(aggConfig, output);

      expect(output.params).to.eql({});
    });
  });
});
