/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import { isSameRange } from '../geometry/cell_range';
import type { Cell, CellRange } from '../geometry/cell_range';
import { LAYOUT } from '../geometry/layout';
import type { MapGeometry, PlotArea, Point } from '../geometry/map_geometry';
import { endGesture, moveGesture, startGesture } from '../selection/gesture';
import type { Gesture } from '../selection/gesture';
import { OVERLAY_CONTROL_ATTRIBUTE } from '../components/selection_overlay';

/** A pointer event in the pixels of the chart, whose box the layer shares. */
const toLayerPoint = (event: { clientX: number; clientY: number }, box: DOMRect): Point => ({
  x: event.clientX - box.left,
  y: event.clientY - box.top,
});

export interface SelectionGestureHandlers {
  onPointerDown: (event: PointerEvent<SVGSVGElement>) => void;
  onPointerMove: (event: PointerEvent<SVGSVGElement>) => void;
  onPointerUp: (event: PointerEvent<SVGSVGElement>) => void;
  onPointerCancel: () => void;
}

/**
 * The pointer gestures of the selection. Drawing a region is the map's own gesture, not the
 * chart's brush: it then also starts on the margins and just above the chart (clamped to
 * the plot, so the top row is easy to catch from the top), and an existing selection never
 * swallows it mid-drag. It is captured on the container, so that the chart below cannot
 * stop it, and followed on the window, as the pointer may leave the map. Moving and
 * resizing the selection are the overlay's, on its grip and handles. The chart's brush
 * stays wired as the fallback until its first cell calibrates the geometry.
 */
export function useSelectionGestures({
  container,
  layer,
  geometry,
  plot,
  committedRange,
  width,
  height,
  onCommitRange,
  onClickCell,
  onPress,
}: {
  container: HTMLDivElement | null;
  layer: HTMLDivElement | null;
  geometry?: MapGeometry;
  plot?: PlotArea;
  committedRange?: CellRange;
  width: number;
  height: number;
  /** A region was drawn, or the selection moved or resized (`ofSelection`). */
  onCommitRange: (range: CellRange, options?: { ofSelection?: boolean }) => void;
  /** A press that did not travel, on a cell. */
  onClickCell: (cell: Cell) => void;
  /** Any press on the map, before the gesture is known. */
  onPress: () => void;
}): {
  /** The region as the gesture in progress has it. */
  draft?: CellRange;
  isDrawing: boolean;
  isMoving: boolean;
  /** Ends a gesture in progress without committing; false when none was running. */
  cancelGesture: () => boolean;
  /** Forgets everything: a new grid put the cells elsewhere. */
  resetGestures: () => void;
  overlayHandlers: SelectionGestureHandlers;
} {
  const gestureRef = useRef<Gesture>();
  // The drawing pointer's id: a second finger, wherever it lands, neither moves nor ends it.
  const drawingPointerId = useRef<number>();
  const [draft, setDraft] = useState<CellRange>();
  const [isDrawing, setIsDrawing] = useState(false);
  const [isMoving, setIsMoving] = useState(false);

  const updateDraft = (range: CellRange) =>
    setDraft((previous) => (previous && isSameRange(previous, range) ? previous : range));
  const resetGestures = useCallback(() => {
    gestureRef.current = undefined;
    setDraft(undefined);
    setIsMoving(false);
    setIsDrawing(false);
  }, []);
  const cancelGesture = useCallback(() => {
    if (!gestureRef.current) return false;
    resetGestures();
    return true;
  }, [resetGestures]);

  // The window and container listeners are added once; they read the latest values here.
  const latest = useRef({
    geometry,
    plot,
    layer,
    committedRange,
    onCommitRange,
    onClickCell,
    onPress,
    width,
    height,
  });
  latest.current = {
    geometry,
    plot,
    layer,
    committedRange,
    onCommitRange,
    onClickCell,
    onPress,
    width,
    height,
  };

  useEffect(() => {
    if (!container) return;
    const handlePointerDown = (event: globalThis.PointerEvent) => {
      latest.current.onPress();
      const target = event.target as Element;
      if (event.button !== 0 || target.closest?.(`[${OVERLAY_CONTROL_ATTRIBUTE}], button, a`)) {
        return;
      }
      const { geometry: current, plot: currentPlot, layer: layerEl } = latest.current;
      if (!current || !currentPlot || !layerEl) return;
      // The chart's own box (the layer), and the grab band just above it, under the header.
      const point = toLayerPoint(event, layerEl.getBoundingClientRect());
      if (
        point.x < 0 ||
        point.x > latest.current.width ||
        point.y < -LAYOUT.grabAbovePx ||
        point.y > latest.current.height
      ) {
        return;
      }
      const gesture = startGesture(point, current, latest.current.committedRange);
      // The grip and the handles take their presses on the overlay instead.
      if (gesture.kind !== 'drawing') return;
      gestureRef.current = gesture;
      drawingPointerId.current = event.pointerId;
      setIsDrawing(true);
      // The chart reads mouse events for its own brush and click: swallow this press's
      // compatibility mousedown, which follows the pointer event, so only one of us draws.
      const suppress = (mouseEvent: Event) => mouseEvent.stopPropagation();
      container.addEventListener('mousedown', suppress, true);
      setTimeout(() => container.removeEventListener('mousedown', suppress, true));
    };
    container.addEventListener('pointerdown', handlePointerDown, true);
    return () => container.removeEventListener('pointerdown', handlePointerDown, true);
  }, [container]);

  useEffect(() => {
    const drawingWith = (event: globalThis.PointerEvent): Gesture | undefined => {
      const gesture = gestureRef.current;
      return gesture?.kind === 'drawing' && event.pointerId === drawingPointerId.current
        ? gesture
        : undefined;
    };
    const handlePointerMove = (event: globalThis.PointerEvent) => {
      const gesture = drawingWith(event);
      const { geometry: current, layer: layerEl } = latest.current;
      if (!gesture || !current || !layerEl) return;
      updateDraft(
        moveGesture(gesture, toLayerPoint(event, layerEl.getBoundingClientRect()), current)
      );
    };
    const handlePointerUp = (event: globalThis.PointerEvent) => {
      const gesture = drawingWith(event);
      if (!gesture) return;
      resetGestures();
      const {
        geometry: current,
        layer: layerEl,
        onCommitRange: commit,
        onClickCell: click,
      } = latest.current;
      if (!current || !layerEl) return;
      const end = endGesture(
        gesture,
        toLayerPoint(event, layerEl.getBoundingClientRect()),
        current
      );
      if (end.type === 'range') commit(end.range);
      else if (end.type === 'click') click(end.cell);
    };
    const handlePointerCancel = (event: globalThis.PointerEvent) => {
      if (drawingWith(event)) resetGestures();
    };
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerCancel);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerCancel);
    };
  }, [resetGestures]);

  const getPoint = (event: PointerEvent<SVGSVGElement>) =>
    toLayerPoint(event, event.currentTarget.getBoundingClientRect());
  const overlayHandlers: SelectionGestureHandlers = {
    onPointerDown: (event) => {
      if (!geometry || !plot || event.button !== 0) return;
      const gesture = startGesture(getPoint(event), geometry, committedRange);
      // Only the grip and the handles reach the overlay; drawing starts on the layer below.
      if (gesture.kind === 'drawing') return;
      gestureRef.current = gesture;
      setIsMoving(true);
      (event.target as Element).setPointerCapture?.(event.pointerId);
    },
    onPointerMove: (event) => {
      if (!geometry || !gestureRef.current) return;
      updateDraft(moveGesture(gestureRef.current, getPoint(event), geometry));
    },
    onPointerUp: (event) => {
      const gesture = gestureRef.current;
      if (!geometry || !gesture) return;
      const end = endGesture(gesture, getPoint(event), geometry);
      resetGestures();
      (event.target as Element).releasePointerCapture?.(event.pointerId);
      // The overlay's gestures move or resize the selection: the region stays the same one.
      if (end.type === 'range') onCommitRange(end.range, { ofSelection: true });
      else if (end.type === 'click') onClickCell(end.cell);
    },
    onPointerCancel: () => {
      resetGestures();
    },
  };

  return { draft, isDrawing, isMoving, cancelGesture, resetGestures, overlayHandlers };
}
