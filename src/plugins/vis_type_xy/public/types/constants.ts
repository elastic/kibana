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
import { $Values } from '@kbn/utility-types';

export const ChartMode = Object.freeze({
  Normal: 'normal' as const,
  Stacked: 'stacked' as const,
});
export type ChartMode = $Values<typeof ChartMode>;

export const InterpolationMode = Object.freeze({
  Linear: 'linear' as const,
  Cardinal: 'cardinal' as const,
  StepAfter: 'step-after' as const,
});
export type InterpolationMode = $Values<typeof InterpolationMode>;

export const AxisType = Object.freeze({
  Category: 'category' as const,
  Value: 'value' as const,
});
export type AxisType = $Values<typeof AxisType>;

export const ScaleType = Object.freeze({
  Linear: 'linear' as const,
  Log: 'log' as const,
  SquareRoot: 'square root' as const,
});
export type ScaleType = $Values<typeof ScaleType>;

export const AxisMode = Object.freeze({
  Normal: 'normal' as const,
  Percentage: 'percentage' as const,
  Wiggle: 'wiggle' as const,
  Silhouette: 'silhouette' as const,
});
export type AxisMode = $Values<typeof AxisMode>;

export const ThresholdLineStyle = Object.freeze({
  Full: 'full' as const,
  Dashed: 'dashed' as const,
  DotDashed: 'dot-dashed' as const,
});
export type ThresholdLineStyle = $Values<typeof ThresholdLineStyle>;

export const ColorMode = Object.freeze({
  Background: 'Background' as const,
  Labels: 'Labels' as const,
  None: 'None' as const,
});
export type ColorMode = $Values<typeof ColorMode>;
