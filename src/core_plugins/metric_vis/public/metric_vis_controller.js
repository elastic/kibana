import _ from 'lodash';
import React, { Component } from 'react';
import { getHeatmapColors } from 'ui/vislib/components/color/heatmap_color';
import { isColorDark } from '@elastic/eui';

import { MetricVisValue } from './components/metric_vis_value';

export class MetricVisComponent extends Component {

  _getLabels() {
    const config = this.props.vis.params.metric;
    const isPercentageMode = config.percentageMode;
    const colorsRange = config.colorsRange;
    const max = _.last(colorsRange).to;
    const labels = [];
    colorsRange.forEach(range => {
      const from = isPercentageMode ? Math.round(100 * range.from / max) : range.from;
      const to = isPercentageMode ? Math.round(100 * range.to / max) : range.to;
      labels.push(`${from} - ${to}`);
    });

    return labels;
  }

  _getColors() {
    const config = this.props.vis.params.metric;
    const invertColors = config.invertColors;
    const colorSchema = config.colorSchema;
    const colorsRange = config.colorsRange;
    const labels = this._getLabels();
    const colors = {};
    for (let i = 0; i < labels.length; i += 1) {
      const divider = Math.max(colorsRange.length - 1, 1);
      const val = invertColors ? 1 - i / divider : i / divider;
      colors[labels[i]] = getHeatmapColors(val, colorSchema);
    }
    return colors;
  }

  _getBucket(val) {
    const config = this.props.vis.params.metric;
    let bucket = _.findIndex(config.colorsRange, range => {
      return range.from <= val && range.to > val;
    });

    if (bucket === -1) {
      if (val < config.colorsRange[0].from) bucket = 0;
      else bucket = config.colorsRange.length - 1;
    }

    return bucket;
  }

  _getColor(val, labels, colors) {
    const bucket = this._getBucket(val);
    const label = labels[bucket];
    return colors[label];
  }

  _needsLightText(bgColor) {
    const color = /rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/.exec(bgColor);
    if (!color) {
      return false;
    }
    return isColorDark(parseInt(color[1]), parseInt(color[2]), parseInt(color[3]));
  }

  _processTableGroups(tableGroups) {
    const config = this.props.vis.params.metric;
    const isPercentageMode = config.percentageMode;
    const min = config.colorsRange[0].from;
    const max = _.last(config.colorsRange).to;
    const colors = this._getColors();
    const labels = this._getLabels();
    const metrics = [];

    tableGroups.tables.forEach((table) => {
      let bucketAgg;
      let rowHeaderIndex;

      table.columns.forEach((column, i) => {
        const aggConfig = column.aggConfig;

        if (aggConfig && aggConfig.schema.group === 'buckets') {
          bucketAgg = aggConfig;
          // Store the current index, so we later know in which position in the
          // row array, the bucket agg key will be, so we can create filters on it.
          rowHeaderIndex = i;
          return;
        }

        table.rows.forEach(row => {

          let title = column.title;
          let value = row[i];
          const color = this._getColor(value, labels, colors);

          if (isPercentageMode) {
            const percentage = Math.round(100 * (value - min) / (max - min));
            value = `${percentage}%`;
          }

          if (aggConfig) {
            if (!isPercentageMode) value = aggConfig.fieldFormatter('html')(value);
            if (bucketAgg) {
              const bucketValue = bucketAgg.fieldFormatter('text')(row[0]);
              title = `${bucketValue} - ${aggConfig.makeLabel()}`;
            } else {
              title = aggConfig.makeLabel();
            }
          }

          const shouldColor = config.colorsRange.length > 1;

          metrics.push({
            label: title,
            value: value,
            color: shouldColor && config.style.labelColor ? color : null,
            bgColor: shouldColor && config.style.bgColor ? color : null,
            lightText: shouldColor && config.style.bgColor && this._needsLightText(color),
            filterKey: rowHeaderIndex !== undefined ? row[rowHeaderIndex] : null,
            bucketAgg: bucketAgg,
          });
        });
      });
    });

    return metrics;
  }

  _filterBucket = (metric) => {
    if (!metric.filterKey || !metric.bucketAgg) {
      return;
    }
    const filter = metric.bucketAgg.createFilter(metric.filterKey);
    this.props.vis.API.queryFilter.addFilters(filter);
  };

  _renderMetric = (metric, index) => {
    return (
      <MetricVisValue
        key={index}
        metric={metric}
        fontSize={this.props.vis.params.metric.style.fontSize}
        onFilter={metric.filterKey ? this._filterBucket : null}
        showLabel={this.props.vis.params.metric.labels.show}
      />
    );
  };

  render() {
    let metricsHtml;
    if (this.props.visData) {
      const metrics = this._processTableGroups(this.props.visData);
      metricsHtml = metrics.map(this._renderMetric);
    }
    return (<div className="metric-vis">{metricsHtml}</div>);
  }

  componentDidMount() {
    this.props.renderComplete();
  }

  componentDidUpdate() {
    this.props.renderComplete();
  }
}
