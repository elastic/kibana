/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { MODEL_TYPES } from '../../../../common/model_options';

export const MODEL_SCRIPTS = {
  [MODEL_TYPES.UNWEIGHTED]: () => 'MovingFunctions.unweightedAvg(values)',
  [MODEL_TYPES.WEIGHTED_EXPONENTIAL]: ({ alpha }) => `MovingFunctions.ewma(values, ${alpha})`,
  [MODEL_TYPES.WEIGHTED_EXPONENTIAL_DOUBLE]: ({ alpha, beta }) =>
    `MovingFunctions.holt(values, ${alpha}, ${beta})`,
  [MODEL_TYPES.WEIGHTED_EXPONENTIAL_TRIPLE]: ({ alpha, beta, gamma, period, multiplicative }) =>
    `if (values.length > ${period}*2) {MovingFunctions.holtWinters(values, ${alpha}, ${beta}, ${gamma}, ${period}, ${multiplicative})}`,
  [MODEL_TYPES.WEIGHTED_LINEAR]: () => 'MovingFunctions.linearWeightedAvg(values)',
};
