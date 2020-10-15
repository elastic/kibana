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

export const MODEL_SCRIPTS = {
  [MODEL_TYPES.UNWEIGHTED]: () => 'MovingFunctions.unweightedAvg(values)',
  [MODEL_TYPES.WEIGHTED_EXPONENTIAL]: ({ alpha }) => `MovingFunctions.ewma(values, ${alpha})`,
  [MODEL_TYPES.WEIGHTED_EXPONENTIAL_DOUBLE]: ({ alpha, beta }) =>
    `MovingFunctions.holt(values, ${alpha}, ${beta})`,
  [MODEL_TYPES.WEIGHTED_EXPONENTIAL_TRIPLE]: ({ alpha, beta, gamma, period, multiplicative }) =>
    `if (values.length > ${period}*2) {MovingFunctions.holtWinters(values, ${alpha}, ${beta}, ${gamma}, ${period}, ${multiplicative})}`,
  [MODEL_TYPES.WEIGHTED_LINEAR]: () => 'MovingFunctions.linearWeightedAvg(values)',
};
