/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import PropTypes from 'prop-types';
import React, { Component } from 'react';

import { startsWith, get, cloneDeep, map } from 'lodash';
import { htmlIdGenerator } from '@elastic/eui';
import { ScaleType } from '@elastic/charts';

import { createTickFormatter } from '../../lib/tick_formatter';
import { TimeSeries } from '../../../visualizations/views/timeseries';
import { MarkdownSimple } from '../../../../../../../plugins/kibana_react/public';
import { replaceVars } from '../../lib/replace_vars';
import { getInterval } from '../../lib/get_interval';
import { createIntervalBasedFormatter } from '../../lib/create_interval_based_formatter';
import { STACKED_OPTIONS } from '../../../visualizations/constants';
import { getCoreStart } from '../../../../services';

class TimeseriesVisualization extends Component {
  static propTypes = {
    model: PropTypes.object,
    onBrush: PropTypes.func,
    onFilterClick: PropTypes.func,
    visData: PropTypes.object,
    getConfig: PropTypes.func,
  };

  scaledDataFormat = this.props.getConfig('dateFormat:scaled');
  dateFormat = this.props.getConfig('dateFormat');

  xAxisFormatter = (interval) => {
    const formatter = createIntervalBasedFormatter(
      interval,
      this.scaledDataFormat,
      this.dateFormat,
      this.props.model.ignore_daylight_time
    );
    return (val) => formatter(val);
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
    const { model, visData, onBrush, onFilterClick, syncColors, palettesService } = this.props;
    const series = get(visData, `${model.id}.series`, []);
    const interval = getInterval(visData, model);
    const yAxisIdGenerator = htmlIdGenerator('yaxis');
    const mainAxisGroupId = yAxisIdGenerator('main_group');

    const seriesModel = model.series.filter((s) => !s.hidden).map((s) => cloneDeep(s));

    const mainAxisScaleType = TimeseriesVisualization.getAxisScaleType(model);
    const mainAxisDomain = TimeseriesVisualization.getYAxisDomain(model);
    const yAxis = [];
    let mainDomainAdded = false;

    const allSeriesHaveSameFormatters = seriesModel.every(
      (seriesGroup) => seriesGroup.formatter === seriesModel[0].formatter
    );

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
      const palette = {
        ...seriesGroup.palette,
        name:
          seriesGroup.split_color_mode === 'kibana'
            ? 'kibana_palette'
            : seriesGroup.split_color_mode || seriesGroup.palette?.name,
      };
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
          seriesDataRow.tickFormat = seriesGroupTickFormatter;
          seriesDataRow.groupId = groupId;
          seriesDataRow.yScaleType = yScaleType;
          seriesDataRow.hideInLegend = Boolean(seriesGroup.hide_in_legend);
          seriesDataRow.palette = palette;
          seriesDataRow.baseColor = seriesGroup.color;
          seriesDataRow.isSplitByTerms = seriesGroup.split_mode === 'terms';
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
          tickFormatter: allSeriesHaveSameFormatters ? seriesGroupTickFormatter : (val) => val,
          id: yAxisIdGenerator('main'),
          groupId: mainAxisGroupId,
          position: model.axis_position,
          domain: mainAxisDomain,
        });

        mainDomainAdded = true;
      }
    });

    return (
      <div className="tvbVis">
        <div className="tvbVisTimeSeries">
          <TimeSeries
            series={series}
            yAxis={yAxis}
            onBrush={onBrush}
            onFilterClick={onFilterClick}
            backgroundColor={model.background_color}
            showGrid={Boolean(model.show_grid)}
            legend={Boolean(model.show_legend)}
            legendPosition={model.legend_position}
            tooltipMode={model.tooltip_mode}
            xAxisFormatter={this.xAxisFormatter(interval)}
            annotations={this.prepareAnnotations()}
            syncColors={syncColors}
            palettesService={palettesService}
            interval={interval}
            isLastBucketDropped={Boolean(
              model.drop_last_bucket ||
                model.series.some((series) => series.series_drop_last_bucket)
            )}
          />
        </div>
      </div>
    );
  }
}

// default export required for React.Lazy
// eslint-disable-next-line import/no-default-export
export { TimeseriesVisualization as default };
