/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FunctionComponent } from 'react';
import numeral from '@elastic/numeral';
import { MetricComponentProps } from './types';

const MetricComponent: FunctionComponent<MetricComponentProps> = ({
  label,
  metric,
  labelFont,
  metricFont,
  metricFormat,
}) => (
  <div className="canvasMetric">
    <div className="canvasMetric__metric" style={metricFont}>
      {metricFormat ? numeral(metric).format(metricFormat) : metric}
    </div>
    {label && (
      <div className="canvasMetric__label" style={labelFont}>
        {label}
      </div>
    )}
  </div>
);

// eslint-disable-next-line import/no-default-export
export { MetricComponent as default };
