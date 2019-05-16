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

export const MODEL_OPTIONS = {
  UNWEIGHTED: {
    NAME: 'Simple',
    TYPE: 'simple',
  },
  WEIGHTED_EXPONENTIAL: {
    NAME: 'Exponentially Weighted',
    TYPE: 'ewma',
  },
  WEIGHTED_EXPONENTIAL_DOUBLE: {
    NAME: 'Holt-Linear',
    TYPE: 'holt',
  },
  WEIGHTED_EXPONENTIAL_TRIPLE: {
    NAME: 'Holt-Winters',
    TYPE: 'holt_winters',
  },
  WEIGHTED_LINEAR: {
    NAME: 'Linear',
    TYPE: 'linear',
  },
};

const MODEL_SCRIPTS = new Map();

MODEL_SCRIPTS.set(MODEL_OPTIONS.UNWEIGHTED.TYPE, 'MovingFunctions.unweightedAvg(values)');
MODEL_SCRIPTS.set(MODEL_OPTIONS.WEIGHTED_EXPONENTIAL.TYPE, 'MovingFunctions.ewma(values)');
MODEL_SCRIPTS.set(MODEL_OPTIONS.WEIGHTED_EXPONENTIAL_DOUBLE.TYPE, 'MovingFunctions.holt(values)');
MODEL_SCRIPTS.set(MODEL_OPTIONS.WEIGHTED_EXPONENTIAL_TRIPLE.TYPE, 'MovingFunctions.holtWinters(values)');
MODEL_SCRIPTS.set(MODEL_OPTIONS.WEIGHTED_LINEAR.TYPE, 'MovingFunctions.linearWeightedAvg(values)');

export function getModuleScript(type) {
  return MODEL_SCRIPTS.get(type);
}

export { MODEL_SCRIPTS };
