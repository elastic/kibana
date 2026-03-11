/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiBadge, EuiToolTip } from '@elastic/eui';
import React from 'react';
import { css } from '@emotion/react';
import type { MappingTimeSeriesMetricType } from '@elastic/elasticsearch/lib/api/types';
import { i18n } from '@kbn/i18n';

export const METRIC_TYPE_DESCRIPTIONS: Partial<Record<MappingTimeSeriesMetricType, string>> = {
  gauge: i18n.translate('metricsExperience.metricTypeDescription.gauge', {
    defaultMessage: 'Represents a value that can go up or down, such as memory usage.',
  }),
  counter: i18n.translate('metricsExperience.metricTypeDescription.counter', {
    defaultMessage: 'A value that only increases, such as number of requests received.',
  }),
  histogram: i18n.translate('metricsExperience.metricTypeDescription.histogram', {
    defaultMessage:
      'Samples observations, such as request durations, and counts them in configurable buckets.',
  }),
};

interface MetricTypeBadgeProps {
  instrument: MappingTimeSeriesMetricType;
}

export const MetricTypeBadge = ({ instrument }: MetricTypeBadgeProps) => {
  const tooltipDescription = METRIC_TYPE_DESCRIPTIONS[instrument];

  if (!tooltipDescription) {
    return <EuiBadge>{instrument}</EuiBadge>;
  }

  return (
    <EuiToolTip content={tooltipDescription}>
      <EuiBadge
        tabIndex={0}
        title=""
        onMouseDown={(e: React.MouseEvent) => {
          e.preventDefault();
        }}
        css={css`
          cursor: pointer;
        `}
      >
        {instrument}
      </EuiBadge>
    </EuiToolTip>
  );
};
