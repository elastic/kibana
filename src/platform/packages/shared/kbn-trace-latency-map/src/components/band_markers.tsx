/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useEuiTheme } from '@elastic/eui';
import { formatDuration, formatShare } from '../geometry/ticks';
import type { MapGeometry } from '../geometry/map_geometry';
import type { DurationBand } from '../operations/detect_bands';
import type { LatencyMapOperation, OperationBands } from '../operations/operation_bands';
import type { LatencyMapColors } from '../hooks/use_latency_map_colors';
import { OVERLAY_CONTROL_ATTRIBUTE } from './selection_overlay';

/** From this error rate on, a band label shows in the danger colour. */
const FAILING_ERROR_RATE = 0.1;

const FASTEST = i18n.translate('traceLatencyMap.band.fastest', { defaultMessage: 'Fastest' });
const FAST = i18n.translate('traceLatencyMap.band.fast', { defaultMessage: 'Fast' });
const MIDDLE = i18n.translate('traceLatencyMap.band.middle', { defaultMessage: 'Middle' });
const SLOW = i18n.translate('traceLatencyMap.band.slow', { defaultMessage: 'Slow' });
const SLOWEST = i18n.translate('traceLatencyMap.band.slowest', { defaultMessage: 'Slowest' });

const BAND_NAMES: Record<number, string[]> = {
  2: [FAST, SLOW],
  3: [FAST, MIDDLE, SLOW],
  4: [FASTEST, FAST, SLOW, SLOWEST],
};

/** Bands are named by speed within their operation, fastest first. */
export const getBandName = (index: number, count: number) => BAND_NAMES[count]?.[index] ?? '';

const getErrorRate = (band: DurationBand) => (band.count ? band.errors / band.count : 0);

const getBandTooltip = (band: DurationBand, name: string, operation: LatencyMapOperation) =>
  i18n.translate('traceLatencyMap.band.tooltip', {
    defaultMessage:
      '{name} group of {service} {operation}: {share} of its spans, {minDuration} to {maxDuration}, {errorRate} failed. Click to select it.',
    values: {
      name,
      service: operation.service,
      operation: operation.name,
      share: formatShare(band.share),
      minDuration: formatDuration(band.minDuration),
      maxDuration: formatDuration(band.maxDuration),
      errorRate: formatShare(getErrorRate(band)),
    },
  });

/** A band's label takes two text lines: its name and share, then its duration range. */
const LABEL_HEIGHT = 22;

/**
 * Where each band's label goes: at the band's middle, moved apart so labels of bands close
 * together do not overlap, and kept within the plot. `middles` in the bands' order; the
 * result in the same order.
 */
export function layoutBandLabels(
  middles: number[],
  { top, bottom, gap = LABEL_HEIGHT }: { top: number; bottom: number; gap?: number }
): number[] {
  const order = middles.map((y, index) => ({ y, index })).sort((a, b) => a.y - b.y);
  const placed = order.map(({ y }) => y);
  // Downward, each label at least a gap below the one above it.
  for (let i = 1; i < placed.length; i++) placed[i] = Math.max(placed[i], placed[i - 1] + gap);
  // Then back up from the bottom, so the lowest label stays within the plot.
  const lowest = bottom - gap / 2;
  if (placed.length) placed[placed.length - 1] = Math.min(placed[placed.length - 1], lowest);
  for (let i = placed.length - 2; i >= 0; i--) placed[i] = Math.min(placed[i], placed[i + 1] - gap);
  const highest = top + gap / 2;
  const result = new Array<number>(middles.length);
  order.forEach(({ index }, i) => (result[index] = Math.max(placed[i], highest)));
  return result;
}

/**
 * The duration groups of the operation the map shows, right of the plot: a bracket along
 * each band's rows, its name and share, then its duration range. Click to select a group.
 * Drawn in its own SVG under the selection overlay; only the band groups take the pointer,
 * marked as overlay controls so a press on them never starts a drawing gesture.
 */
export function BandMarkers({
  operationBands: { operation, bands },
  geometry,
  colors,
  width,
  height,
  onSelectBand,
}: {
  operationBands: OperationBands;
  geometry: MapGeometry;
  colors: LatencyMapColors;
  width: number;
  height: number;
  /** With the label the selection shows. */
  onSelectBand: (band: DurationBand, label: string) => void;
}) {
  const { euiTheme } = useEuiTheme();
  const x = geometry.plotRight + 4;
  const labelYs = layoutBandLabels(
    bands.map((band) => (geometry.edgeToY(band.highRow + 1) + geometry.edgeToY(band.lowRow)) / 2),
    { top: geometry.plotTop, bottom: geometry.plotBottom }
  );
  return (
    <svg
      width={width}
      height={height}
      role="group"
      aria-label={i18n.translate('traceLatencyMap.band.groupsLabel', {
        defaultMessage: 'Duration groups of {service} {operation}',
        values: { service: operation.service, operation: operation.name },
      })}
      css={css`
        position: absolute;
        inset: 0;
        pointer-events: none;
      `}
      data-test-subj="traceLatencyMapBands"
    >
      {bands.map((band, index) => {
        const name = getBandName(index, bands.length);
        const failing = getErrorRate(band) >= FAILING_ERROR_RATE;
        const top = geometry.edgeToY(band.highRow + 1);
        const bottom = geometry.edgeToY(band.lowRow);
        const middle = labelYs[index];
        const select = () =>
          onSelectBand(
            band,
            i18n.translate('traceLatencyMap.band.groupSelectionLabel', {
              defaultMessage: '{name} group',
              values: { name },
            })
          );
        return (
          <g
            key={band.lowRow}
            pointerEvents="all"
            role="button"
            tabIndex={0}
            aria-label={getBandTooltip(band, name, operation)}
            css={css`
              cursor: pointer;
              &:focus-visible {
                outline: ${euiTheme.focus.width} solid ${euiTheme.colors.primary};
              }
            `}
            onClick={select}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                select();
              }
            }}
            {...{ [OVERLAY_CONTROL_ATTRIBUTE]: '' }}
            data-test-subj={`traceLatencyMapBand-${index + 1}`}
          >
            <title>{getBandTooltip(band, name, operation)}</title>
            <path d={`M ${x} ${top} h 4 V ${bottom} h -4`} stroke={colors.axisText} fill="none" />
            <text
              x={x + 8}
              y={middle - 2}
              fontSize={10}
              fill={failing ? euiTheme.colors.textDanger : euiTheme.colors.textHeading}
              fontWeight={600}
            >
              {i18n.translate('traceLatencyMap.band.label', {
                defaultMessage: '{name} · {share}',
                values: { name, share: formatShare(band.share) },
              })}
            </text>
            <text x={x + 8} y={middle + 9} fontSize={9} fill={colors.axisText}>
              {i18n.translate('traceLatencyMap.band.rangeLabel', {
                defaultMessage: '{minDuration}-{maxDuration}',
                values: {
                  minDuration: formatDuration(band.minDuration),
                  maxDuration: formatDuration(band.maxDuration),
                },
              })}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
