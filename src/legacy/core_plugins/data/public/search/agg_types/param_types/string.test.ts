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
import { StringParamType } from './string';
import { AggConfig } from '../agg_config';

jest.mock('ui/new_platform');

describe('String', function() {
  let paramName = 'json_test';
  let aggConfig: AggConfig;
  let output: Record<string, any>;

  const initAggParam = (config: Record<string, any> = {}) =>
    new StringParamType({
      ...config,
      type: 'string',
      name: paramName,
    });

  beforeEach(() => {
    aggConfig = { params: {} } as AggConfig;
    output = { params: {} };
  });

  describe('constructor', () => {
    it('it is an instance of BaseParamType', () => {
      const aggParam = initAggParam();

      expect(aggParam instanceof BaseParamType).toBeTruthy();
    });
  });

  describe('write', () => {
    it('should append param by name', () => {
      const params = {
        [paramName]: 'some input',
      };

      const aggParam = initAggParam({ name: paramName });

      aggConfig.params = params;
      aggParam.write(aggConfig, output);

      expect(output.params).toEqual(params);
    });

    it('should not be in output with empty input', () => {
      paramName = 'more_testing';

      const params = {
        [paramName]: '',
      };

      const aggParam = initAggParam({ name: paramName });

      aggConfig.params = params;
      aggParam.write(aggConfig, output);

      expect(output.params).toEqual({});
    });
  });
});
