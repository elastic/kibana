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

import { BaseParamType } from './base';
import { JsonParamType } from './json';
import { IAggConfig } from '../agg_config';

describe('JSON', function () {
  const paramName = 'json_test';
  let aggConfig: IAggConfig;
  let output: Record<string, any>;

  const initAggParam = (config: Record<string, any> = {}) =>
    new JsonParamType({
      ...config,
      type: 'json',
      name: paramName,
    });

  beforeEach(function () {
    aggConfig = { params: {} } as IAggConfig;
    output = { params: {} };
  });

  describe('constructor', () => {
    it('it is an instance of BaseParamType', () => {
      const aggParam = initAggParam();

      expect(aggParam instanceof BaseParamType).toBeTruthy();
    });
  });

  describe('write', () => {
    it('should do nothing when param is not defined', () => {
      const aggParam = initAggParam();

      expect(aggConfig.params).not.toHaveProperty(paramName);

      aggParam.write(aggConfig, output);
      expect(output).not.toHaveProperty(paramName);
    });

    it('should not append param when invalid JSON', () => {
      const aggParam = initAggParam();

      aggConfig.params[paramName] = 'i am not json';

      aggParam.write(aggConfig, output);
      expect(aggConfig.params).toHaveProperty(paramName);
      expect(output).not.toHaveProperty(paramName);
    });

    it('should append param when valid JSON', () => {
      const aggParam = initAggParam();
      const jsonData = JSON.stringify({
        new_param: 'should exist in output',
      });

      output.params.existing = 'true';
      aggConfig.params[paramName] = jsonData;

      aggParam.write(aggConfig, output);
      expect(aggConfig.params).toHaveProperty(paramName);

      expect(output.params).toEqual({
        existing: 'true',
        new_param: 'should exist in output',
      });
    });

    it('should not overwrite existing params', () => {
      const aggParam = initAggParam();
      const jsonData = JSON.stringify({
        new_param: 'should exist in output',
        existing: 'should be used',
      });

      output.params.existing = 'true';
      aggConfig.params[paramName] = jsonData;

      aggParam.write(aggConfig, output);
      expect(output.params).toEqual(JSON.parse(jsonData));
    });

    it('should drop nulled params', () => {
      const aggParam = initAggParam();
      const jsonData = JSON.stringify({
        new_param: 'should exist in output',
        field: null,
      });

      output.params.field = 'extensions';
      aggConfig.params[paramName] = jsonData;

      aggParam.write(aggConfig, output);
      expect(Object.keys(output.params)).toContain('new_param');
      expect(Object.keys(output.params)).not.toContain('field');
    });
  });
});
