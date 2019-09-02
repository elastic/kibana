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

import { LegendPositions } from './utils/legend_positions';

export interface CommonVislibParams {
  addTooltip: boolean;
  legendPosition: LegendPositions;
}

interface Labels {
  color: string;
  filter: boolean;
  overwriteColor?: boolean;
  rotate?: number;
  show: boolean;
  truncate: number;
}
interface ThresholdLine {
  show: boolean;
  value: number;
  width: number;
  style: 'full' | 'dashed' | 'dot-dashed';
  color: string;
}
export interface ValueAxis {
  id: string;
  labels: Labels;
  name: string;
  position: LegendPositions;
  scale: {
    type: string;
    defaultYExtents: boolean;
  };
  show: boolean;
  style: object;
  title: { text: string };
  type: string;
}

export interface BasicVislibParams extends CommonVislibParams {
  addTimeMarker: boolean;
  orderBucketsBySum?: boolean;
  labels: Labels;
  thresholdLine: ThresholdLine;
  valueAxes: ValueAxis[];
  grid: {
    categoryLines: boolean;
    valueAxis?: string;
  };
}
