/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { last, isNaN } from 'lodash';
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
    const { percentageMode: isPercentageMode, colorsRange } = this.props.visParams.metric;
    const lastRange = last(colorsRange);
    if (!colorsRange || !lastRange) {
      return [];
    }

    const max = lastRange.to;
    return colorsRange.map((range: any) => {
      const from = isPercentageMode ? Math.round((100 * range.from) / max) : range.from;
      const to = isPercentageMode ? Math.round((100 * range.to) / max) : range.to;
      return `${from} - ${to}`;
    });
  }

  private getColors() {
    const { invertColors, colorSchema, colorsRange } = this.props.visParams.metric;
    return this.getLabels().reduce<Record<string, string>>((colors, label, index) => {
      const divider = Math.max(colorsRange.length - 1, 1);
      const val = invertColors ? 1 - index / divider : index / divider;
      colors[label] = getHeatmapColors(val, colorSchema);
      return colors;
    }, {});
  }

  private getBucket(val: number) {
    const { colorsRange = [] } = this.props.visParams.metric;
    const bucket = colorsRange.findIndex((range) => range.from <= val && range.to > val);

    if (bucket === -1) {
      if (colorsRange?.[0] && val < colorsRange?.[0].from) {
        return 0;
      }
      return colorsRange.length - 1;
    }

    return bucket;
  }

  private getColor(val: number, labels: string[], colors: { [label: string]: string }) {
    const bucket = this.getBucket(val);
    return colors[labels[bucket]];
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
    if (isNaN(value)) {
      return '-';
    }

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
    const { dimensions, metric: metricConfig } = this.props.visParams;
    const { percentageMode: isPercentageMode, colorsRange, style } = metricConfig;
    const min = colorsRange?.[0]?.from ?? 0;
    const max = last(colorsRange)?.to ?? 0;
    const colors = this.getColors();
    const labels = this.getLabels();

    let bucketColumnId: string;
    let bucketFormatter: IFieldFormat;

    if (dimensions.bucket) {
      bucketColumnId = this.getColumn(dimensions.bucket.accessor, table.columns).id;
      bucketFormatter = getFormatService().deserialize(dimensions.bucket.format);
    }

    return dimensions.metrics.reduce(
      (acc: MetricOptions[], metric: ExpressionValueVisDimension) => {
        const column = this.getColumn(metric.accessor, table?.columns);
        const formatter = getFormatService().deserialize(metric.format);
        const metrics = table.rows.map((row, rowIndex) => {
          let title = column.name;
          let value = row[column.id];
          const color = this.getColor(value, labels, colors);

          if (isPercentageMode) {
            value = (value - min) / (max - min);
          }
          value = this.getFormattedValue(formatter, value, 'html');
          if (bucketColumnId) {
            const bucketValue = this.getFormattedValue(bucketFormatter, row[bucketColumnId]);
            title = `${bucketValue} - ${title}`;
          }

          const shouldColor = colorsRange.length > 1;

          return {
            label: title,
            value,
            color: shouldColor && style.labelColor ? color : undefined,
            bgColor: shouldColor && style.bgColor ? color : undefined,
            lightText: shouldColor && style.bgColor && this.needsLightText(color),
            rowIndex,
          };
        });
        return [...acc, ...metrics];
      },
      []
    );
  }

  private filterBucket = (metric: MetricOptions) => {
    const { dimensions } = this.props.visParams;
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
