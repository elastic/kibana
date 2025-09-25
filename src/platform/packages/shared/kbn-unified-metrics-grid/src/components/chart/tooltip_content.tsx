/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiText } from '@elastic/eui';
import type { MetricField } from '@kbn/metrics-experience-plugin/common/types';

interface TooltipContentProps {
  metric: MetricField;
  description?: string;
}
export const TooltipContent = ({ metric, description }: TooltipContentProps) => {
  return (
    <EuiText size="xs">
      <p>
        <strong>
          <FormattedMessage
            id="metricsExperience.chart.tooltip.metric.label"
            defaultMessage="Metric:"
          />
        </strong>
        <br />
        {metric.name}
      </p>

      {description && (
        <p>
          <strong>
            <FormattedMessage
              id="metricsExperience.chart.tooltip.description.label"
              defaultMessage="Description:"
            />
          </strong>
          <br />
          {description}
        </p>
      )}

      <p>
        <strong>
          <FormattedMessage
            id="metricsExperience.chart.tooltip.dataStream.label"
            defaultMessage="Data stream:"
          />
        </strong>
        <br />
        {metric.index}
      </p>
    </EuiText>
  );
};
