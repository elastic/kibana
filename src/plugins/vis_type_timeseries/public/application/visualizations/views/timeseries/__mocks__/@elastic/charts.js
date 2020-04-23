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

export const CurveType = {
  CURVE_CARDINAL: 0,
  CURVE_NATURAL: 1,
  CURVE_MONOTONE_X: 2,
  CURVE_MONOTONE_Y: 3,
  CURVE_BASIS: 4,
  CURVE_CATMULL_ROM: 5,
  CURVE_STEP: 6,
  CURVE_STEP_AFTER: 7,
  CURVE_STEP_BEFORE: 8,
  LINEAR: 9,
};

export const ScaleType = {
  Linear: 'linear',
  Ordinal: 'ordinal',
  Log: 'log',
  Sqrt: 'sqrt',
  Time: 'time',
};

export const BarSeries = () => null;
export const AreaSeries = () => null;

export { LIGHT_THEME, DARK_THEME } from '@elastic/charts';
