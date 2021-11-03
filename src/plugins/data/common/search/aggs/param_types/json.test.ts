/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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

      expect(output.params).toMatchInlineSnapshot(`
        Object {
          "existing": "true",
          "new_param": "should exist in output",
        }
      `);
    });

    it('should append param when valid JSON with triple quotes', () => {
      const aggParam = initAggParam();
      const jsonData = `{
      "a": """
        multiline string - line 1
      """
      }`;

      aggConfig.params[paramName] = jsonData;

      aggParam.write(aggConfig, output);
      expect(aggConfig.params).toHaveProperty(paramName);

      expect(output.params).toMatchInlineSnapshot(`
        Object {
          "a": "
                multiline string - line 1
              ",
        }
      `);
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
