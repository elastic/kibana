/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { UnifiedMetricsExperienceGrid } from '@kbn/unified-chart-section-viewer';
import type { ChartSectionProps } from '@kbn/unified-histogram/types';
import type { DataSourceProfileProvider } from '../../../../profiles';

const getMetricFieldsCount = (fetchParams: ChartSectionProps['fetchParams']): number => {
  const { dataView, table } = fetchParams;
  if (!dataView) {
    return 0;
  }

  const dataViewFieldMap = dataView.fields.toSpec();
  const columns = table?.columns ?? [];
  let count = 0;

  for (const column of columns) {
    if (column.isNull) {
      continue;
    }
    const field = dataViewFieldMap[column.name];
    if (field?.timeSeriesMetric) {
      count++;
    }
  }

  return count;
};

export const createChartSection =
  (): DataSourceProfileProvider['profile']['getChartSectionConfiguration'] =>
  (prev) =>
  (params) => {
    return {
      ...prev(params),
      renderChartSection: (props) => {
        return <UnifiedMetricsExperienceGrid {...props} actions={params.actions} />;
      },
      replaceDefaultChart: true,
      localStorageKeyPrefix: 'discover:metricsExperience',
      defaultTopPanelHeight: 'max-content',
      renderCollapsedTitle: (fetchParams) => {
        const count = getMetricFieldsCount(fetchParams);
        if (count === 0) {
          return null;
        }
        return (
          <EuiText size="s">
            <strong>
              {i18n.translate('discover.metricsDataSource.collapsedChartTitle', {
                defaultMessage: '{count} {count, plural, one {metric} other {metrics}}',
                values: { count },
              })}
            </strong>
          </EuiText>
        );
      },
    };
  };
