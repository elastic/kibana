/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { MODEL_TYPES } from '../../../../common/enums';
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
