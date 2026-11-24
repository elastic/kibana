/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent, ReactNode } from 'react';
import { css } from '@emotion/react';
import {
  EuiDelayRender,
  EuiFlexGroup,
  EuiLoadingChart,
  EuiProgress,
  EuiScreenReaderOnly,
  EuiSpacer,
  EuiText,
  useEuiTheme,
  useResizeObserver,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KbnDangerCallout } from '@kbn/ui-callout';
import type {
  DurationStats,
  LatencyMapCell,
  LatencyMapSelection,
  LatencyMapUnit,
  RunEsql,
  TraceSource,
} from '../types';
import { LATENCY_MAP_INNER_ROWS, durationToRow, rowToDuration } from '../query/duration_rows';
import { getMapSource } from '../query/latency_map_query';
import { getCellKey } from '../query/parse';
import { clampRange, isSameRange } from '../geometry/cell_range';
import type { Cell, CellRange } from '../geometry/cell_range';
import { LAYOUT, getTimeBinsForWidth } from '../geometry/layout';
import { createMapGeometry } from '../geometry/map_geometry';
import type { PlotArea, Point } from '../geometry/map_geometry';
import { isSamePlot } from '../geometry/plot_calibration';
import { formatDuration, formatTimestamp } from '../geometry/ticks';
import { useLatencyGrid } from '../hooks/use_latency_grid';
import { useLatencyMapColors } from '../hooks/use_latency_map_colors';
import { useSettledWidth } from '../hooks/use_settled_width';
import { endGesture, moveGesture, startGesture } from '../selection/gesture';
import type { Gesture } from '../selection/gesture';
import { getMapBands } from '../operations/operation_bands';
import type { LatencyMapOperation } from '../operations/operation_bands';
import { operationToEsqlCondition } from '../operations/to_esql';
import type { DurationBand } from '../operations/detect_bands';
import { getKeyboardRange, reduceKeyboard } from '../selection/keyboard';
import type { KeyboardState } from '../selection/keyboard';
import { getGridTotals, getSelectionCounts, isFailureRegion } from '../selection/counts';
import { selectionToEsqlCondition } from '../selection/to_esql';
import { BandMarkers } from './band_markers';
import { CellDetails } from './cell_details';
import { LatencyHeatmap } from './latency_heatmap';
import { LatencyMapLegend } from './legend';
import { MapHeader, percentileDuration } from './map_header';
import type { SlowestPercentile } from './map_header';
import { SelectionSummary } from './selection_summary';
import { OVERLAY_CONTROL_ATTRIBUTE, SelectionOverlay } from './selection_overlay';
import { getCountText, getSlowestLabel } from './unit_text';

export interface LatencyMapProps {
  /** The traces to map: index pattern, time range and filters. */
  source: TraceSource;
  /** Runs the map's ES|QL queries. The host decides how, and what a failed query looks like. */
  runEsql: RunEsql;
  /**
   * `traces` shows each trace once, at its root span's time and end-to-end duration, and
   * selects traces. Every span when absent.
   */
  unit?: LatencyMapUnit;
  /**
   * ES|QL conditions over raw fields that only the map applies, such as failed traces only.
   * A selection's condition does not carry them.
   */
  mapFilters?: string[];
  /**
   * The spans the map is about, such as one service's calls, as an ES|QL condition over raw
   * fields. The map shows only them and a selection's condition carries it.
   */
  selectionCondition?: string;
  /** The selection. The map is controlled: pass back what `onSelectionCommit` gives. */
  selection?: LatencyMapSelection;
  /**
   * Whether the host filters the query to failed spans (`FAILED_SPAN_CONDITION`). With
   * `onFailedOnlyChange`, the errors filter is the host's: the filter asks the host to
   * write or remove that filter, a selection's condition never carries the failure clause
   * itself, and this prop is what the filter shows. Without it, the filter is the map's own
   * state and a selection says `failedOnly` on its own.
   */
  failedOnly?: boolean;
  /** The errors filter changed, for hosts that keep the failure filter in their query. */
  onFailedOnlyChange?: (failedOnly: boolean) => void;
  /**
   * Called once a draw, move or resize ends, and when the selection is cleared, with the
   * selection and its ES|QL condition (both undefined on clear). The map never navigates.
   */
  onSelectionCommit: (
    selection: LatencyMapSelection | undefined,
    esqlCondition: string | undefined
  ) => void;
  /** A click on a cell with spans. The selection is left as it is. */
  onCellClick?: (cell: LatencyMapCell) => void;
  /** The duration statistics of the range once known, and whether the map is sampled. */
  onStats?: (stats: DurationStats & { sampled: boolean }) => void;
  /** The map of a source finished loading. */
  onLoad?: (source: TraceSource) => void;
  /** Buttons and links of the host, next to the selection's bounds. */
  renderSelectionActions?: (selection: LatencyMapSelection, esqlCondition: string) => ReactNode;
  /**
   * Narrow the host to one operation, with the operation's ES|QL condition
   * (`operationToEsqlCondition`), ready to put in a query. With this, the map loads the
   * per-operation duration histograms and offers the duration-groups dropdown; a focused
   * map draws the groups as labelled bands right of the plot, where a click selects one.
   */
  onFocusOperation?: (operation: LatencyMapOperation, esqlCondition: string) => void;
  /** The operation the host is narrowed to: shows the badge and reserves the band gutter. */
  focusedOperation?: LatencyMapOperation;
  onClearOperation?: () => void;
  /**
   * The host is refetching what follows the map's query, such as the documents after a
   * committed selection: the loading line runs while it does. The map's own queries show
   * the same line on their own.
   */
  isUpdating?: boolean;
  /** Height of the chart, axes included, in pixels. */
  height?: number;
  /** IANA time zone of the time axis. The browser's when absent. */
  timeZone?: string;
  'data-test-subj'?: string;
}

const withoutFailedOnly = ({ failedOnly, ...selection }: LatencyMapSelection) => selection;

/** Value equality of selections: the host re-parses the prop from its query every render. */
const isSameSelection = (a?: LatencyMapSelection, b?: LatencyMapSelection) =>
  a === b ||
  Boolean(
    a &&
      b &&
      a.from === b.from &&
      a.to === b.to &&
      a.minDuration === b.minDuration &&
      a.maxDuration === b.maxDuration &&
      Boolean(a.failedOnly) === Boolean(b.failedOnly)
  );

/** A window pointer event in the pixels of the chart, whose box the layer shares. */
const toLayerPoint = (event: globalThis.PointerEvent, box: DOMRect): Point => ({
  x: event.clientX - box.left,
  y: event.clientY - box.top,
});

/** Until the chart tells where its cells are, the pixels of the geometry mean nothing. */
const UNCALIBRATED: PlotArea = { left: 0, top: 0, colWidth: 1, rowHeight: 1 };

/**
 * Time on X, duration on a log scale on Y with a reserved row from the p99 up. Opacity is how
 * many spans are in a cell, hue how many of them failed. Draw a region to select spans, then
 * move or resize it with its handles, or select with the keyboard. The chart is `@elastic/charts`.
 */
export function LatencyMap({
  source,
  runEsql,
  unit = 'spans',
  mapFilters,
  selectionCondition,
  selection,
  failedOnly: hostFailedOnly,
  onFailedOnlyChange,
  onSelectionCommit,
  onCellClick,
  onStats,
  onLoad,
  renderSelectionActions,
  onFocusOperation,
  focusedOperation,
  onClearOperation,
  isUpdating,
  height = LAYOUT.defaultHeight,
  timeZone,
  'data-test-subj': dataTestSubj = 'traceLatencyMap',
}: LatencyMapProps) {
  const colors = useLatencyMapColors();
  const { euiTheme } = useEuiTheme();
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const { width: measuredWidth } = useResizeObserver(container);
  const width = Math.max(measuredWidth, LAYOUT.minWidth);
  // Nothing is loaded before the map is measured, and a resize is followed once it stops, into
  // the time columns of its tier: dragging a window edge does not load the data again.
  const settledWidth = useSettledWidth(measuredWidth);
  // With the operations feature, the band gutter always counts against the bin tier, so
  // bands appearing after the grid change the margin but never the tier - nothing reloads.
  const operationsEnabled = Boolean(onFocusOperation || focusedOperation);
  const targetBins = getTimeBinsForWidth(
    settledWidth,
    operationsEnabled ? LAYOUT.bandLabelsWidth : 0
  );
  const mapSource = getMapSource(source, { unit, selectionCondition, mapFilters });
  const { grid, stats, timeGrid, sampling, operations, isLoading, isEmpty, error, loadedSource } =
    useLatencyGrid({
      source: mapSource,
      runEsql,
      targetBins,
      enabled: settledWidth > 0,
      loadOperations: operationsEnabled,
    });
  const sampled = Boolean(sampling);
  const mapBands = useMemo(
    () => (operations && stats ? getMapBands(operations, stats) : undefined),
    [operations, stats]
  );
  // Room for the band labels only while bands are drawn. A host focused on one operation
  // has bands to show, so the room is there from the start and the map does not shift later.
  const showBands = Boolean(mapBands?.focused ?? focusedOperation);
  const rightMargin = operationsEnabled && showBands ? LAYOUT.bandLabelsWidth : 0;

  const callbacks = useRef({ onStats, onLoad });
  callbacks.current = { onStats, onLoad };
  useEffect(() => {
    if (stats) callbacks.current.onStats?.({ ...stats, sampled });
  }, [stats, sampled]);
  useEffect(() => {
    if (loadedSource) callbacks.current.onLoad?.(loadedSource);
  }, [loadedSource]);

  // Where the chart put its cells. Known from the first cell it tells of, and only for as long as
  // the chart keeps its size and its columns.
  const plotKey = `${width}x${height}:${timeGrid?.fromMs}:${timeGrid?.binMs}:${timeGrid?.bins}`;
  const [calibrated, setCalibrated] = useState<{
    key: string;
    plot: PlotArea;
    rightMargin: number;
  }>();
  const plot = useMemo(() => {
    if (!calibrated || calibrated.key !== plotKey) return undefined;
    if (calibrated.rightMargin === rightMargin || !timeGrid) return calibrated.plot;
    // The band gutter only narrows the grid, so the calibration follows it exactly: same
    // corner and rows, the columns squeezed by the margin's share of each. The chart's
    // next event confirms it.
    return {
      ...calibrated.plot,
      colWidth: calibrated.plot.colWidth - (rightMargin - calibrated.rightMargin) / timeGrid.bins,
    };
  }, [calibrated, plotKey, rightMargin, timeGrid]);
  const handlePlot = useCallback(
    (next: PlotArea) =>
      setCalibrated((previous) =>
        previous?.key === plotKey &&
        previous.rightMargin === rightMargin &&
        isSamePlot(previous.plot, next)
          ? previous
          : { key: plotKey, plot: next, rightMargin }
      ),
    [plotKey, rightMargin]
  );

  const geometry = useMemo(
    () =>
      stats && timeGrid
        ? createMapGeometry({ plot: plot ?? UNCALIBRATED, timeGrid, stats })
        : undefined,
    [stats, timeGrid, plot]
  );

  // With `onFailedOnlyChange` the host's query filter owns the outcome and the prop is the
  // filter; a selection whose condition still carries the failure clause (a shared URL from
  // before the host filter) shows as failed too. Without it, the map keeps its own state.
  const controlled = onFailedOnlyChange !== undefined;

  // A commit shows at once: the committed selection (or clear) stays rendered while the host
  // round-trips it through its query, so the box never snaps back to its old place. The prop
  // takes over as soon as it moves - to the committed value, or wherever else the host went.
  const [pendingCommit, setPendingCommit] = useState<{
    selection: LatencyMapSelection | undefined;
    propAtCommit: LatencyMapSelection | undefined;
  }>();
  const selectionProp = useRef(selection);
  selectionProp.current = selection;
  useEffect(() => {
    setPendingCommit((pending) => {
      if (!pending) return pending;
      // The prop moved since the commit: whatever it says now wins, pending or not.
      if (!isSameSelection(selection, pending.propAtCommit)) return undefined;
      // The prop already says what was committed: nothing left to wait for.
      if (isSameSelection(selection, pending.selection)) return undefined;
      return pending;
    });
  }, [selection]);
  const displaySelection = pendingCommit ? pendingCommit.selection : selection;

  const [localFailedOnly, setLocalFailedOnly] = useState(Boolean(displaySelection?.failedOnly));
  const selectionFailedOnly = displaySelection ? Boolean(displaySelection.failedOnly) : undefined;
  useEffect(() => {
    if (selectionFailedOnly !== undefined) setLocalFailedOnly(selectionFailedOnly);
  }, [selectionFailedOnly]);
  const failedOnly = controlled
    ? Boolean(hostFailedOnly || displaySelection?.failedOnly)
    : localFailedOnly;
  // Once the user chooses an outcome with the errors filter, a drawn region keeps it: the failure
  // inference below only speaks while the user has not.
  const outcomeChosen = useRef(false);

  const commit = useCallback(
    (next: LatencyMapSelection | undefined) => {
      if (!next) outcomeChosen.current = false;
      setPendingCommit({ selection: next, propAtCommit: selectionProp.current });
      onSelectionCommit(
        next,
        next && selectionToEsqlCondition(next, { unit, scope: selectionCondition })
      );
    },
    [onSelectionCommit, unit, selectionCondition]
  );

  const gestureRef = useRef<Gesture>();
  // The percentile the user picked on the menu: when several percentiles coincide on the same
  // rows (a spike holding most spans), the committed range alone cannot tell them apart.
  const [chosenSlowest, setChosenSlowest] = useState<SlowestPercentile>();
  const [draft, setDraft] = useState<CellRange>();
  const [keyboard, setKeyboard] = useState<KeyboardState>();
  const [hoverCell, setHoverCell] = useState<Cell>();
  // A press on the map draws a new region, a press on the selection's own grip or handles
  // moves or resizes it.
  const [isDrawing, setIsDrawing] = useState(false);
  const [isMoving, setIsMoving] = useState(false);

  // A new grid (the map resized, or its range changed) puts cells elsewhere: a cursor, an anchor or
  // a move in progress would point at cells that are no longer there, or past the new edge.
  const gridKey = timeGrid ? `${timeGrid.fromMs}:${timeGrid.binMs}:${timeGrid.bins}` : undefined;
  useEffect(() => {
    setKeyboard(undefined);
    setDraft(undefined);
    setHoverCell(undefined);
    gestureRef.current = undefined;
    setIsMoving(false);
    setIsDrawing(false);
    setPendingCommit(undefined);
  }, [gridKey]);

  const committedRange = useMemo(
    () => (geometry && displaySelection ? geometry.selectionToRange(displaySelection) : undefined),
    [geometry, displaySelection]
  );
  // The selection as the chart draws it, by what is on: a move, the keyboard, the selection.
  const highlight = draft ?? (keyboard ? getKeyboardRange(keyboard) : undefined) ?? committedRange;
  const overlayRange = draft ?? committedRange;

  const describeCell = useCallback(
    (cell: Cell) => {
      const counts = grid?.cells.get(getCellKey(cell.xi, cell.yi, grid.bins));
      const cellStartMs = timeGrid!.fromMs + cell.xi * timeGrid!.binMs;
      const failed = counts?.failed ?? 0;
      return {
        // The first and last column can be clipped by the range: their cells start and end
        // there, not on the raster edges beyond it.
        fromMs: Math.max(cellStartMs, timeGrid!.startMs),
        toMs: Math.min(cellStartMs + timeGrid!.binMs, timeGrid!.endMs),
        minDuration: rowToDuration(cell.yi, stats!),
        maxDuration: rowToDuration(cell.yi + 1, stats!),
        // With "failed only" the map shows the failed spans alone, and so does the cell.
        spans: failedOnly ? failed : counts?.spans ?? 0,
        failed,
      };
    },
    [grid, timeGrid, stats, failedOnly]
  );

  // What a keyboard region would commit: its bounds, with the counts of the cells it covers.
  const describeRange = (range: CellRange) => {
    const rangeSelection = geometry!.rangeToSelection(range);
    const counts = getSelectionCounts({
      grid: grid!,
      timeGrid: timeGrid!,
      stats: stats!,
      selection: failedOnly ? { ...rangeSelection, failedOnly: true } : rangeSelection,
    });
    return {
      fromMs: Date.parse(rangeSelection.from),
      toMs: Date.parse(rangeSelection.to),
      minDuration: rangeSelection.minDuration,
      maxDuration: rangeSelection.maxDuration,
      spans: counts.spans,
      failed: counts.failed,
    };
  };

  // Over the selection's own bounds, which the host's condition uses, not over the cells it was
  // snapped to: after a resize those are not the same spans.
  const selectedCounts = useMemo(
    () =>
      grid && timeGrid && stats && displaySelection
        ? getSelectionCounts({
            grid,
            timeGrid,
            stats,
            // Under a host's failure filter the selection condition does not say failed
            // itself, but the query returns failed spans alone, and so must the counts.
            selection: failedOnly ? { ...displaySelection, failedOnly: true } : displaySelection,
          })
        : { spans: 0, failed: 0, estimated: false },
    [grid, timeGrid, stats, displaySelection, failedOnly]
  );

  // Stable, so renders that change nothing of the chart do not reach the memoized heatmap.
  const commitRange = useCallback(
    (requested: CellRange, label?: string) => {
      if (!geometry) return;
      const range = clampRange(requested, geometry.bins, geometry.rows);
      if (displaySelection && committedRange && isSameRange(range, committedRange)) return;
      // With a host filter the failure clause is the host's, never the selection's.
      let next = geometry.rangeToSelection(range, controlled ? undefined : failedOnly);
      // A region where failures concentrate is about them: the selection says so on its
      // own, as long as the user has not chosen an outcome with the errors filter.
      if (!failedOnly && !outcomeChosen.current && grid && timeGrid && stats) {
        const counts = getSelectionCounts({ grid, timeGrid, stats, selection: next });
        if (isFailureRegion(counts, getGridTotals(grid))) {
          if (controlled) onFailedOnlyChange?.(true);
          else next = { ...next, failedOnly: true };
        }
      }
      commit(label ? { ...next, label } : next);
    },
    [
      geometry,
      displaySelection,
      committedRange,
      commit,
      failedOnly,
      controlled,
      onFailedOnlyChange,
      grid,
      timeGrid,
      stats,
    ]
  );

  const clickCell = useCallback(
    (cell: Cell) => {
      if (!geometry || !onCellClick) return;
      const details = describeCell(cell);
      if (details.spans <= 0) return;
      onCellClick({
        ...geometry.rangeToSelection(
          { x0: cell.xi, x1: cell.xi + 1, y0: cell.yi, y1: cell.yi + 1 },
          failedOnly
        ),
        spans: details.spans,
        failed: details.failed,
      });
    },
    [geometry, onCellClick, describeCell, failedOnly]
  );

  const getPoint = (event: PointerEvent<SVGSVGElement>): Point => {
    const box = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - box.left, y: event.clientY - box.top };
  };
  const cancelGesture = () => {
    gestureRef.current = undefined;
    setDraft(undefined);
    setIsMoving(false);
    setIsDrawing(false);
  };

  const onOverlayPointerDown = (event: PointerEvent<SVGSVGElement>) => {
    if (!geometry || !plot || event.button !== 0) return;
    const gesture = startGesture(getPoint(event), geometry, committedRange);
    // Only the grip and the handles reach the overlay; drawing starts on the layer below.
    if (gesture.kind === 'drawing') return;
    gestureRef.current = gesture;
    setIsMoving(true);
    (event.target as Element).setPointerCapture?.(event.pointerId);
  };

  const onOverlayPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    if (!geometry || !gestureRef.current) return;
    const range = moveGesture(gestureRef.current, getPoint(event), geometry);
    setDraft((previous) => (previous && isSameRange(previous, range) ? previous : range));
  };

  const onOverlayPointerUp = (event: PointerEvent<SVGSVGElement>) => {
    const gesture = gestureRef.current;
    if (!geometry || !gesture) return;
    const end = endGesture(gesture, getPoint(event), geometry);
    cancelGesture();
    (event.target as Element).releasePointerCapture?.(event.pointerId);
    if (end.type === 'range') commitRange(end.range);
    else if (end.type === 'click') clickCell(end.cell);
  };

  const focusOperation = useCallback(
    (operation: LatencyMapOperation) =>
      onFocusOperation?.(operation, operationToEsqlCondition(operation)),
    [onFocusOperation]
  );

  // A band covers every column: its duration rows across the whole range.
  const selectBand = (band: DurationBand, label: string) => {
    if (!geometry) return;
    commitRange({ x0: 0, x1: geometry.bins, y0: band.lowRow, y1: band.highRow + 1 }, label);
  };

  const selectSlowest = (percentile: SlowestPercentile) => {
    if (!geometry || !stats) return;
    setChosenSlowest(percentile);
    const row = Math.floor(durationToRow(percentileDuration(stats, percentile), stats));
    commitRange(
      {
        x0: 0,
        x1: geometry.bins,
        y0: Math.min(geometry.rows - 1, Math.max(0, row)),
        y1: geometry.rows,
      },
      getSlowestLabel(unit, percentile)
    );
  };

  const changeFailedOnly = (next: boolean) => {
    outcomeChosen.current = true;
    if (controlled) {
      onFailedOnlyChange?.(next);
      // The host filter owns the outcome now: a selection condition still carrying the
      // failure clause of its own (a shared URL from before) is normalized out of it.
      if (displaySelection?.failedOnly) commit(withoutFailedOnly(displaySelection));
      return;
    }
    setLocalFailedOnly(next);
    if (displaySelection) {
      commit(
        next ? { ...displaySelection, failedOnly: true } : withoutFailedOnly(displaySelection)
      );
    }
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (!geometry) return;
    if (event.key === 'Escape' && gestureRef.current) {
      cancelGesture();
      event.preventDefault();
      return;
    }
    // The cursor shows with the first key: a click gives the map focus, and must not hide the
    // selection behind it.
    if (!keyboard && event.key === 'Enter') return;
    const start = keyboard ?? {
      cursor: committedRange
        ? { xi: committedRange.x0, yi: committedRange.y0 }
        : { xi: Math.floor(geometry.bins / 2), yi: Math.floor(LATENCY_MAP_INNER_ROWS / 2) },
    };
    const result = reduceKeyboard(start, event, geometry.bins, geometry.rows);
    if (!result.handled) return;
    event.preventDefault();
    if (result.action?.type === 'click') {
      // The pointer's click, from the keyboard: Enter on the bare cursor opens the cell.
      clickCell(result.action.cell);
      return;
    }
    if (result.action?.type === 'clear') {
      setKeyboard(undefined);
      if (displaySelection) commit(undefined);
      return;
    }
    if (result.action?.type === 'commit') {
      // Done selecting: the cursor would otherwise sit over the fresh selection as a
      // one-cell highlight. The next arrow key starts again from the selection's corner.
      setKeyboard(undefined);
      commitRange(result.action.range);
    } else {
      setKeyboard(result.state);
    }
  };

  // The map's wrapper takes the keyboard, and gives it up on focus loss or a pointer press. The
  // listeners are added to the element, not as props, which jsx-a11y reads as a static element
  // taking events. They read the latest handler through a ref, so they are added only once.
  const [layer, setLayer] = useState<HTMLDivElement | null>(null);
  const latestKeyDown = useRef(onKeyDown);
  latestKeyDown.current = onKeyDown;
  useEffect(() => {
    if (!layer) return;
    const handleKeyDown = (event: KeyboardEvent) => latestKeyDown.current(event);
    const handleFocusOut = (event: FocusEvent) => {
      if (!layer.contains(event.relatedTarget as Node | null)) setKeyboard(undefined);
    };
    layer.addEventListener('keydown', handleKeyDown);
    layer.addEventListener('focusout', handleFocusOut);
    return () => {
      layer.removeEventListener('keydown', handleKeyDown);
      layer.removeEventListener('focusout', handleFocusOut);
    };
  }, [layer]);

  // Drawing a region is the map's own gesture, not the chart's brush: it then also starts on
  // the margins and just above the chart (clamped to the plot, so the top row is easy to catch
  // from the top), and an existing selection never swallows it mid-drag. The chart's brush
  // stays wired as the fallback until its first cell calibrates the geometry. Capturing on the
  // wrapper, so that the chart below cannot stop it.
  const latestDraw = useRef({
    geometry,
    plot,
    layer,
    committedRange,
    commitRange,
    clickCell,
    width,
    height,
  });
  latestDraw.current = {
    geometry,
    plot,
    layer,
    committedRange,
    commitRange,
    clickCell,
    width,
    height,
  };
  useEffect(() => {
    if (!container) return;
    const handlePointerDown = (event: globalThis.PointerEvent) => {
      // Any press takes the keyboard cursor away, as a click takes the focus.
      setKeyboard(undefined);
      const target = event.target as Element;
      if (event.button !== 0 || target.closest?.(`[${OVERLAY_CONTROL_ATTRIBUTE}], button, a`)) {
        return;
      }
      const latest = latestDraw.current;
      if (!latest.geometry || !latest.plot || !latest.layer) return;
      // The chart's own box (the layer), and the grab band just above it, under the header.
      const point = toLayerPoint(event, latest.layer.getBoundingClientRect());
      if (
        point.x < 0 ||
        point.x > latest.width ||
        point.y < -LAYOUT.grabAbovePx ||
        point.y > latest.height
      ) {
        return;
      }
      const gesture = startGesture(point, latest.geometry, latest.committedRange);
      // The grip and the handles take their presses on the overlay instead.
      if (gesture.kind !== 'drawing') return;
      gestureRef.current = gesture;
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

  // The drawing pointer may leave the map, so its moves and its release are the window's.
  useEffect(() => {
    const handlePointerMove = (event: globalThis.PointerEvent) => {
      const gesture = gestureRef.current;
      const { geometry: current, layer: layerEl } = latestDraw.current;
      if (gesture?.kind !== 'drawing' || !current || !layerEl) return;
      const range = moveGesture(
        gesture,
        toLayerPoint(event, layerEl.getBoundingClientRect()),
        current
      );
      setDraft((previous) => (previous && isSameRange(previous, range) ? previous : range));
    };
    const handlePointerUp = (event: globalThis.PointerEvent) => {
      const gesture = gestureRef.current;
      const {
        geometry: current,
        layer: layerEl,
        commitRange: commitDrawn,
        clickCell: click,
      } = latestDraw.current;
      if (gesture?.kind !== 'drawing') return;
      gestureRef.current = undefined;
      setDraft(undefined);
      setIsDrawing(false);
      if (!current || !layerEl) return;
      const end = endGesture(
        gesture,
        toLayerPoint(event, layerEl.getBoundingClientRect()),
        current
      );
      if (end.type === 'range') commitDrawn(end.range);
      else if (end.type === 'click') click(end.cell);
    };
    const handlePointerCancel = () => {
      if (gestureRef.current?.kind !== 'drawing') return;
      gestureRef.current = undefined;
      setDraft(undefined);
      setIsDrawing(false);
    };
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerCancel);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerCancel);
    };
  }, []);

  // The keyboard's readout: the cursor's cell or, while Shift is extending a region, the whole
  // region - the bounds and counts that Enter would commit, as the summary will say them.
  const keyboardCell =
    geometry && keyboard
      ? keyboard.anchor
        ? describeRange(getKeyboardRange(keyboard))
        : describeCell(keyboard.cursor)
      : undefined;
  const summary = stats
    ? i18n.translate('traceLatencyMap.summary', {
        defaultMessage:
          'Latency map of {count}, from {min} to {max}, with the slowest 1% from {p99}. Time runs left to right, duration bottom to top.',
        values: {
          count: getCountText(unit, stats.spans, sampled),
          min: formatDuration(stats.min),
          max: formatDuration(stats.max),
          p99: formatDuration(stats.p99),
        },
      })
    : '';

  const placeholder = css`
    width: 100%;
    height: ${height}px;
  `;
  let body: ReactNode;
  if (error) {
    body = (
      <KbnDangerCallout
        announceOnMount
        size="s"
        title={i18n.translate('traceLatencyMap.error', {
          defaultMessage: 'The latency map could not be loaded',
        })}
        data-test-subj="traceLatencyMapError"
      >
        {error.message}
      </KbnDangerCallout>
    );
  } else if (isEmpty) {
    body = (
      <EuiFlexGroup
        alignItems="center"
        justifyContent="center"
        responsive={false}
        css={placeholder}
        data-test-subj="traceLatencyMapEmpty"
      >
        <EuiText size="s" color="subdued">
          {unit === 'traces'
            ? i18n.translate('traceLatencyMap.emptyTraces', {
                defaultMessage: 'No traces in this time range.',
              })
            : i18n.translate('traceLatencyMap.emptySpans', {
                defaultMessage: 'No spans with a duration in this time range.',
              })}
        </EuiText>
      </EuiFlexGroup>
    );
  } else if (!geometry || !grid || !stats || !timeGrid) {
    body = (
      <EuiFlexGroup
        alignItems="center"
        justifyContent="center"
        responsive={false}
        css={placeholder}
        data-test-subj="traceLatencyMapLoading"
      >
        <EuiLoadingChart size="l" />
      </EuiFlexGroup>
    );
  } else {
    body = (
      <>
        {/* The map is the widget: the pointer draws, the keys select. Announced as one. */}
        <div
          ref={setLayer}
          role="application"
          tabIndex={0}
          aria-label={i18n.translate('traceLatencyMap.interactiveLabel', {
            defaultMessage:
              'Latency map. Arrow keys move between cells, Enter opens the cell, Shift and arrow keys select a region, Enter commits it, Escape clears.',
          })}
          aria-busy={isLoading}
          css={css`
            position: relative;
            opacity: ${isLoading ? 0.5 : 1};
            /* While a region is being drawn the chart keeps its hands off the pointer:
               no tooltip trailing the drag, and no brush of its own. */
            ${isDrawing ? `[data-test-subj='traceLatencyMapChart'] { pointer-events: none; }` : ''}
            &:focus-visible {
              outline: ${euiTheme.focus.width} solid ${euiTheme.colors.primary};
            }
          `}
          data-test-subj="traceLatencyMapLayer"
        >
          <LatencyHeatmap
            grid={grid}
            timeGrid={timeGrid}
            stats={stats}
            unit={unit}
            sampled={sampled}
            canClick={Boolean(onCellClick)}
            timeZone={timeZone}
            colors={colors}
            failedOnly={failedOnly}
            height={height}
            rightMargin={rightMargin}
            highlight={highlight}
            summary={summary}
            onBrush={commitRange}
            onCellClick={clickCell}
            onPlot={handlePlot}
            onCellHover={setHoverCell}
          />
          {plot && mapBands?.focused && (
            <BandMarkers
              operationBands={mapBands.focused}
              geometry={geometry}
              colors={colors}
              width={width}
              height={height}
              onSelectBand={selectBand}
            />
          )}
          {plot && !keyboard && (
            <SelectionOverlay
              geometry={geometry}
              rect={overlayRange && geometry.rangeToRect(overlayRange)}
              hoverRect={
                hoverCell && !draft && !isDrawing && !isMoving
                  ? geometry.rangeToRect({
                      x0: hoverCell.xi,
                      x1: hoverCell.xi + 1,
                      y0: hoverCell.yi,
                      y1: hoverCell.yi + 1,
                    })
                  : undefined
              }
              colors={colors}
              width={width}
              height={height}
              showHandles={!isDrawing}
              isMoving={isMoving}
              onPointerDown={onOverlayPointerDown}
              onPointerMove={onOverlayPointerMove}
              onPointerUp={onOverlayPointerUp}
              onPointerCancel={cancelGesture}
            />
          )}
        </div>
        <EuiScreenReaderOnly>
          <div aria-live="polite" data-test-subj="traceLatencyMapAnnouncement">
            {keyboardCell
              ? // One message, so translations can reorder it; 'to', not a dash, which a
                // screen reader would skip.
                i18n.translate('traceLatencyMap.cellAnnouncement', {
                  defaultMessage: '{fromTime} to {toTime}, {minDuration} to {maxDuration}, {count}',
                  values: {
                    fromTime: formatTimestamp(keyboardCell.fromMs, timeZone),
                    toTime: formatTimestamp(keyboardCell.toMs, timeZone),
                    minDuration: formatDuration(keyboardCell.minDuration),
                    maxDuration: formatDuration(keyboardCell.maxDuration),
                    count: getCountText(unit, keyboardCell.spans, sampled),
                  },
                })
              : ''}
          </div>
        </EuiScreenReaderOnly>
      </>
    );
  }

  // As text on the header's left, next to the statistics. Shown in the error state too:
  // the selection still filters the host's documents, so the way to clear it must not go
  // down with the map (the counts do, so they are left out).
  const selectionSummary = displaySelection && (geometry || error) && (
    <SelectionSummary
      selection={displaySelection}
      spans={grid ? selectedCounts.spans : undefined}
      failed={grid ? selectedCounts.failed : undefined}
      failedOnly={failedOnly}
      unit={unit}
      sampled={sampled || selectedCounts.estimated}
      timeZone={timeZone}
      actions={renderSelectionActions?.(
        displaySelection,
        selectionToEsqlCondition(displaySelection, { unit, scope: selectionCondition })
      )}
    />
  );

  // The slowest shortcut the committed selection matches, shown on the menu's button. The
  // same snapping `selectSlowest` writes. Percentiles that coincide on the same rows (a spike
  // holding most spans) all match: the one the user picked wins, so the menu answers the
  // click even when the query it commits is unchanged; without a pick (a restored URL), the
  // higher percentile is named.
  const activeSlowest = useMemo((): SlowestPercentile | undefined => {
    if (!committedRange || !geometry || !stats) return undefined;
    if (
      committedRange.x0 !== 0 ||
      committedRange.x1 !== geometry.bins ||
      committedRange.y1 !== geometry.rows
    ) {
      return undefined;
    }
    const matches = ([99, 95, 90] as SlowestPercentile[]).filter((percentile) => {
      const row = Math.min(
        geometry.rows - 1,
        Math.max(0, Math.floor(durationToRow(percentileDuration(stats, percentile), stats)))
      );
      return committedRange.y0 === row;
    });
    return chosenSlowest && matches.includes(chosenSlowest) ? chosenSlowest : matches[0];
  }, [committedRange, geometry, stats, chosenSlowest]);

  return (
    <div
      ref={setContainer}
      css={css`
        position: relative;
      `}
      data-test-subj={dataTestSubj}
    >
      {/* One line for anything in flight: the map's own queries and the host's follow-up
          (the documents after a commit). Delayed as in the unified histogram, so fast
          queries never flash it. */}
      {(isUpdating || isLoading) && (
        <EuiDelayRender delay={500}>
          <EuiProgress
            size="xs"
            color="accent"
            position="absolute"
            css={{ zIndex: 1 }}
            data-test-subj="traceLatencyMapProgressBar"
          />
        </EuiDelayRender>
      )}
      <MapHeader
        stats={isEmpty ? undefined : stats}
        failedOnly={failedOnly}
        onFailedOnlyChange={changeFailedOnly}
        onSelectSlowest={selectSlowest}
        activeSlowest={activeSlowest}
        sampling={grid && !isEmpty ? sampling : undefined}
        isDisabled={!geometry || isEmpty}
        selectionSummary={selectionSummary || undefined}
        onClearSelection={selectionSummary ? () => commit(undefined) : undefined}
        operationsWithGroups={onFocusOperation ? mapBands?.operations : undefined}
        onFocusOperation={onFocusOperation ? focusOperation : undefined}
        focusedOperation={focusedOperation}
        onClearOperation={onClearOperation}
      />
      <EuiSpacer size="s" />
      {body}
      {geometry && !isEmpty && !error && (
        <>
          <EuiSpacer size="xs" />
          <LatencyMapLegend colors={colors} unit={unit} />
        </>
      )}
      {/* Under the legend, which stays where it is: the readout is the only thing that
          appears and goes with the cursor, and nothing renders below it. */}
      {keyboardCell && (
        <>
          <EuiSpacer size="xs" />
          <CellDetails {...keyboardCell} unit={unit} sampled={sampled} timeZone={timeZone} />
        </>
      )}
    </div>
  );
}
