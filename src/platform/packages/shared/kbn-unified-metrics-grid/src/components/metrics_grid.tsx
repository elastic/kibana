/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import type { EuiFlexGridProps, IconType } from '@elastic/eui';
import {
  EuiFlexGrid,
  EuiFlexItem,
  EuiLoadingChart,
  EuiFlexGroup,
  useEuiTheme,
  euiScrollBarStyles,
  EuiText,
  EuiIcon,
} from '@elastic/eui';
import type { MetricField } from '@kbn/metrics-experience-plugin/common/types';
import { css } from '@emotion/react';
import { IconChartBarStacked } from '@kbn/chart-icons';
import { i18n } from '@kbn/i18n';
import { MetricChart } from './metric_chart';

export type MetricsGridProps = {
  timeRange: { from?: string; to?: string };
  loading: boolean;
  filters?: Array<{ field: string; value: string }>;
  dimensions: string[];
  columns: EuiFlexGridProps['columns'];
} & (
  | {
      pivotOn: 'metric';
      fields: MetricField[];
    }
  | {
      pivotOn: 'dimension';
      fields: MetricField;
    }
);

export const MetricsGrid = ({
  fields,
  timeRange,
  loading,
  dimensions,
  pivotOn,
  filters = [],
  columns,
}: MetricsGridProps) => {
  const euiThemeContext = useEuiTheme();
  const { euiTheme } = euiThemeContext;

  const chartSize = useMemo(() => (columns === 2 || columns === 4 ? 's' : 'm'), [columns]);

  if (loading) {
    return (
      <EuiFlexGroup
        justifyContent="center"
        alignItems="center"
        css={css`
          min-height: 400px;
        `}
      >
        <EuiFlexItem grow={false}>
          <EuiLoadingChart size="m" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (pivotOn === 'metric' && fields.length === 0) {
    return (
      <div
        css={css`
          width: 100%;
          height: 100%;
        `}
      >
        <EuiFlexGroup
          direction="column"
          alignItems="center"
          justifyContent="spaceAround"
          css={css`
            height: 100%;
          `}
          gutterSize="s"
        >
          <EuiFlexItem
            css={css`
              justify-content: end;
            `}
          >
            <EuiIcon type={IconChartBarStacked as IconType} size="l" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="xs">
              {i18n.translate('metricsExperience.grid.noData', {
                defaultMessage: 'No results found',
              })}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    );
  }

  return (
    <EuiFlexGrid
      columns={columns}
      gutterSize="s"
      css={css`
        overflow: auto;
        padding: ${euiTheme.size.s} ${euiTheme.size.s} 0;
        ${euiScrollBarStyles(euiThemeContext)}
      `}
      data-test-subj="unifiedMetricsExperienceGrid"
    >
      {pivotOn === 'metric'
        ? fields.map((field, index) => (
            <EuiFlexItem key={field.name}>
              <MetricChart
                metric={field}
                timeRange={timeRange}
                dimensions={dimensions}
                filters={filters}
                colorIndex={index}
                size={chartSize}
              />
            </EuiFlexItem>
          ))
        : dimensions.map((dimension, index) => (
            <EuiFlexItem key={dimension}>
              <MetricChart
                metric={fields}
                timeRange={timeRange}
                byDimension={dimension}
                dimensions={[dimension]}
                filters={filters}
                colorIndex={index}
                size={chartSize}
              />
            </EuiFlexItem>
          ))}
    </EuiFlexGrid>
  );
};
