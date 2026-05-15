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
import type { TimeRange } from '@kbn/es-query';
import { euiPaletteColorBlind, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import type { PartialTheme } from '@elastic/charts';
import { Chart, LineSeries, ScaleType, Settings, Tooltip, TooltipType } from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { DataSourceProfileProvider } from '../../../..';

interface MetricConfig {
  label: string;
  color: string;
  getSummary?: (rowData: Record<string, unknown>, timeRange?: TimeRange) => string | undefined;
}

const apmPalette = euiPaletteColorBlind({ rotations: 2 });

const METRICS: Record<string, MetricConfig> = {
  latency: {
    label: 'Latency',
    color: apmPalette[2],
    getSummary: (rowData) => {
      const avg = rowData.latency_avg;
      if (typeof avg !== 'number') return undefined;
      return avg < 1000 ? `${Math.round(avg)} ms` : `${(avg / 1000).toFixed(1)} s`;
    },
  },
  errors: {
    label: 'Errors',
    color: apmPalette[6],
    getSummary: (rowData, timeRange) => {
      const count = rowData.error_count;
      if (typeof count !== 'number') return undefined;
      if (!timeRange) return String(Math.round(count));
      const fromMs = new Date(timeRange.from).getTime();
      const toMs = new Date(timeRange.to).getTime();
      if (isNaN(fromMs) || isNaN(toMs) || toMs <= fromMs) return String(Math.round(count));
      const epm = count / ((toMs - fromMs) / 60000);
      return `${epm < 1 ? epm.toFixed(2) : epm < 10 ? epm.toFixed(1) : Math.round(epm)} epm`;
    },
  },
  throughput: {
    label: 'Throughput',
    color: apmPalette[0],
    getSummary: (rowData, timeRange) => {
      const total = rowData.total;
      if (typeof total !== 'number') return undefined;
      if (!timeRange) return `${total}`;
      const fromMs = new Date(timeRange.from).getTime();
      const toMs = new Date(timeRange.to).getTime();
      if (isNaN(fromMs) || isNaN(toMs) || toMs <= fromMs) return `${total}`;
      const tpm = total / ((toMs - fromMs) / 60000);
      return `${tpm < 1 ? tpm.toFixed(2) : tpm < 10 ? tpm.toFixed(1) : Math.round(tpm)} tpm`;
    },
  },
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
          lineSeriesStyle={{ point: { visible: 'never' }, line: { strokeWidth: 1.5 } }}
        />
      </Chart>
    </div>
  );
};

const naSlots = Object.entries(METRICS).map(([key, config]) =>
  renderMetricSlot(key, config, undefined, null as unknown as ChartsPluginStart)
);

function renderMetricSlot(
  key: string,
  { label, color }: MetricConfig,
  value: unknown,
  charts: ChartsPluginStart,
  summary?: string
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
        <div css={css({ width: '80px' })}>
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
        </div>
      </EuiFlexItem>
      {summary !== undefined && (
        <EuiFlexItem grow={false}>
          <EuiText size="xs" css={css({ whiteSpace: 'nowrap' })}>
            {summary}
          </EuiText>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
}

export const getGroupRowMetaSlots: DataSourceProfileProvider['profile']['getGroupRowMetaSlots'] =
  (prev) => (params) => {
    const { groupValue, enrichmentData, charts, timeRange } = params;

    if (!enrichmentData) {
      return prev?.(params);
    }

    const rowData = enrichmentData.get(groupValue);
    if (!rowData) {
      return naSlots;
    }

    return Object.entries(METRICS).map(([key, config]) =>
      renderMetricSlot(key, config, rowData[key], charts, config.getSummary?.(rowData, timeRange))
    );
  };
