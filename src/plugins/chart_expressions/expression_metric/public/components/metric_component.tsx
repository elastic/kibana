/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { last, findIndex, isNaN } from 'lodash';
import React, { Component } from 'react';
import { isColorDark } from '@elastic/eui';
import { MetricVisValue } from './metric_value';
import { MetricInput, VisParams, MetricOptions } from '../../common/types';
import type { FieldFormatsContentType, IFieldFormat } from '../../../../field_formats/common';
import { Datatable } from '../../../../expressions/public';
import { getHeatmapColors } from '../../../../charts/public';
import { getFormatService } from '../format_service';
import { ExpressionValueVisDimension } from '../../../../visualizations/public';

import './metric.scss';

export interface MetricVisComponentProps {
  visParams: Pick<VisParams, 'metric' | 'dimensions'>;
  visData: MetricInput;
  fireEvent: (event: any) => void;
  renderComplete: () => void;
}

class MetricVisComponent extends Component<MetricVisComponentProps> {
  private getLabels() {
    const config = this.props.visParams.metric;
    const isPercentageMode = config.percentageMode;
    const colorsRange = config.colorsRange;
    const max = last(colorsRange)?.to ?? 1;
    const labels: string[] = [];

    colorsRange.forEach((range: any) => {
      const from = isPercentageMode ? Math.round((100 * range.from) / max) : range.from;
      const to = isPercentageMode ? Math.round((100 * range.to) / max) : range.to;
      labels.push(`${from} - ${to}`);
    });
    return labels;
  }

  private getColors() {
    const config = this.props.visParams.metric;
    const invertColors = config.invertColors;
    const colorSchema = config.colorSchema;
    const colorsRange = config.colorsRange;
    const labels = this.getLabels();
    const colors: any = {};
    for (let i = 0; i < labels.length; i += 1) {
      const divider = Math.max(colorsRange.length - 1, 1);
      const val = invertColors ? 1 - i / divider : i / divider;
      colors[labels[i]] = getHeatmapColors(val, colorSchema);
    }
    return colors;
  }

  private getBucket(val: number) {
    const config = this.props.visParams.metric;
    let bucket = findIndex(config.colorsRange, (range: any) => {
      return range.from <= val && range.to > val;
    });

    if (bucket === -1) {
      if (config.colorsRange?.[0] && val < config.colorsRange?.[0].from) bucket = 0;
      else bucket = config.colorsRange.length - 1;
    }

    return bucket;
  }

  private getColor(val: number, labels: string[], colors: { [label: string]: string }) {
    const bucket = this.getBucket(val);
    const label = labels[bucket];
    return colors[label];
  }

  private needsLightText(bgColor: string) {
    const colors = /rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/.exec(bgColor);
    if (!colors) {
      return false;
    }

    const [red, green, blue] = colors.slice(1).map((c) => parseInt(c, 10));
    return isColorDark(red, green, blue);
  }

  private getFormattedValue = (
    fieldFormatter: IFieldFormat,
    value: any,
    format: FieldFormatsContentType = 'text'
  ) => {
    if (isNaN(value)) return '-';
    return fieldFormatter.convert(value, format);
  };

  private getColumn(
    accessor: ExpressionValueVisDimension['accessor'],
    columns: Datatable['columns'] = []
  ) {
    if (typeof accessor === 'number') {
      return columns[accessor];
    }
    return columns.filter(({ id }) => accessor.id === id)[0];
  }

  private processTableGroups(table: Datatable) {
    const { metric: metricConfig, dimensions } = this.props.visParams;
    const { percentageMode: isPercentageMode, colorsRange, style } = metricConfig;
    const min = colorsRange?.[0]?.from;
    const max = last(colorsRange)?.to;
    const colors = this.getColors();
    const labels = this.getLabels();
    const metrics: MetricOptions[] = [];

    let bucketColumnId: string;
    let bucketFormatter: IFieldFormat;

    if (dimensions.bucket) {
      bucketColumnId = this.getColumn(dimensions.bucket.accessor, table.columns).id;
      bucketFormatter = getFormatService().deserialize(dimensions.bucket.format);
    }

    dimensions.metrics.forEach((metric: ExpressionValueVisDimension) => {
      const column = this.getColumn(metric.accessor, table?.columns);
      const formatter = getFormatService().deserialize(metric.format);
      table.rows.forEach((row, rowIndex) => {
        let title = column.name;
        let value: number = row[column.id];
        const color = this.getColor(value, labels, colors);

        if (isPercentageMode && colorsRange?.length && max !== undefined && min !== undefined) {
          value = (value - min) / (max - min);
        }
        const formattedValue = this.getFormattedValue(formatter, value, 'html');
        if (bucketColumnId) {
          const bucketValue = this.getFormattedValue(bucketFormatter, row[bucketColumnId]);
          title = `${bucketValue} - ${title}`;
        }

        const shouldColor = colorsRange && colorsRange.length > 1;

        metrics.push({
          label: title,
          value: formattedValue,
          color: shouldColor && style.labelColor ? color : undefined,
          bgColor: shouldColor && style.bgColor ? color : undefined,
          lightText: shouldColor && style.bgColor && this.needsLightText(color),
          rowIndex,
        });
      });
    });

    return metrics;
  }

  private filterBucket = (metric: MetricOptions) => {
    const dimensions = this.props.visParams.dimensions;
    if (!dimensions.bucket) {
      return;
    }
    const table = this.props.visData;
    this.props.fireEvent({
      name: 'filterBucket',
      data: {
        data: [
          {
            table,
            column: dimensions.bucket.accessor,
            row: metric.rowIndex,
          },
        ],
      },
    });
  };

  private renderMetric = (metric: MetricOptions, index: number) => {
    return (
      <MetricVisValue
        key={index}
        metric={metric}
        fontSize={this.props.visParams.metric.style.fontSize}
        onFilter={this.props.visParams.dimensions.bucket ? this.filterBucket : undefined}
        showLabel={this.props.visParams.metric.labels.show}
      />
    );
  };

  componentDidMount() {
    this.props.renderComplete();
  }

  componentDidUpdate() {
    this.props.renderComplete();
  }

  render() {
    let metricsHtml;
    if (this.props.visData) {
      const metrics = this.processTableGroups(this.props.visData);
      metricsHtml = metrics.map(this.renderMetric);
    }
    return metricsHtml;
  }
}

// default export required for React.Lazy
// eslint-disable-next-line import/no-default-export
export { MetricVisComponent as default };
