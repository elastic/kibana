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
import reactCSS from 'reactcss';

import { startsWith, get, cloneDeep, map } from 'lodash';
import { htmlIdGenerator } from '@elastic/eui';
import { ScaleType } from '@elastic/charts';

import { createTickFormatter } from '../../lib/tick_formatter';
import { TimeSeries } from '../../../visualizations/views/timeseries';
import { MarkdownSimple } from '../../../../../../../plugins/kibana_react/public';
import { replaceVars } from '../../lib/replace_vars';
import { getAxisLabelString } from '../../lib/get_axis_label_string';
import { getInterval } from '../../lib/get_interval';
import { areFieldsDifferent } from '../../lib/charts';
import { createXaxisFormatter } from '../../lib/create_xaxis_formatter';
import { STACKED_OPTIONS } from '../../../visualizations/constants';
import { getCoreStart } from '../../../../services';

export class TimeseriesVisualization extends Component {
  static propTypes = {
    model: PropTypes.object,
    onBrush: PropTypes.func,
    visData: PropTypes.object,
    dateFormat: PropTypes.string,
    getConfig: PropTypes.func,
  };

  xAxisFormatter = (interval) => (val) => {
    const { scaledDataFormat, dateFormat } = this.props.visData;

    if (!scaledDataFormat || !dateFormat) {
      return val;
    }

    const formatter = createXaxisFormatter(interval, scaledDataFormat, dateFormat);

    return formatter(val);
  };

  yAxisStackedByPercentFormatter = (val) => {
    const n = Number(val) * 100;

    return `${(Number.isNaN(n) ? 0 : n).toFixed(0)}%`;
  };

  applyDocTo = (template) => (doc) => {
    const vars = replaceVars(template, null, doc);

    if (vars instanceof Error) {
      this.showToastNotification = vars.error.caused_by;

      return template;
    }

    return vars;
  };

  static getYAxisDomain = (model) => {
    const axisMin = get(model, 'axis_min', '').toString();
    const axisMax = get(model, 'axis_max', '').toString();
    const fit = model.series
      ? model.series.filter(({ hidden }) => !hidden).every(({ fill }) => fill === '0')
      : model.fill === '0';

    return {
      min: axisMin.length ? Number(axisMin) : undefined,
      max: axisMax.length ? Number(axisMax) : undefined,
      fit,
    };
  };

  static addYAxis = (yAxis, { id, groupId, position, tickFormatter, domain, hide }) => {
    yAxis.push({
      id,
      groupId,
      position,
      tickFormatter,
      domain,
      hide,
    });
  };

  static getAxisScaleType = (model) =>
    get(model, 'axis_scale') === 'log' ? ScaleType.Log : ScaleType.Linear;

  static getTickFormatter = (model, getConfig) =>
    createTickFormatter(get(model, 'formatter'), get(model, 'value_template'), getConfig);

  componentDidUpdate() {
    const toastNotifications = getCoreStart().notifications.toasts;
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

  prepareAnnotations = () => {
    const { model, visData } = this.props;

    return map(model.annotations, ({ id, color, icon, template }) => {
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
  };

  render() {
    const { model, visData, onBrush } = this.props;
    const styles = reactCSS({
      default: {
        tvbVis: {
          borderColor: get(model, 'background_color'),
        },
      },
    });
    const series = get(visData, `${model.id}.series`, []);
    const interval = getInterval(visData, model);
    const yAxisIdGenerator = htmlIdGenerator('yaxis');
    const mainAxisGroupId = yAxisIdGenerator('main_group');

    const seriesModel = model.series.filter((s) => !s.hidden).map((s) => cloneDeep(s));
    const enableHistogramMode = areFieldsDifferent('chart_type')(seriesModel);
    const firstSeries = seriesModel.find((s) => s.formatter && !s.separate_axis);

    const mainAxisScaleType = TimeseriesVisualization.getAxisScaleType(model);
    const mainAxisDomain = TimeseriesVisualization.getYAxisDomain(model);
    const tickFormatter = TimeseriesVisualization.getTickFormatter(
      firstSeries,
      this.props.getConfig
    );
    const yAxis = [];
    let mainDomainAdded = false;

    this.showToastNotification = null;

    seriesModel.forEach((seriesGroup) => {
      const isStackedWithinSeries = seriesGroup.stacked === STACKED_OPTIONS.STACKED_WITHIN_SERIES;
      const hasSeparateAxis = Boolean(seriesGroup.separate_axis);
      const groupId = hasSeparateAxis || isStackedWithinSeries ? seriesGroup.id : mainAxisGroupId;
      const domain = hasSeparateAxis
        ? TimeseriesVisualization.getYAxisDomain(seriesGroup)
        : undefined;
      const isCustomDomain = groupId !== mainAxisGroupId;
      const seriesGroupTickFormatter = TimeseriesVisualization.getTickFormatter(
        seriesGroup,
        this.props.getConfig
      );
      const yScaleType = hasSeparateAxis
        ? TimeseriesVisualization.getAxisScaleType(seriesGroup)
        : mainAxisScaleType;

      if (seriesGroup.stacked === STACKED_OPTIONS.PERCENT) {
        seriesGroup.separate_axis = true;
        seriesGroup.axisFormatter = 'percent';
        seriesGroup.axis_min = seriesGroup.axis_min || 0;
        seriesGroup.axis_max = seriesGroup.axis_max || 1;
        seriesGroup.axis_position = model.axis_position;
      }

      series
        .filter((r) => startsWith(r.id, seriesGroup.id))
        .forEach((seriesDataRow) => {
          seriesDataRow.tickFormatter = seriesGroupTickFormatter;
          seriesDataRow.groupId = groupId;
          seriesDataRow.yScaleType = yScaleType;
          seriesDataRow.hideInLegend = Boolean(seriesGroup.hide_in_legend);
          seriesDataRow.useDefaultGroupDomain = !isCustomDomain;
        });

      if (isCustomDomain) {
        TimeseriesVisualization.addYAxis(yAxis, {
          domain,
          groupId,
          id: yAxisIdGenerator(seriesGroup.id),
          position: seriesGroup.axis_position,
          hide: isStackedWithinSeries,
          tickFormatter:
            seriesGroup.stacked === STACKED_OPTIONS.PERCENT
              ? this.yAxisStackedByPercentFormatter
              : seriesGroupTickFormatter,
        });
      } else if (!mainDomainAdded) {
        TimeseriesVisualization.addYAxis(yAxis, {
          tickFormatter,
          id: yAxisIdGenerator('main'),
          groupId: mainAxisGroupId,
          position: model.axis_position,
          domain: mainAxisDomain,
        });

        mainDomainAdded = true;
      }
    });

    return (
      <div className="tvbVis" style={styles.tvbVis}>
        <TimeSeries
          series={series}
          yAxis={yAxis}
          onBrush={onBrush}
          enableHistogramMode={enableHistogramMode}
          backgroundColor={model.background_color}
          showGrid={Boolean(model.show_grid)}
          legend={Boolean(model.show_legend)}
          legendPosition={model.legend_position}
          tooltipMode={model.tooltip_mode}
          xAxisLabel={getAxisLabelString(interval)}
          xAxisFormatter={this.xAxisFormatter(interval)}
          annotations={this.prepareAnnotations()}
        />
      </div>
    );
  }
}
