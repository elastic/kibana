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

import { AggConfig } from '../../../../agg_types/agg_config';
import {
  isAggRemovable,
  calcAggIsTooLow,
  isInvalidAggsTouched,
  getEnabledMetricAggsCount,
} from './agg_group_helper';
import { AggsState } from './agg_group_state';

describe('DefaultEditorGroup helpers', () => {
  let group: AggConfig[];

  beforeEach(() => {
    group = [
      {
        id: '1',
        params: {
          field: {
            type: 'number',
          },
        },
        schema: { name: 'metric', min: 1, mustBeFirst: true },
      } as AggConfig,
      {
        id: '2',
        params: {
          field: {
            type: 'string',
          },
        },
        schema: { name: 'metric', min: 2 },
      } as AggConfig,
    ];
  });

  describe('isAggRemovable', () => {
    it('should return true when the number of aggs with the same schema is above the min', () => {
      const isRemovable = isAggRemovable(group[0], group);

      expect(isRemovable).toBeTruthy();
    });

    it('should return false when the number of aggs with the same schema is not above the min', () => {
      const isRemovable = isAggRemovable(group[1], group);

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
      const enabledAggs = getEnabledMetricAggsCount(group);

      expect(enabledAggs).toBe(2);
    });
  });

  describe('calcAggIsTooLow', () => {
    it('should return false when agg.schema.mustBeFirst has falsy value', () => {
      const isRemovable = calcAggIsTooLow(group[1], 0, group);

      expect(isRemovable).toBeFalsy();
    });

    it('should return false when there is no different schema', () => {
      group[1].schema = group[0].schema;
      const isRemovable = calcAggIsTooLow(group[0], 0, group);

      expect(isRemovable).toBeFalsy();
    });

    it('should return false when different schema is not less than agg index', () => {
      const isRemovable = calcAggIsTooLow(group[0], 0, group);

      expect(isRemovable).toBeFalsy();
    });

    it('should return true when agg index is greater than different schema index', () => {
      const isRemovable = calcAggIsTooLow(group[0], 2, group);

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
