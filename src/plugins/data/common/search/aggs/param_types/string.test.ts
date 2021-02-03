/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { BaseParamType } from './base';
import { StringParamType } from './string';
import { IAggConfig } from '../agg_config';

describe('String', function () {
  let paramName = 'json_test';
  let aggConfig: IAggConfig;
  let output: Record<string, any>;

  const initAggParam = (config: Record<string, any> = {}) =>
    new StringParamType({
      ...config,
      type: 'string',
      name: paramName,
    });

  beforeEach(() => {
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
