/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { PointerEvent } from 'react';
import { css } from '@emotion/react';
import { LAYOUT } from '../geometry/layout';
import type { MapGeometry, PxRect } from '../geometry/map_geometry';
import type { LatencyMapColors } from '../hooks/use_latency_map_colors';

/** Marks what takes the pointer in the overlay, so a press elsewhere is known to be the chart's. */
export const OVERLAY_CONTROL_ATTRIBUTE = 'data-latency-map-control';

/** Veils the plot around the selection, as four rectangles, so the selected cells stand out. */
function OutsideSelectionMask({
  rect,
  geometry,
  fill,
}: {
  rect: PxRect;
  geometry: MapGeometry;
  fill: string;
}) {
  const { plotLeft, plotRight, plotTop, plotBottom } = geometry;
  const width = plotRight - plotLeft;
  return (
    <g pointerEvents="none" data-test-subj="traceLatencyMapOutsideMask">
      <rect
        x={plotLeft}
        y={plotTop}
        width={width}
        height={Math.max(rect.y0 - plotTop, 0)}
        fill={fill}
      />
      <rect
        x={plotLeft}
        y={rect.y1}
        width={width}
        height={Math.max(plotBottom - rect.y1, 0)}
        fill={fill}
      />
      <rect
        x={plotLeft}
        y={rect.y0}
        width={Math.max(rect.x0 - plotLeft, 0)}
        height={rect.y1 - rect.y0}
        fill={fill}
      />
      <rect
        x={rect.x1}
        y={rect.y0}
        width={Math.max(plotRight - rect.x1, 0)}
        height={rect.y1 - rect.y0}
        fill={fill}
      />
    </g>
  );
}

/**
 * What goes over the chart. The cell under the pointer gets an outline, which the chart does not
 * draw. The selection, which the chart draws itself, gets what it cannot: a grip and handles for
 * moving and resizing. It takes pointer events only on the selection and its handles, so the
 * chart keeps its tooltip and its brush everywhere else.
 */
export function SelectionOverlay({
  geometry,
  rect,
  hoverRect,
  colors,
  width,
  height,
  showHandles,
  isMoving,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}: {
  geometry: MapGeometry;
  /** The selection, when there is one. */
  rect?: PxRect;
  /** The cell under the pointer. */
  hoverRect?: PxRect;
  colors: LatencyMapColors;
  width: number;
  height: number;
  showHandles: boolean;
  /** The selection is being moved or resized: the cursor says so, and nothing else reacts. */
  isMoving: boolean;
  onPointerDown: (event: PointerEvent<SVGSVGElement>) => void;
  onPointerMove: (event: PointerEvent<SVGSVGElement>) => void;
  onPointerUp: (event: PointerEvent<SVGSVGElement>) => void;
  onPointerCancel: () => void;
}) {
  return (
    <svg
      width={width}
      height={height}
      aria-hidden="true"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      css={css`
        position: absolute;
        inset: 0;
        pointer-events: none;
        touch-action: none;
      `}
      data-test-subj="traceLatencyMapOverlay"
    >
      {rect && (
        <OutsideSelectionMask rect={rect} geometry={geometry} fill={colors.outsideSelectionMask} />
      )}
      {hoverRect && (
        <rect
          x={hoverRect.x0}
          y={hoverRect.y0}
          width={hoverRect.x1 - hoverRect.x0}
          height={hoverRect.y1 - hoverRect.y0}
          fill="none"
          stroke={colors.hoverOutline}
          strokeWidth={1.5}
          pointerEvents="none"
          data-test-subj="traceLatencyMapHover"
        />
      )}
      {rect && (
        <rect
          x={rect.x0}
          y={rect.y0}
          width={rect.x1 - rect.x0}
          height={rect.y1 - rect.y0}
          fill="transparent"
          pointerEvents="all"
          style={{ cursor: isMoving ? 'grabbing' : 'grab' }}
          {...{ [OVERLAY_CONTROL_ATTRIBUTE]: '' }}
          data-test-subj="traceLatencyMapGrip"
        />
      )}
      {rect &&
        showHandles &&
        geometry
          .getHandles(rect)
          .map((handle) => (
            <rect
              key={handle.id}
              x={handle.x - LAYOUT.handleSize / 2}
              y={handle.y - LAYOUT.handleSize / 2}
              width={LAYOUT.handleSize}
              height={LAYOUT.handleSize}
              rx={2}
              fill={colors.handleFill}
              stroke={colors.selectionStroke}
              strokeWidth={1.5}
              pointerEvents="all"
              style={{ cursor: handle.cursor }}
              {...{ [OVERLAY_CONTROL_ATTRIBUTE]: '' }}
              data-test-subj={`traceLatencyMapHandle-${handle.id}`}
            />
          ))}
    </svg>
  );
}
