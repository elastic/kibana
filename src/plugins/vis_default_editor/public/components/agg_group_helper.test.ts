/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { IAggConfig } from '@kbn/data-plugin/public';
import type { Schema } from '@kbn/visualizations-plugin/public';

import {
  isAggRemovable,
  calcAggIsTooLow,
  isInvalidAggsTouched,
  getEnabledMetricAggsCount,
} from './agg_group_helper';
import { AggsState } from './agg_group_state';

describe('DefaultEditorGroup helpers', () => {
  let group: IAggConfig[];
  let schemas: Schema[];

  beforeEach(() => {
    group = [
      {
        id: '1',
        params: {
          field: {
            type: 'number',
          },
        },
        schema: 'metric',
      } as IAggConfig,
      {
        id: '2',
        params: {
          field: {
            type: 'string',
          },
        },
        schema: 'metric2',
      } as IAggConfig,
    ];
    schemas = [
      {
        name: 'metric',
        title: 'Metric',
        group: 'metrics',
        min: 0,
        max: 3,
        aggFilter: [],
        params: [],
        defaults: null,
        mustBeFirst: true,
      },
      {
        name: 'metric2',
        title: 'Metric',
        group: 'metrics',
        min: 2,
        max: 3,
        aggFilter: [],
        params: [],
        defaults: null,
      },
    ];
  });

  describe('isAggRemovable', () => {
    it('should return true when the number of aggs with the same schema is above the min', () => {
      const isRemovable = isAggRemovable(group[0], group, schemas);

      expect(isRemovable).toBeTruthy();
    });

    it('should return false when the number of aggs with the same schema is not above the min', () => {
      const isRemovable = isAggRemovable(group[1], group, schemas);

      expect(isRemovable).toBeFalsy();
    });
  });

  describe('getEnabledMetricAggsCount', () => {
    it('should return 1 when there is the only enabled agg', () => {
      group[0].enabled = true;
      const enabledAggs = getEnabledMetricAggsCount(group);

      expect(enabledAggs).toBe(1);
    });

    it('should return 2 when there are multiple enabled aggs', () => {
      group[0].enabled = true;
      group[1].enabled = true;
      group[1].schema = 'metric';
      const enabledAggs = getEnabledMetricAggsCount(group);

      expect(enabledAggs).toBe(2);
    });
  });

  describe('calcAggIsTooLow', () => {
    it('should return false when agg.schema.mustBeFirst has falsy value', () => {
      const isRemovable = calcAggIsTooLow(group[1], 0, group, schemas);

      expect(isRemovable).toBeFalsy();
    });

    it('should return false when there is no different schema', () => {
      group[1].schema = group[0].schema;
      const isRemovable = calcAggIsTooLow(group[0], 0, group, schemas);

      expect(isRemovable).toBeFalsy();
    });

    it('should return false when different schema is not less than agg index', () => {
      const isRemovable = calcAggIsTooLow(group[0], 0, group, schemas);

      expect(isRemovable).toBeFalsy();
    });

    it('should return true when agg index is greater than different schema index', () => {
      const isRemovable = calcAggIsTooLow(group[0], 2, group, schemas);

      expect(isRemovable).toBeTruthy();
    });
  });

  describe('isInvalidAggsTouched', () => {
    let aggsState: AggsState;

    beforeEach(() => {
      aggsState = {
        1: {
          valid: true,
          touched: false,
        },
        2: {
          valid: true,
          touched: false,
        },
        3: {
          valid: true,
          touched: false,
        },
      };
    });

    it('should return false when there are no invalid aggs', () => {
      const isAllInvalidAggsTouched = isInvalidAggsTouched(aggsState);

      expect(isAllInvalidAggsTouched).toBeFalsy();
    });

    it('should return false when not all invalid aggs are touched', () => {
      aggsState[1].valid = false;
      const isAllInvalidAggsTouched = isInvalidAggsTouched(aggsState);

      expect(isAllInvalidAggsTouched).toBeFalsy();
    });

    it('should return true when all invalid aggs are touched', () => {
      aggsState[1].valid = false;
      aggsState[1].touched = true;
      const isAllInvalidAggsTouched = isInvalidAggsTouched(aggsState);

      expect(isAllInvalidAggsTouched).toBeTruthy();
    });
  });
});
