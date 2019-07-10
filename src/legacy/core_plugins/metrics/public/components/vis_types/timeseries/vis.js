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
import { toastNotifications } from 'ui/notify';
import { MarkdownSimple } from 'ui/markdown';
import { htmlIdGenerator } from '@elastic/eui';
import { ScaleType } from '@elastic/charts';

import { createTickFormatter } from '../../lib/tick_formatter';
import { startsWith, get, cloneDeep, map } from 'lodash';
import { TimeSeries } from '../../../visualizations/views/timeseries';
import { replaceVars } from '../../lib/replace_vars';
import { getAxisLabelString } from '../../lib/get_axis_label_string';
import { getInterval } from '../../lib/get_interval';
import { createXaxisFormatter } from '../../lib/create_xaxis_formatter';
import { isBackgroundDark } from '../../../../common/set_is_reversed';

export class TimeseriesVisualization extends Component {
  xAxisFormatter = interval => val => {
    const { scaledDataFormat, dateFormat } = this.props.visData;

    if (!scaledDataFormat || !dateFormat) {
      return val;
    }

    const formatter = createXaxisFormatter(interval, scaledDataFormat, dateFormat);

    return formatter(val);
  };

  applyDocTo = template => doc => {
    const vars = replaceVars(template, null, doc);

    if (vars instanceof Error) {
      this.showToastNotification = vars.error.caused_by;

      return template;
    }

    return vars;
  };

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
    const firstSeries = seriesModel.find(s => s.formatter && !s.separate_axis);
    const tickFormatter = createTickFormatter(
      get(firstSeries, 'formatter'),
      get(firstSeries, 'value_template'),
      this.props.getConfig
    );

    const yAxisIdGenerator = htmlIdGenerator('yaxis');
    const mainAxisId = yAxisIdGenerator('main');
    const mainAxisGroupId = yAxisIdGenerator('main_group');
    const mainAxis = {
      id: mainAxisId,
      groupId: mainAxisGroupId,
      position: model.axis_position,
      tickFormatter,
    };
    const mainAxisScaleType = model.axis_scale === 'log' ? ScaleType.Log : ScaleType.Linear;

    if (model.axis_min) mainAxis.min = Number(model.axis_min);
    if (model.axis_max) mainAxis.max = Number(model.axis_max);

    const yAxis = [mainAxis];

    seriesModel.forEach(seriesGroup => {
      const seriesGroupId = seriesGroup.id;
      const seriesData = series.filter(r => startsWith(r.id, seriesGroup.id));
      const seriesGroupTickFormatter = createTickFormatter(
        seriesGroup.formatter,
        seriesGroup.value_template,
        this.props.getConfig
      );

      seriesData.forEach(seriesDataRow => {
        seriesDataRow.tickFormatter = seriesGroupTickFormatter;
        seriesDataRow.groupId = seriesGroup.separate_axis ? seriesGroupId : mainAxisGroupId;
        seriesDataRow.yScaleType = seriesGroup.separate_axis ? ScaleType.Linear : mainAxisScaleType;
        seriesDataRow.hideInLegend = Boolean(seriesGroup.hide_in_legend);
      });

      if (seriesGroup.separate_axis) {
        const yaxis = {
          id: yAxisIdGenerator(),
          groupId: seriesGroupId,
          position: seriesGroup.axis_position,
          tickFormatter: seriesGroupTickFormatter,
        };

        if (seriesGroup.axis_min != null) yaxis.min = Number(seriesGroup.axis_min);
        if (seriesGroup.axis_max != null) yaxis.max = Number(seriesGroup.axis_max);

        yAxis.push(yaxis);
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
