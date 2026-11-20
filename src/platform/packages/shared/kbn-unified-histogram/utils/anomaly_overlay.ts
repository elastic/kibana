/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { TypedLensByValueInput } from '@kbn/lens-plugin/public';

export const ANOMALY_OVERLAY_LAYER_ID = 'unifiedHistogramAnomalyOverlay';

/** A time range in which anomalies were detected, with the highest score found in it */
export interface UnifiedHistogramAnomalyRange {
  /** The job which found the anomalies */
  jobId?: string;
  /** Start of the range, in epoch ms */
  start: number;
  /** End of the range, in epoch ms */
  end: number;
  /** Highest anomaly score (0-100) in the range */
  score: number;
  /** Optional text shown in the annotation tooltip */
  label?: string;
}

/** The anomaly ranges in a time range, which is the whole range of the chart */
export interface UnifiedHistogramAnomalyOverlay {
  ranges: UnifiedHistogramAnomalyRange[];
  /** The time range of the chart, in epoch ms */
  timeRange: { from: number; to: number };
}

// Severity colours, matching the thresholds used by the ML anomaly swimlanes
const SEVERITY_COLORS = [
  { minScore: 75, color: '#FE5050' }, // critical
  { minScore: 50, color: '#FF7E62' }, // major
  { minScore: 25, color: '#FDEC25' }, // minor
  { minScore: 3, color: '#8BC8FB' }, // warning
] as const;

export const getAnomalyScoreColor = (score: number): string | undefined =>
  SEVERITY_COLORS.find(({ minScore }) => score >= minScore)?.color;

/** The opacity of the annotations until the pointer is over one, which makes it opaque */
export const FADED_OPACITY = 0.6;

const toFadedColor = (hexColor: string): string => {
  const [red, green, blue] = [1, 3, 5].map((start) =>
    parseInt(hexColor.slice(start, start + 2), 16)
  );
  return `rgba(${red}, ${green}, ${blue}, ${FADED_OPACITY})`;
};

// Annotations which show nothing, and which cover the time between the anomalies so that
// the whole strip, and not only the anomalies in it, can be hovered
const HOVER_AREA_COLOR = 'rgba(0, 0, 0, 0)';

const toIso = (epochMs: number) => new Date(epochMs).toISOString();

/**
 * The id of the data view the chart reads: a referenced data view, or for an ES|QL
 * chart the ad hoc data view of its query.
 */
const getDataViewId = (attributes: TypedLensByValueInput['attributes']): string | undefined => {
  const referenced = attributes.references.find(({ type }) => type === 'index-pattern')?.id;
  if (referenced) {
    return referenced;
  }
  const textBasedLayers = attributes.state.datasourceStates.textBased?.layers ?? {};
  return Object.values(textBasedLayers).find((layer) => layer.index)?.index;
};

/**
 * Returns a copy of the histogram's Lens attributes with a layer of range annotations,
 * one per anomaly range, drawn outside the plot area along the time axis. Where there are
 * no anomalies in the time range, transparent annotations make the whole strip hoverable.
 */
export const addAnomalyOverlayToAttributes = (
  attributes: TypedLensByValueInput['attributes'],
  ranges: readonly UnifiedHistogramAnomalyRange[] | undefined,
  timeRange?: UnifiedHistogramAnomalyOverlay['timeRange']
): TypedLensByValueInput['attributes'] => {
  const dataViewId = getDataViewId(attributes);
  if (!ranges?.length || attributes.visualizationType !== 'lnsXY' || !dataViewId) {
    return attributes;
  }

  const shownRanges = ranges
    .flatMap((range) => {
      const color = getAnomalyScoreColor(range.score);
      return color ? [{ ...range, color }] : [];
    })
    .sort((a, b) => a.start - b.start);

  if (!shownRanges.length) {
    return attributes;
  }

  const annotations = shownRanges.map(({ start, end, score, label, color }, index) => ({
    id: `anomaly-${index}`,
    type: 'manual' as const,
    key: { type: 'range' as const, timestamp: toIso(start), endTimestamp: toIso(end) },
    label:
      label ??
      i18n.translate('unifiedHistogram.anomalyOverlay.maxScoreLabel', {
        defaultMessage: 'Max anomaly score {score}',
        values: { score: Math.round(score) },
      }),
    color: toFadedColor(color),
    outside: true,
  }));

  if (timeRange) {
    const gaps: Array<{ start: number; end: number }> = [];
    let cursor = timeRange.from;
    for (const { start, end } of shownRanges) {
      if (start > cursor) {
        gaps.push({ start: cursor, end: Math.min(start, timeRange.to) });
      }
      cursor = Math.max(cursor, end);
    }
    if (cursor < timeRange.to) {
      gaps.push({ start: cursor, end: timeRange.to });
    }
    gaps.forEach(({ start, end }, index) => {
      annotations.push({
        id: `anomaly-hover-area-${index}`,
        type: 'manual' as const,
        key: { type: 'range' as const, timestamp: toIso(start), endTimestamp: toIso(end) },
        label: '',
        color: HOVER_AREA_COLOR,
        outside: true,
      });
    });
  }

  const visualization = attributes.state.visualization as { layers?: unknown[] };

  return {
    ...attributes,
    state: {
      ...attributes.state,
      visualization: {
        ...visualization,
        layers: [
          ...(visualization.layers ?? []),
          {
            layerId: ANOMALY_OVERLAY_LAYER_ID,
            layerType: 'annotations',
            indexPatternId: dataViewId,
            ignoreGlobalFilters: true,
            annotations,
          },
        ],
      },
    },
  } as TypedLensByValueInput['attributes'];
};
