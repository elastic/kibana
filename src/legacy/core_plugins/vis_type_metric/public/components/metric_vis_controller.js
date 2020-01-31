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

import { last, findIndex, isNaN } from 'lodash';
import React, { Component } from 'react';
import { isColorDark } from '@elastic/eui';
import { getHeatmapColors } from 'ui/vislib/components/color/heatmap_color';
import { getFormat } from 'ui/visualize/loader/pipeline_helpers/utilities';

import { MetricVisValue } from './metric_vis_value';

export class MetricVisComponent extends Component {
  _getLabels() {
    const config = this.props.visParams.metric;
    const isPercentageMode = config.percentageMode;
    const colorsRange = config.colorsRange;
    const max = last(colorsRange).to;
    const labels = [];
    colorsRange.forEach(range => {
      const from = isPercentageMode ? Math.round((100 * range.from) / max) : range.from;
      const to = isPercentageMode ? Math.round((100 * range.to) / max) : range.to;
      labels.push(`${from} - ${to}`);
    });

    return labels;
  }

  _getColors() {
    const config = this.props.visParams.metric;
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
    const config = this.props.visParams.metric;
    let bucket = findIndex(config.colorsRange, range => {
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

  _getFormattedValue = (fieldFormatter, value, format = 'text') => {
    if (isNaN(value)) return '-';
    return fieldFormatter.convert(value, format);
  };

  _processTableGroups(table) {
    const config = this.props.visParams.metric;
    const dimensions = this.props.visParams.dimensions;
    const isPercentageMode = config.percentageMode;
    const min = config.colorsRange[0].from;
    const max = last(config.colorsRange).to;
    const colors = this._getColors();
    const labels = this._getLabels();
    const metrics = [];

    let bucketColumnId;
    let bucketFormatter;

    if (dimensions.bucket) {
      bucketColumnId = table.columns[dimensions.bucket.accessor].id;
      bucketFormatter = getFormat(dimensions.bucket.format);
    }

    dimensions.metrics.forEach(metric => {
      const columnIndex = metric.accessor;
      const column = table.columns[columnIndex];
      const formatter = getFormat(metric.format);
      table.rows.forEach((row, rowIndex) => {
        let title = column.name;
        let value = row[column.id];
        const color = this._getColor(value, labels, colors);

        if (isPercentageMode) {
          value = (value - min) / (max - min);
        }
        value = this._getFormattedValue(formatter, value, 'html');

        if (bucketColumnId) {
          const bucketValue = this._getFormattedValue(bucketFormatter, row[bucketColumnId]);
          title = `${bucketValue} - ${title}`;
        }

        const shouldColor = config.colorsRange.length > 1;

        metrics.push({
          label: title,
          value: value,
          color: shouldColor && config.style.labelColor ? color : null,
          bgColor: shouldColor && config.style.bgColor ? color : null,
          lightText: shouldColor && config.style.bgColor && this._needsLightText(color),
          rowIndex: rowIndex,
        });
      });
    });

    return metrics;
  }

  _filterBucket = metric => {
    const dimensions = this.props.visParams.dimensions;
    if (!dimensions.bucket) {
      return;
    }
    const table = this.props.visData;
    this.props.vis.API.events.filter({
      table,
      column: dimensions.bucket.accessor,
      row: metric.rowIndex,
    });
  };

  _renderMetric = (metric, index) => {
    return (
      <MetricVisValue
        key={index}
        metric={metric}
        fontSize={this.props.visParams.metric.style.fontSize}
        onFilter={this.props.visParams.dimensions.bucket ? this._filterBucket : null}
        showLabel={this.props.visParams.metric.labels.show}
      />
    );
  };

  render() {
    let metricsHtml;
    if (this.props.visData) {
      const metrics = this._processTableGroups(this.props.visData);
      metricsHtml = metrics.map(this._renderMetric);
    }
    return <div className="mtrVis">{metricsHtml}</div>;
  }

  componentDidMount() {
    this.props.renderComplete();
  }

  componentDidUpdate() {
    this.props.renderComplete();
  }
}
