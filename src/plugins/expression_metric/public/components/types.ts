/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CSSProperties } from 'react';

export interface MetricComponentProps {
  /** The text to display under the metric */
  label?: string;
  /** CSS font properties for the label */
  labelFont: CSSProperties;
  /** Value of the metric to display */
  metric: string | number | null;
  /** CSS font properties for the metric */
  metricFont: CSSProperties;
  /** NumeralJS format string */
  metricFormat?: string;
}
