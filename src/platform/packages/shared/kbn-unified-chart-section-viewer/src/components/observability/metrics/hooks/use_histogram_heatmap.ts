/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import { isHistogramHeatmapVisualization, type HistogramVisualization } from '@kbn/discover-utils';
import type { LensHeatmapConfig } from '@kbn/lens-embeddable-utils';
import { FEATURE_FLAG_DEFAULTS, FEATURE_FLAGS } from '../../../../common/constants';
import {
  createHistogramDistributionQuery,
  firstNonNullable,
  getMetricUniqueKey,
} from '../../../../common/utils';
import { isHistogramMetric } from '../../../../common/utils/histogram_metric';
import { useFeatureFlag } from '../../../../hooks/use_feature_flag';
import type { Dimension, ParsedMetricItem } from '../../../../types';
import { buildHistogramHeatmapConfig } from '../../../chart/build_histogram_heatmap_config';
import type { HistogramBoundsByMetricKey } from './use_fetch_histogram_bounds';

export interface UseHistogramHeatmapParams {
  metricItem: ParsedMetricItem;
  applicableDimensions: readonly Dimension[];
  histogramBounds: HistogramBoundsByMetricKey;
  histogramBoundsLoading: boolean;
  whereStatements?: readonly string[];
  originalSource?: string;
  histogramVisualization: HistogramVisualization;
  description?: string;
  seriesColor: string;
  backgroundColor: string;
}

export interface HistogramHeatmapState {
  readonly shouldRenderHistogram: boolean;
  readonly boundsError?: Error;
  readonly distributionQuery?: string;
  readonly heatmapConfig?: LensHeatmapConfig;
}

/** Decides whether a metric cell draws a histogram heatmap, and builds that chart when it does. */
export const useHistogramHeatmap = ({
  metricItem,
  applicableDimensions,
  histogramBounds,
  histogramBoundsLoading,
  whereStatements,
  originalSource,
  histogramVisualization,
  description,
  seriesColor,
  backgroundColor,
}: UseHistogramHeatmapParams): HistogramHeatmapState => {
  const isHeatmapsEnabled = useFeatureFlag(
    FEATURE_FLAGS.IS_HEATMAPS_ENABLED,
    FEATURE_FLAG_DEFAULTS[FEATURE_FLAGS.IS_HEATMAPS_ENABLED]
  );
  // Series visualizations draw the percentile chart. Heatmap visualizations draw the distribution.
  const isHistogramDistribution =
    isHeatmapsEnabled &&
    isHistogramHeatmapVisualization(histogramVisualization) &&
    isHistogramMetric(
      firstNonNullable(metricItem.fieldTypes),
      firstNonNullable(metricItem.metricTypes)
    );
  const { bounds, error: boundsError } = isHistogramDistribution
    ? histogramBounds.get(getMetricUniqueKey(metricItem)) ?? {}
    : {};
  // A breakdown splits the series chart. Heatmaps do not encode that split yet.
  const hasBreakdown = applicableDimensions.length > 0;
  // Missing bounds skip the histogram and use the series chart. A point (min === max) still draws.
  // Loading and errors stay on the histogram path so the series chart does not flash first.
  const shouldRenderHistogram =
    isHistogramDistribution &&
    !hasBreakdown &&
    (histogramBoundsLoading || boundsError !== undefined || bounds !== undefined);

  const distributionQuery = useMemo(() => {
    if (!shouldRenderHistogram || !bounds) {
      return undefined;
    }
    return createHistogramDistributionQuery({
      metricItem,
      bounds,
      whereStatements,
      originalSource,
    });
  }, [shouldRenderHistogram, bounds, metricItem, whereStatements, originalSource]);

  const heatmapConfig = useMemo(
    () =>
      distributionQuery
        ? buildHistogramHeatmapConfig({
            query: distributionQuery,
            title: metricItem.metricName,
            description,
            seriesColor,
            backgroundColor,
          })
        : undefined,
    [distributionQuery, metricItem.metricName, description, seriesColor, backgroundColor]
  );

  return { shouldRenderHistogram, boundsError, distributionQuery, heatmapConfig };
};
