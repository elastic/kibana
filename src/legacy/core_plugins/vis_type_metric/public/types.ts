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

import { ColorSchemas } from 'ui/vislib/components/color/colormaps';
import { RangeValues } from 'ui/vis/editors/default/controls/ranges';
import { SchemaConfig } from '../../visualizations/public';
import { ColorModes } from '../../kbn_vislib_vis_types/public/utils/collections';
import { Labels, Style } from '../../kbn_vislib_vis_types/public/types';

export const visType = 'metric';

export interface DimensionsVisParam {
  metrics: SchemaConfig[];
  bucket?: SchemaConfig[];
}

export interface MetricVisParam {
  percentageMode: boolean;
  useRanges: boolean;
  colorSchema: ColorSchemas;
  metricColorMode: ColorModes;
  colorsRange: RangeValues[];
  labels: Labels;
  invertColors: boolean;
  style: Style;
}

export interface VisParams {
  addTooltip: boolean;
  addLegend: boolean;
  dimensions: DimensionsVisParam;
  metric: MetricVisParam;
  type: typeof visType;
}
