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

export const COLORS = {
  LINE_COLOR: 'rgba(105,112,125,0.2)',
  TEXT_COLOR: 'rgba(0,0,0,0.4)',
  TEXT_COLOR_REVERSED: 'rgba(255,255,255,0.5)',
  VALUE_COLOR: 'rgba(0,0,0,0.7)',
  VALUE_COLOR_REVERSED: 'rgba(255,255,255,0.8)',
};

export const GRID_LINE_CONFIG = {
  stroke: 'rgba(125,125,125,0.1)',
};

export const X_ACCESSOR_INDEX = 0;
export const STACK_ACCESSORS = [0];
export const Y_ACCESSOR_INDEXES = [1];

export const STACKED_OPTIONS = {
  NONE: 'none',
  PERCENT: 'percent',
  STACKED: 'stacked',
  STACKED_WITHIN_SERIES: 'stacked_within_series',
};
