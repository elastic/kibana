/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { HeatmapConfigESQL } from '@kbn/lens-embeddable-utils';
import {
  HISTOGRAM_BUCKET_COLUMN,
  HISTOGRAM_COUNT_COLUMN,
  HISTOGRAM_TIME_BUCKET_COUNT,
  createTimeBucketAggregation,
} from '../../common/utils';
import type { HeatmapValueFormat } from '../../common/utils/metric_unit/get_heatmap_value_format';

/** Single-hue sequential palette from the issue: cool, percentage range, 5 steps, not reversed. */
export const HISTOGRAM_HEATMAP_PALETTE = 'cool';

const timeLabel = () =>
  i18n.translate('metricsExperience.heatmap.timeLabel', {
    defaultMessage: 'Time',
  });

const valueLabel = () =>
  i18n.translate('metricsExperience.heatmap.valueLabel', {
    defaultMessage: 'Value',
  });

const countLabel = () =>
  i18n.translate('metricsExperience.heatmap.countLabel', {
    defaultMessage: 'Count',
  });

/**
 * Builds the Lens API heatmap for a histogram distribution.
 * The older heatmap builder hides axis labels and forces the legend on, so this path does not use it.
 */
export const buildHistogramHeatmapConfig = ({
  query,
  title,
  description,
  valueFormat,
}: {
  query: string;
  title: string;
  description?: string;
  valueFormat?: HeatmapValueFormat;
}): HeatmapConfigESQL => {
  return {
    type: 'heatmap',
    title,
    ...(description != null ? { description } : {}),
    sampling: 1,
    ignore_global_filters: false,
    data_source: {
      type: 'esql',
      query,
    },
    metric: {
      column: HISTOGRAM_COUNT_COLUMN,
      label: countLabel(),
      format: { type: 'number', compact: true, decimals: 0 },
      color: {
        type: 'distributed_palette',
        palette: HISTOGRAM_HEATMAP_PALETTE,
      },
    },
    x: {
      column: createTimeBucketAggregation({ targetBuckets: HISTOGRAM_TIME_BUCKET_COUNT }),
      label: timeLabel(),
    },
    y: {
      column: HISTOGRAM_BUCKET_COLUMN,
      label: valueLabel(),
      ...(valueFormat ? { format: valueFormat } : {}),
    },
    axis: {
      x: {
        labels: { visible: true },
        title: { visible: false },
        scale: 'temporal',
      },
      y: {
        labels: { visible: true },
        title: { visible: false },
        sort: 'asc',
      },
    },
    legend: {
      visibility: 'hidden',
      position: 'right',
    },
    styling: {
      cells: {
        labels: { visible: false },
      },
    },
  };
};
