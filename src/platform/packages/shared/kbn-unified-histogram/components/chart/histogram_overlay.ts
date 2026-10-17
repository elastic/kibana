/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import { isOfAggregateQueryType } from '@kbn/es-query';
import type { TextBasedPersistedState } from '@kbn/lens-common';
import type { LensAttributes } from '@kbn/lens-embeddable-utils';
import { UnifiedHistogramSuggestionType, type UnifiedHistogramFetchParams } from '../../types';

export const HISTOGRAM_OVERLAY_COLUMN = 'overlay';
export const HISTOGRAM_REMAINDER_COLUMN = 'remainder';
export const HISTOGRAM_TOTAL_COLUMN = 'results';

/**
 * Time-aligned subset stacked on the live histogram.
 * Each `values` entry is one dense, uniform bucket over `[from, to)`.
 * When `isSampled` has a valid `sampleProbability`, those values are divided by it before stacking.
 */
export interface UnifiedHistogramOverlaySeries {
  key: string;
  label: string;
  values: number[];
  timeField: string;
  from: string;
  to: string;
  sourceQuery: string;
  sourceTimeRange: { from: string; to: string };
  isSampled: boolean;
  sampleProbability?: number;
}

export interface UnifiedHistogramOverlaySeriesResult {
  key: string;
  applied: boolean;
  approximate: boolean;
}

interface HistogramOverlayColors {
  remainder: string;
  overlay: string;
  remainderLabel: string;
}

interface XyLayer {
  layerId?: string;
  seriesType?: string;
  accessors?: string[];
  yConfig?: Array<{ forAccessor: string; color?: string }>;
  [key: string]: unknown;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/**
 * Derives Lens attributes that plot remainder and overlay on the live histogram.
 * Applies only to one `bar_stacked` layer whose single accessor is `results`.
 * Returns the original attributes for every other chart shape.
 */
export const applyHistogramOverlayAttributes = (
  attributes: LensAttributes,
  overlaySeries: UnifiedHistogramOverlaySeries,
  colors: HistogramOverlayColors
): LensAttributes => {
  const textBased = attributes.state.datasourceStates.textBased as
    | TextBasedPersistedState
    | undefined;
  const layers = textBased?.layers;

  if (!layers) {
    return attributes;
  }

  const visualization = attributes.state.visualization;

  if (!isRecord(visualization) || !Array.isArray(visualization.layers)) {
    return attributes;
  }

  const [xyLayer, ...otherLayers] = visualization.layers as XyLayer[];

  if (
    !xyLayer ||
    otherLayers.length > 0 ||
    xyLayer.seriesType !== 'bar_stacked' ||
    xyLayer.accessors?.length !== 1 ||
    xyLayer.accessors[0] !== HISTOGRAM_TOTAL_COLUMN
  ) {
    return attributes;
  }

  const layerId = xyLayer.layerId;
  const layer = layerId ? layers[layerId] : undefined;
  const totalColumn = layer?.columns.find((column) => column.columnId === HISTOGRAM_TOTAL_COLUMN);
  const timeColumn = layer?.columns.find((column) => column.meta?.type === 'date');

  const generatedColumnIds = new Set<string>([
    HISTOGRAM_OVERLAY_COLUMN,
    HISTOGRAM_REMAINDER_COLUMN,
  ]);
  const generatedColumnCollides = layer?.columns.some(
    (column) => generatedColumnIds.has(column.columnId) || generatedColumnIds.has(column.fieldName)
  );

  if (!layer || !totalColumn || !timeColumn || layer.histogramOverlay || generatedColumnCollides) {
    return attributes;
  }

  const nextLayer = {
    ...layer,
    histogramOverlay: {
      label: overlaySeries.label,
      values: overlaySeries.values,
      from: overlaySeries.from,
      to: overlaySeries.to,
      isSampled: overlaySeries.isSampled,
      ...(overlaySeries.sampleProbability !== undefined
        ? { sampleProbability: overlaySeries.sampleProbability }
        : {}),
      timeColumn: timeColumn.fieldName,
      totalColumn: totalColumn.fieldName,
      overlayColumn: HISTOGRAM_OVERLAY_COLUMN,
      remainderColumn: HISTOGRAM_REMAINDER_COLUMN,
    },
    columns: [
      ...layer.columns,
      {
        columnId: HISTOGRAM_REMAINDER_COLUMN,
        fieldName: HISTOGRAM_REMAINDER_COLUMN,
        label: colors.remainderLabel,
        customLabel: true,
        meta: { type: 'number' as const },
        inMetricDimension: true,
      },
      {
        columnId: HISTOGRAM_OVERLAY_COLUMN,
        fieldName: HISTOGRAM_OVERLAY_COLUMN,
        label: overlaySeries.label,
        customLabel: true,
        meta: { type: 'number' as const },
        inMetricDimension: true,
      },
    ],
  };

  return {
    ...attributes,
    state: {
      ...attributes.state,
      datasourceStates: {
        ...attributes.state.datasourceStates,
        textBased: {
          ...textBased,
          layers: {
            ...layers,
            [layerId as string]: nextLayer,
          },
        },
      },
      visualization: {
        ...visualization,
        layers: [
          {
            ...xyLayer,
            accessors: [HISTOGRAM_REMAINDER_COLUMN, HISTOGRAM_OVERLAY_COLUMN],
            yConfig: [
              { forAccessor: HISTOGRAM_REMAINDER_COLUMN, color: colors.remainder },
              { forAccessor: HISTOGRAM_OVERLAY_COLUMN, color: colors.overlay },
            ],
          },
        ],
      },
    },
  };
};

export const useHistogramOverlayAttributes = ({
  attributes,
  suggestionType,
  fetchParams,
  overlaySeries,
  remainderColor,
  overlayColor,
  remainderLabel,
}: {
  attributes: LensAttributes | undefined;
  suggestionType: UnifiedHistogramSuggestionType | undefined;
  fetchParams: Pick<UnifiedHistogramFetchParams, 'query' | 'timeRange' | 'breakdown' | 'dataView'>;
  overlaySeries: UnifiedHistogramOverlaySeries | undefined;
  remainderColor: string;
  overlayColor: string;
  remainderLabel: string;
}): LensAttributes | undefined => {
  const sourceQuery = isOfAggregateQueryType(fetchParams.query)
    ? fetchParams.query.esql
    : undefined;
  const timeFrom = fetchParams.timeRange?.from;
  const timeTo = fetchParams.timeRange?.to;
  const breakdown = fetchParams.breakdown;
  const timeFieldName = fetchParams.dataView.timeFieldName;

  return useMemo(() => {
    if (
      !overlaySeries ||
      !attributes ||
      suggestionType !== UnifiedHistogramSuggestionType.histogramForESQL ||
      breakdown ||
      timeFieldName !== overlaySeries.timeField ||
      sourceQuery !== overlaySeries.sourceQuery ||
      timeFrom !== overlaySeries.sourceTimeRange.from ||
      timeTo !== overlaySeries.sourceTimeRange.to
    ) {
      return undefined;
    }

    const derived = applyHistogramOverlayAttributes(attributes, overlaySeries, {
      remainder: remainderColor,
      overlay: overlayColor,
      remainderLabel,
    });

    return derived === attributes ? undefined : derived;
  }, [
    attributes,
    suggestionType,
    overlaySeries,
    sourceQuery,
    timeFrom,
    timeTo,
    breakdown,
    timeFieldName,
    remainderColor,
    overlayColor,
    remainderLabel,
  ]);
};
