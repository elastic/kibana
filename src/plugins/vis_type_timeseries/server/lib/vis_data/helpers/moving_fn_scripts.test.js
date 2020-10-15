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

import { MODEL_TYPES } from '../../../../common/model_options';
import { MODEL_SCRIPTS } from './moving_fn_scripts';

describe('src/legacy/core_plugins/metrics/server/lib/vis_data/helpers/moving_fn_scripts.js', () => {
  describe('MODEL_SCRIPTS', () => {
    let bucket;

    beforeEach(() => {
      bucket = {
        alpha: 0.1,
        beta: 0.2,
        gamma: 0.3,
        period: 5,
        multiplicative: true,
      };
    });

    test('should return an expected result of the UNWEIGHTED model type', () => {
      expect(MODEL_SCRIPTS[MODEL_TYPES.UNWEIGHTED](bucket)).toBe(
        'MovingFunctions.unweightedAvg(values)'
      );
    });

    test('should return an expected result of the WEIGHTED_LINEAR model type', () => {
      expect(MODEL_SCRIPTS[MODEL_TYPES.WEIGHTED_LINEAR](bucket)).toBe(
        'MovingFunctions.linearWeightedAvg(values)'
      );
    });

    test('should return an expected result of the WEIGHTED_EXPONENTIAL model type', () => {
      const { alpha } = bucket;

      expect(MODEL_SCRIPTS[MODEL_TYPES.WEIGHTED_EXPONENTIAL](bucket)).toBe(
        `MovingFunctions.ewma(values, ${alpha})`
      );
    });

    test('should return an expected result of the WEIGHTED_EXPONENTIAL_DOUBLE model type', () => {
      const { alpha, beta } = bucket;

      expect(MODEL_SCRIPTS[MODEL_TYPES.WEIGHTED_EXPONENTIAL_DOUBLE](bucket)).toBe(
        `MovingFunctions.holt(values, ${alpha}, ${beta})`
      );
    });

    test('should return an expected result of the WEIGHTED_EXPONENTIAL_TRIPLE model type', () => {
      const { alpha, beta, gamma, period, multiplicative } = bucket;

      expect(MODEL_SCRIPTS[MODEL_TYPES.WEIGHTED_EXPONENTIAL_TRIPLE](bucket)).toBe(
        `if (values.length > ${period}*2) {MovingFunctions.holtWinters(values, ${alpha}, ${beta}, ${gamma}, ${period}, ${multiplicative})}`
      );
    });
  });
});
