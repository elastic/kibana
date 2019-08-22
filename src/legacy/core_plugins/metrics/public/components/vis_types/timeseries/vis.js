/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { startsWith, get, cloneDeep, map } from 'lodash';
import { toastNotifications } from 'ui/notify';
import { htmlIdGenerator } from '@elastic/eui';
import { ScaleType } from '@elastic/charts';

import { createTickFormatter } from '../../lib/tick_formatter';
import { TimeSeries } from '../../../visualizations/views/timeseries';
import { MarkdownSimple } from '../../../../../kibana_react/public';
import { replaceVars } from '../../lib/replace_vars';
import { getAxisLabelString } from '../../lib/get_axis_label_string';
import { getInterval } from '../../lib/get_interval';
import { areFieldsDifferent } from '../../lib/charts';
import { createXaxisFormatter } from '../../lib/create_xaxis_formatter';
import { isBackgroundDark } from '../../../../common/set_is_reversed';
import { STACKED_OPTIONS } from '../../../visualizations/constants';

export class TimeseriesVisualization extends Component {
  xAxisFormatter = interval => val => {
    const { scaledDataFormat, dateFormat } = this.props.visData;

    if (!scaledDataFormat || !dateFormat) {
      return val;
    }

    const formatter = createXaxisFormatter(interval, scaledDataFormat, dateFormat);

    return formatter(val);
  };

  yAxisStackedByPercentFormatter = val => {
    const n = Number(val) * 100;

    return `${(Number.isNaN(n) ? 0 : n).toFixed(0)}%`;
  };

  applyDocTo = template => doc => {
    const vars = replaceVars(template, null, doc);

    if (vars instanceof Error) {
      this.showToastNotification = vars.error.caused_by;

      return template;
    }

    return vars;
  };

  static calculateDomainForSeries = series =>
    TimeseriesVisualization.getYAxisDomain(
      series.reduce(
        (acc, s) => {
          (s.data || []).forEach(([, data]) => {
            if (!acc.axis_min || data < acc.axis_min) {
              acc.axis_min = data;
            }
            if (!acc.axis_max || data > acc.axis_max) {
              acc.axis_max = data;
            }
          });
          return acc;
        },
        {
          axis_min: undefined,
          axis_max: undefined,
        }
      )
    );

  static getYAxisDomain = model => ({
    min: get(model, 'axis_min'),
    max: get(model, 'axis_max'),
  });

  componentDidUpdate() {
    if (
      this.showToastNotification &&
      this.notificationReason !== this.showToastNotification.reason
    ) {
      if (this.notification) {
        toastNotifications.remove(this.notification);
      }

      this.notificationReason = this.showToastNotification.reason;
      this.notification = toastNotifications.addDanger({
        title: this.showToastNotification.title,
        text: <MarkdownSimple>{this.showToastNotification.reason}</MarkdownSimple>,
      });
    }

    if (!this.showToastNotification && this.notification) {
      toastNotifications.remove(this.notification);
      this.notificationReason = null;
      this.notification = null;
    }
  }

  render() {
    const { model, visData, onBrush } = this.props;
    const series = get(visData, `${model.id}.series`, []);
    const interval = getInterval(visData, model);

    this.showToastNotification = null;

    const annotations = map(model.annotations, ({ id, color, icon, template }) => {
      const annotationData = get(visData, `${model.id}.annotations.${id}`, []);
      const applyDocToTemplate = this.applyDocTo(template);

      return {
        id,
        color,
        icon,
        data: annotationData.map(({ docs, ...rest }) => ({
          ...rest,
          docs: docs.map(applyDocToTemplate),
        })),
      };
    });

    const seriesModel = model.series.map(s => cloneDeep(s)).filter(s => !s.hidden);
    const enableHistogramMode = areFieldsDifferent('chart_type')(seriesModel);
    const firstSeries = seriesModel.find(s => s.formatter && !s.separate_axis);
    const tickFormatter = createTickFormatter(
      get(firstSeries, 'formatter'),
      get(firstSeries, 'value_template'),
      this.props.getConfig
    );

    const yAxisIdGenerator = htmlIdGenerator('yaxis');
    const mainAxisGroupId = yAxisIdGenerator('main_group');
    let domain = TimeseriesVisualization.getYAxisDomain(model);

    const mainAxis = {
      id: yAxisIdGenerator('main'),
      groupId: mainAxisGroupId,
      position: model.axis_position,
      tickFormatter,
    };

    const mainAxisScaleType = model.axis_scale === 'log' ? ScaleType.Log : ScaleType.Linear;

    const yAxis = [mainAxis];
    const stackedWithinSeries = seriesModel.find(
      item => item.stacked === STACKED_OPTIONS.STACKED_WITHIN_SERIES
    );

    let stackedWithinGroupId;

    if (Boolean(stackedWithinSeries)) {
      stackedWithinGroupId = yAxisIdGenerator('stacked_within_series_GroupId');
      domain = TimeseriesVisualization.calculateDomainForSeries(series);

      mainAxis.domain = domain;

      yAxis.push({
        id: yAxisIdGenerator('stacked_within_series_YAxis'),
        groupId: stackedWithinGroupId,
        position: model.axis_position,
        tickFormatter,
        hide: true,
        domain,
      });
    }

    yAxis.push(mainAxis);

    seriesModel.forEach(seriesGroup => {
      let seriesGroupId = seriesGroup.id;

      if (
        Boolean(stackedWithinSeries) &&
        STACKED_OPTIONS.STACKED_WITHIN_SERIES === seriesModel.stacked
      ) {
        seriesGroupId = stackedWithinGroupId;
      }

      const seriesData = series.filter(r => startsWith(r.id, seriesGroup.id));
      const seriesGroupTickFormatter = createTickFormatter(
        seriesGroup.formatter,
        seriesGroup.value_template,
        this.props.getConfig
      );

      if (seriesGroup.stacked === STACKED_OPTIONS.PERCENT) {
        seriesGroup.separate_axis = true;
        seriesGroup.axisFormatter = 'percent';
        seriesGroup.axis_min = 0;
        seriesGroup.axis_max = 1;
        seriesGroup.axis_position = model.axis_position;
      }

      seriesData.forEach(seriesDataRow => {
        seriesDataRow.tickFormatter = seriesGroupTickFormatter;
        seriesDataRow.groupId = seriesGroup.separate_axis ? seriesGroupId : mainAxisGroupId;
        seriesDataRow.yScaleType = seriesGroup.separate_axis ? ScaleType.Linear : mainAxisScaleType;
        seriesDataRow.hideInLegend = Boolean(seriesGroup.hide_in_legend);
      });

      if (seriesGroup.separate_axis) {
        yAxis.push({
          id: yAxisIdGenerator(seriesGroup.id),
          groupId: seriesGroupId,
          position: seriesGroup.axis_position,
          domain: Boolean(stackedWithinSeries)
            ? domain
            : TimeseriesVisualization.getYAxisDomain(seriesGroup),
          tickFormatter:
            seriesGroup.stacked === STACKED_OPTIONS.PERCENT
              ? this.yAxisStackedByPercentFormatter
              : seriesGroupTickFormatter,
        });
      }
    });

    // check if each series group has a separate y-axis -> remove the main y-axis
    if (yAxis.length > seriesModel.length) {
      yAxis.shift();
    }

    const style = { backgroundColor: model.background_color };

    const params = {
      isDarkMode: isBackgroundDark(model.background_color),
      showGrid: Boolean(model.show_grid),
      legend: Boolean(model.show_legend),
      legendPosition: model.legend_position,
      xAxisLabel: interval ? getAxisLabelString(interval) : '',
      series,
      yAxis,
      annotations,
      onBrush,
      xAxisFormatter: this.xAxisFormatter(interval),
      enableHistogramMode,
    };

    return (
      <div className="tvbVis" style={style}>
        <TimeSeries {...params} />
      </div>
    );
  }
}

TimeseriesVisualization.propTypes = {
  model: PropTypes.object,
  onBrush: PropTypes.func,
  visData: PropTypes.object,
  dateFormat: PropTypes.string,
  getConfig: PropTypes.func,
};
