/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { MODEL_TYPES } from '../../../../common/enums';
import { Metric } from '../../../../common/types';

export const MODEL_SCRIPTS = {
  [MODEL_TYPES.UNWEIGHTED]: () => 'MovingFunctions.unweightedAvg(values)',
  [MODEL_TYPES.WEIGHTED_EXPONENTIAL]: ({ alpha }: { alpha?: Metric['alpha'] }) =>
    `MovingFunctions.ewma(values, ${alpha})`,
  [MODEL_TYPES.WEIGHTED_EXPONENTIAL_DOUBLE]: ({
    alpha,
    beta,
  }: {
    alpha?: Metric['alpha'];
    beta?: Metric['beta'];
  }) => `MovingFunctions.holt(values, ${alpha}, ${beta})`,
  [MODEL_TYPES.WEIGHTED_EXPONENTIAL_TRIPLE]: ({
    alpha,
    beta,
    gamma,
    period,
    multiplicative,
  }: {
    alpha?: Metric['alpha'];
    beta?: Metric['beta'];
    gamma?: Metric['gamma'];
    period?: Metric['period'];
    multiplicative?: Metric['multiplicative'];
  }) =>
    `if (values.length > ${period}*2) {MovingFunctions.holtWinters(values, ${alpha}, ${beta}, ${gamma}, ${period}, ${multiplicative})}`,
  [MODEL_TYPES.WEIGHTED_LINEAR]: () => 'MovingFunctions.linearWeightedAvg(values)',
};
