/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';
import { Axis, BarSeries, Chart, Position, ScaleType, Settings, Tooltip } from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import type { ChangePointBurstHistogramProps } from './types';

const CHART_HEIGHT = 300;

const createBurstHistogramTooltip =
  (theme: { backgroundColor: string; color: string }) =>
  ({ values }: { values: unknown[] }) => {
    if (values.length === 0) return null;
    const count = (values as { value?: number }[]).reduce((s, v) => s + (v.value ?? 0), 0);
    const label = i18n.translate(
      'discover.contextAwareness.changePointBurstHistogram.entityCountLabel',
      {
        defaultMessage: '{count} {count, plural, one {entity} other {entities}}',
        values: { count: Math.round(count) },
      }
    );
    return (
      <div
        style={{
          padding: 8,
          backgroundColor: theme.backgroundColor,
          color: theme.color,
          borderRadius: 4,
        }}
      >
        {label}
      </div>
    );
  };

export const ChangePointBurstHistogram: React.FC<ChangePointBurstHistogramProps> = ({
  data,
  charts,
}) => {
  const baseTheme = charts.theme.useChartsBaseTheme();
  const { euiTheme } = useEuiTheme();

  const tooltipOptions = useMemo(
    () => ({
      customTooltip: createBurstHistogramTooltip({
        backgroundColor: euiTheme.colors.darkestShade,
        color: euiTheme.colors.emptyShade,
      }),
    }),
    [euiTheme.colors.darkestShade, euiTheme.colors.emptyShade]
  );

  const xAxisTitle = useMemo(
    () =>
      i18n.translate('discover.contextAwareness.changePointBurstHistogram.xAxisTitle', {
        defaultMessage: 'Timeline',
      }),
    []
  );

  const yAxisTitle = useMemo(
    () =>
      i18n.translate('discover.contextAwareness.changePointBurstHistogram.yAxisTitle', {
        defaultMessage: 'Count of Entities',
      }),
    []
  );

  return (
    <div
      css={css({
        minHeight: CHART_HEIGHT,
        padding: 16,
        position: 'relative',
      })}
      data-test-subj="changePointBurstHistogram"
    >
      <Chart size={{ height: CHART_HEIGHT }}>
        <Tooltip {...tooltipOptions} />
        <Settings baseTheme={baseTheme} showLegend={false} locale={i18n.getLocale()} />
        <Axis
          id="burst-timeline-axis"
          position={Position.Bottom}
          title={xAxisTitle}
          tickFormat={(d) =>
            new Date(d).toLocaleString(undefined, {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })
          }
          gridLine={{ visible: true }}
        />
        <Axis
          id="burst-entity-count-axis"
          position={Position.Left}
          title={yAxisTitle}
          tickFormat={(d) => String(Math.round(d))}
          gridLine={{ visible: true }}
        />
        <BarSeries
          id="burst-detection"
          name={yAxisTitle}
          xScaleType={ScaleType.Time}
          yScaleType={ScaleType.Linear}
          xAccessor="x"
          yAccessors={['y']}
          splitSeriesAccessors={['g']}
          stackAccessors={['g']}
          color={() => euiTheme.colors.primary}
          data={data}
          timeZone="UTC"
          enableHistogramMode={true}
        />
      </Chart>
    </div>
  );
};
