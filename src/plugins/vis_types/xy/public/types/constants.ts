/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export enum ChartMode {
  Normal = 'normal',
  Stacked = 'stacked',
}

export enum InterpolationMode {
  Linear = 'linear',
  Cardinal = 'cardinal',
  StepAfter = 'step-after',
}

export enum AxisType {
  Category = 'category',
  Value = 'value',
}

export enum ScaleType {
  Linear = 'linear',
  Log = 'log',
  SquareRoot = 'square root',
}

export enum AxisMode {
  Normal = 'normal',
  Percentage = 'percentage',
  Wiggle = 'wiggle',
  Silhouette = 'silhouette',
}

export enum ThresholdLineStyle {
  Full = 'full',
  Dashed = 'dashed',
  DotDashed = 'dot-dashed',
}
