/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import moment from 'moment';

import { Chart, ScaleType, Settings, BarSeries, Axis } from '@elastic/charts';
import { formatDate } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { useElasticChartsTheme } from '@kbn/charts-theme';

const dateFormatter = (d: Date) => formatDate(d, `MM/DD`);

const seriesName = i18n.translate('contentManagement.contentEditor.viewsStats.viewsLabel', {
  defaultMessage: 'Views',
});

const weekOfFormatter = (date: Date) =>
  i18n.translate('contentManagement.contentEditor.viewsStats.weekOfLabel', {
    defaultMessage: 'Week of {date}',
    values: { date: dateFormatter(date) },
  });

export const ViewsChart = ({ data }: { data: Array<[week: number, views: number]> }) => {
  const baseTheme = useElasticChartsTheme();
  const momentDow = moment().localeData().firstDayOfWeek(); // configured from advanced settings
  const isoDow = momentDow === 0 ? 7 : momentDow;

  const momentTz = moment().tz(); // configured from advanced settings

  return (
    <Chart size={{ height: 240 }}>
      <Settings baseTheme={baseTheme} showLegend={false} dow={isoDow} />
      <BarSeries
        id="viewsOverTime"
        name={seriesName}
        data={data}
        xAccessor={0}
        yAccessors={[1]}
        enableHistogramMode={true}
        yNice={true}
        minBarHeight={1}
        // Defaults to multi layer time axis as of Elastic Charts v70
        xScaleType={ScaleType.Time}
        timeZone={momentTz}
      />

      <Axis id="time" position="bottom" tickFormat={weekOfFormatter} />
      <Axis id="views" position="left" maximumFractionDigits={0} />
    </Chart>
  );
};
