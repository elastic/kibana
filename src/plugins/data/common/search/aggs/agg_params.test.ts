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

import { initParams } from './agg_params';
import { BaseParamType } from './param_types/base';
import { FieldParamType } from './param_types/field';
import { OptionedParamType } from './param_types/optioned';
import { AggParamType } from '../aggs/param_types/agg';

describe('AggParams class', () => {
  describe('constructor args', () => {
    it('accepts an array of param defs', () => {
      const params = [{ name: 'one' }, { name: 'two' }] as AggParamType[];
      const aggParams = initParams(params);

      expect(aggParams).toHaveLength(params.length);
      expect(Array.isArray(aggParams)).toBeTruthy();
    });
  });

  describe('AggParam creation', () => {
    it('Uses the FieldParamType class for params with the name "field"', () => {
      const params = [{ name: 'field', type: 'field' }] as AggParamType[];
      const aggParams = initParams(params);

      expect(aggParams).toHaveLength(params.length);
      expect(aggParams[0] instanceof FieldParamType).toBeTruthy();
    });

    it('Uses the OptionedParamType class for params of type "optioned"', () => {
      const params = [
        {
          name: 'order',
          type: 'optioned',
        },
      ] as AggParamType[];
      const aggParams = initParams(params);

      expect(aggParams).toHaveLength(params.length);
      expect(aggParams[0] instanceof OptionedParamType).toBeTruthy();
    });

    it('Always converts the params to a BaseParamType', function () {
      const params = [
        {
          name: 'height',
          displayName: 'height',
        },
        {
          name: 'weight',
          displayName: 'weight',
        },
        {
          name: 'waist',
          displayName: 'waist',
        },
      ] as AggParamType[];

      const aggParams = initParams(params);

      expect(aggParams).toHaveLength(params.length);

      aggParams.forEach((aggParam) => expect(aggParam instanceof BaseParamType).toBeTruthy());
    });
  });
});
