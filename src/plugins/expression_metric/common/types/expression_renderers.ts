/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Style } from '@kbn/expressions-plugin/common';

export interface MetricRendererConfig {
  /** The text to display under the metric */
  label: string;
  /** Font settings for the label */
  labelFont: Style;
  /** Value of the metric to display */
  metric: string | number | null;
  /** Font settings for the metric */
  metricFont: Style;
  /** NumeralJS format string */
  metricFormat: string;
}

export interface NodeDimensions {
  width: number;
  height: number;
}
