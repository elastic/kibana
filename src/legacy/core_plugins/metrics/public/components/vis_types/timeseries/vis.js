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

import { createTickFormatter } from '../../lib/tick_formatter';
import _ from 'lodash';
import { TimeSeries } from '../../../visualizations/components/timeseries';
import replaceVars from '../../lib/replace_vars';
import { getAxisLabelString } from '../../lib/get_axis_label_string';
import { getInterval } from '../../lib/get_interval';
import { createXaxisFormatter } from '../../lib/create_xaxis_formatter';

class TimeseriesVisualization extends Component {

  getInterval = () => {
    const { visData, model } = this.props;

    return getInterval(visData, model);
  }

  xaxisFormatter = (val) => {
    const { scaledDataFormat, dateFormat } = this.props.visData;
    if (!scaledDataFormat || !dateFormat) return val;
    const formatter = createXaxisFormatter(this.getInterval(), scaledDataFormat, dateFormat);
    return formatter(val);
  };

  componentDidUpdate() {
    if (this.showToastNotification && this.notificationReason !== this.showToastNotification.reason) {
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
    const { model, visData, dateFormat, onBrush } = this.props;
    const series = _.get(visData, `${model.id}.series`, []);
    let annotations;

    this.showToastNotification = null;

    if (model.annotations && Array.isArray(model.annotations)) {
      annotations = model.annotations.map(annotation => {
        const data = _.get(visData, `${model.id}.annotations.${annotation.id}`, [])
          .map(item => [item.key, item.docs]);
        return {
          id: annotation.id,
          color: annotation.color,
          icon: annotation.icon,
          series: data.map(s => {
            return [s[0], s[1].map(doc => {
              const vars = replaceVars(annotation.template, null, doc);

              if (vars instanceof Error) {
                this.showToastNotification = vars.error.caused_by;

                return annotation.template;
              }

              return vars;
            })];
          })
        };
      });
    }
    const seriesModel = model.series.map(s => _.cloneDeep(s));
    const firstSeries = seriesModel.find(s => s.formatter && !s.separate_axis);
    const tickFormatter = createTickFormatter(_.get(firstSeries, 'formatter'), _.get(firstSeries, 'value_template'), this.props.getConfig);

    const yAxisIdGenerator = htmlIdGenerator('yaxis');

    const mainAxis = {
      id: yAxisIdGenerator('main'),
      position: model.axis_position,
      tickFormatter,
      axisFormatter: _.get(firstSeries, 'formatter', 'number'),
      axisFormatterTemplate: _.get(firstSeries, 'value_template')
    };


    if (model.axis_min) mainAxis.min = Number(model.axis_min);
    if (model.axis_max) mainAxis.max = Number(model.axis_max);
    if (model.axis_scale === 'log') {
      mainAxis.mode = 'log';
      mainAxis.transform = value => value > 0 ? Math.log(value) / Math.LN10 : null;
      mainAxis.inverseTransform = value => Math.pow(10, value);
    }

    const yaxes = [mainAxis];
    let axisCount = 1;

    seriesModel.forEach(seriesGroup => {
      const seriesData = series.filter(r => _.startsWith(r.id, seriesGroup.id));
      const seriesGroupTickFormatter = createTickFormatter(seriesGroup.formatter, seriesGroup.value_template, this.props.getConfig);

      seriesData.forEach(seriesDataRow => {
        seriesDataRow.tickFormatter = seriesGroupTickFormatter;

        if (seriesGroup.hide_in_legend) {
          delete seriesDataRow.label;
        }

        if (seriesGroup.stacked !== 'none') {
          seriesDataRow.data = seriesDataRow.data.map(point => {
            if (!point[1]) return [point[0], 0];
            return point;
          });
        }
      });

      if (seriesGroup.stacked === 'percent') {
        seriesGroup.separate_axis = true;
        seriesGroup.axisFormatter = 'percent';
        seriesGroup.axis_min = 0;
        seriesGroup.axis_max = 1;
        seriesGroup.axis_position = model.axis_position;
        const first = seriesData[0];
        if (first) {
          first.data.forEach((row, index) => {
            const rowSum = seriesData.reduce((acc, item) => {
              return item.data[index][1] + acc;
            }, 0);
            seriesData.forEach(item => {
              item.data[index][1] = rowSum && item.data[index][1] / rowSum || 0;
            });
          });
        }
      }

      if (seriesGroup.separate_axis) {
        axisCount++;

        const yaxis = {
          id: yAxisIdGenerator(),
          alignTicksWithAxis: 1,
          position: seriesGroup.axis_position,
          tickFormatter: seriesGroupTickFormatter,
          axisFormatter: seriesGroup.axis_formatter,
          axisFormatterTemplate: seriesGroup.value_template
        };

        if (seriesGroup.axis_min != null) yaxis.min = Number(seriesGroup.axis_min);
        if (seriesGroup.axis_max != null) yaxis.max = Number(seriesGroup.axis_max);

        yaxes.push(yaxis);

        // Assign axis and formatter to each series
        seriesData.forEach(r => {
          r.yaxis = axisCount;
        });
      }
    });

    const interval = this.getInterval();
    const panelBackgroundColor = model.background_color;
    const style = { backgroundColor: panelBackgroundColor };

    const params = {
      dateFormat,
      onBrush,
      series,
      annotations,
      yaxes,
      tickFormatter,
      xAxisFormatter: this.xaxisFormatter,
      axisPosition: model.axis_position,
      legendPosition: model.legend_position || 'right',
      legend: Boolean(model.show_legend),
      showGrid: Boolean(model.show_grid),
    };

    if (interval) {
      params.xaxisLabel = getAxisLabelString(interval);
    }

    return (
      <div className="tvbVis" style={style}>
        <TimeSeries {...params}/>
      </div>
    );

  }

}

TimeseriesVisualization.propTypes = {
  backgroundColor: PropTypes.string,
  className: PropTypes.string,
  model: PropTypes.object,
  onBrush: PropTypes.func,
  onChange: PropTypes.func,
  visData: PropTypes.object,
  dateFormat: PropTypes.string,
  getConfig: PropTypes.func
};

export default TimeseriesVisualization;
