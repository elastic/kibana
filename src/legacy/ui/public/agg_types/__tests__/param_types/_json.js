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
import { JsonParamType } from '../../param_types/json';

// eslint-disable-next-line import/no-default-export
export default describe('JSON', function() {
  const paramName = 'json_test';
  let aggParam;
  let aggConfig;
  let output;

  function initParamType(config) {
    config = config || {};
    const defaults = {
      name: paramName,
      type: 'json',
    };

    aggParam = new JsonParamType(_.defaults(config, defaults));
  }

  // fetch out deps
  beforeEach(function() {
    aggConfig = { params: {} };
    output = { params: {} };

    initParamType();
  });

  describe('constructor', function() {
    it('it is an instance of BaseParamType', function() {
      expect(aggParam).to.be.a(BaseParamType);
    });
  });

  describe('write', function() {
    it('should do nothing when param is not defined', function() {
      expect(aggConfig.params).not.to.have.property(paramName);

      aggParam.write(aggConfig, output);
      expect(output).not.to.have.property(paramName);
    });

    it('should not append param when invalid JSON', function() {
      aggConfig.params[paramName] = 'i am not json';

      aggParam.write(aggConfig, output);
      expect(aggConfig.params).to.have.property(paramName);
      expect(output).not.to.have.property(paramName);
    });

    it('should append param when valid JSON', function() {
      const jsonData = JSON.stringify({
        new_param: 'should exist in output',
      });

      output.params.existing = 'true';
      aggConfig.params[paramName] = jsonData;

      aggParam.write(aggConfig, output);
      expect(aggConfig.params).to.have.property(paramName);
      expect(output.params).to.eql({
        existing: 'true',
        new_param: 'should exist in output',
      });
    });

    it('should not overwrite existing params', function() {
      const jsonData = JSON.stringify({
        new_param: 'should exist in output',
        existing: 'should be used',
      });

      output.params.existing = 'true';
      aggConfig.params[paramName] = jsonData;

      aggParam.write(aggConfig, output);
      expect(output.params).to.eql(JSON.parse(jsonData));
    });

    it('should drop nulled params', function() {
      const jsonData = JSON.stringify({
        new_param: 'should exist in output',
        field: null,
      });

      output.params.field = 'extensions';
      aggConfig.params[paramName] = jsonData;

      aggParam.write(aggConfig, output);
      expect(Object.keys(output.params)).to.contain('new_param');
      expect(Object.keys(output.params)).to.not.contain('field');
    });
  });
});
