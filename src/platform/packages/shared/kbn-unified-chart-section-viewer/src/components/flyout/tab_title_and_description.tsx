/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiTitle, EuiText, EuiSpacer } from '@elastic/eui';
import React from 'react';
import type { MetricField } from '../../types';

interface OverviewTabProps {
  metric: MetricField;
  description?: string;
}

export const TabTitleAndDescription = ({ metric, description }: OverviewTabProps) => {
  return (
    <>
      <EuiSpacer />
      <EuiTitle size="xs" data-test-subj="metricsExperienceFlyoutMetricName">
        <strong>
          <strong>{metric.name}</strong>
        </strong>
      </EuiTitle>

      {description && (
        <>
          <EuiSpacer size="xs" />
          <EuiText
            size="s"
            color="subdued"
            data-test-subj="metricsExperienceFlyoutMetricDescription"
          >
            {description}
          </EuiText>
        </>
      )}
      <EuiSpacer size="m" />
    </>
  );
};
