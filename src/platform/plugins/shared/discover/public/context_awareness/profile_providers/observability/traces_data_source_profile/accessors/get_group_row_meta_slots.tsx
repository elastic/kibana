/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { FC } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import type { PartialTheme } from '@elastic/charts';
import { Chart, LineSeries, ScaleType, Settings, Tooltip, TooltipType } from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { DataSourceProfileProvider } from '../../../..';

interface MetricConfig {
  label: string;
  color: string;
}

const METRICS: Record<string, MetricConfig> = {
  latency: { label: 'Latency', color: '#006bb4' },
  errors: { label: 'Errors', color: '#bd271e' },
  throughput: { label: 'Throughput', color: '#017d73' },
};

const miniTheme: PartialTheme = {
  chartMargins: { left: 0, right: 0, top: 2, bottom: 2 },
  chartPaddings: { left: 0, right: 0, top: 0, bottom: 0 },
  background: { color: 'transparent' },
};

const LineSparkline: FC<{ values: number[]; color: string; charts: ChartsPluginStart }> = ({
  values,
  color,
  charts,
}) => {
  const baseTheme = charts.theme.useChartsBaseTheme();
  const data = values.map((v, k) => ({ k, v }));

  return (
    <div css={css({ width: '80px', height: '20px' })}>
      <Chart>
        <Tooltip type={TooltipType.None} />
        <Settings
          theme={[miniTheme]}
          baseTheme={baseTheme}
          showLegend={false}
          locale={i18n.getLocale()}
        />
        <LineSeries
          id="sparkline"
          xScaleType={ScaleType.Ordinal}
          yScaleType={ScaleType.Linear}
          xAccessor="k"
          yAccessors={['v']}
          data={data}
          color={color}
          lineSeriesStyle={{ point: { visible: false }, line: { strokeWidth: 1.5 } }}
        />
      </Chart>
    </div>
  );
};

const naSlots = [
  <EuiFlexGroup key="na" alignItems="center" gutterSize="xs" responsive={false}>
    <EuiFlexItem grow={false}>
      <EuiIcon type="visLine" size="s" color="subdued" aria-hidden={true} />
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiText size="xs" color="subdued">
        N/A
      </EuiText>
    </EuiFlexItem>
  </EuiFlexGroup>,
];

function renderMetricSlot(
  key: string,
  { label, color }: MetricConfig,
  value: unknown,
  charts: ChartsPluginStart
) {
  const isArray = Array.isArray(value) && (value as number[]).length > 0;

  return (
    <EuiFlexGroup key={key} alignItems="center" gutterSize="s" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiText size="xs" css={css({ whiteSpace: 'nowrap' })}>
          {label}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        {isArray ? (
          <LineSparkline values={value as number[]} color={color} charts={charts} />
        ) : (
          <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiIcon type="visLine" size="s" color="subdued" aria-hidden={true} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                N/A
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

export const getGroupRowMetaSlots: DataSourceProfileProvider['profile']['getGroupRowMetaSlots'] =
  (prev) => (params) => {
    const { groupValue, enrichmentData, charts } = params;

    if (!enrichmentData) {
      return prev?.(params);
    }

    const rowData = enrichmentData.get(groupValue);
    if (!rowData) {
      return naSlots;
    }

    return Object.entries(METRICS).map(([key, config]) =>
      renderMetricSlot(key, config, rowData[key], charts)
    );
  };
