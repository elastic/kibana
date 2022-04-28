/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { initParams } from './agg_params';
import { BaseParamType } from './param_types/base';
import { FieldParamType } from './param_types/field';
import { OptionedParamType } from './param_types/optioned';
import { AggParamType } from './param_types/agg';

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
