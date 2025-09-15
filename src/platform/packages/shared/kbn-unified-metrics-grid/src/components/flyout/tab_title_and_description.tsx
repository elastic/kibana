/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiTitle,
  EuiText,
  EuiSpacer,
  EuiDescriptionList,
  EuiDescriptionListDescription,
} from '@elastic/eui';
import React from 'react';
import type { MetricField } from '@kbn/metrics-experience-plugin/common/types';

interface OverviewTabProps {
  metric: MetricField;
}

export const TabTitleAndDescription = ({ metric }: OverviewTabProps) => {
  return (
    <>
      <EuiSpacer />
      <EuiDescriptionList data-test-subj="metricsExperienceFlyoutSummaryItem" compressed>
        <EuiTitle size="s" id="metric-flyout-title">
          <h2>
            <strong>{metric.name}</strong>
          </h2>
        </EuiTitle>

        <EuiSpacer size="s" />
        {metric.description && (
          <EuiDescriptionListDescription>
            <EuiText size="s" color="subdued">
              {metric.description}
            </EuiText>
          </EuiDescriptionListDescription>
        )}
      </EuiDescriptionList>
      <EuiSpacer />
    </>
  );
};
