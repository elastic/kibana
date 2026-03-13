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
import { Axis, BarSeries, Chart, Position, ScaleType, Settings } from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import type { ChangePointBurstHistogramProps } from './types';

const CHART_HEIGHT = 300;

export const ChangePointBurstHistogram: React.FC<ChangePointBurstHistogramProps> = ({
  data,
  charts,
}) => {
  const baseTheme = charts.theme.useChartsBaseTheme();

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
        defaultMessage: 'Entities with change point',
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
        <Settings
          baseTheme={baseTheme}
          showLegend={true}
          legendPosition={Position.Right}
          locale={i18n.getLocale()}
        />
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
          data={data}
          timeZone="UTC"
          enableHistogramMode={true}
          histogramModeAlignment="center"
        />
      </Chart>
    </div>
  );
};
