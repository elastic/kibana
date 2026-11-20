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
  EuiFlexGroup,
  EuiLoadingChart,
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
import { getKeyboardRange, reduceKeyboard } from '../selection/keyboard';
import type { KeyboardState } from '../selection/keyboard';
import { getSelectionCounts } from '../selection/counts';
import { selectionToEsqlCondition } from '../selection/to_esql';
import { CellDetails } from './cell_details';
import { LatencyHeatmap } from './latency_heatmap';
import { LatencyMapLegend } from './legend';
import { MapHeader } from './map_header';
import type { SlowestPercentile } from './map_header';
import { SelectionBar } from './selection_bar';
import { OVERLAY_CONTROL_ATTRIBUTE, SelectionOverlay } from './selection_overlay';
import { getCountText } from './unit_text';

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
  /** Height of the chart, axes included, in pixels. */
  height?: number;
  /** IANA time zone of the time axis. The browser's when absent. */
  timeZone?: string;
  'data-test-subj'?: string;
}

const withoutFailedOnly = ({ failedOnly, ...selection }: LatencyMapSelection) => selection;

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
  onSelectionCommit,
  onCellClick,
  onStats,
  onLoad,
  renderSelectionActions,
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
  const targetBins = getTimeBinsForWidth(settledWidth);
  const mapSource = getMapSource(source, { unit, selectionCondition, mapFilters });
  const { grid, stats, timeGrid, sampled, isLoading, isEmpty, error, loadedSource } =
    useLatencyGrid({ source: mapSource, runEsql, targetBins, enabled: settledWidth > 0 });

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
  const [calibrated, setCalibrated] = useState<{ key: string; plot: PlotArea }>();
  const plot = calibrated?.key === plotKey ? calibrated.plot : undefined;
  const handlePlot = useCallback(
    (next: PlotArea) =>
      setCalibrated((previous) =>
        previous?.key === plotKey && isSamePlot(previous.plot, next)
          ? previous
          : { key: plotKey, plot: next }
      ),
    [plotKey]
  );

  const geometry = useMemo(
    () =>
      stats && timeGrid
        ? createMapGeometry({ plot: plot ?? UNCALIBRATED, timeGrid, stats })
        : undefined,
    [stats, timeGrid, plot]
  );

  const [failedOnly, setFailedOnly] = useState(Boolean(selection?.failedOnly));
  const selectionFailedOnly = selection ? Boolean(selection.failedOnly) : undefined;
  useEffect(() => {
    if (selectionFailedOnly !== undefined) setFailedOnly(selectionFailedOnly);
  }, [selectionFailedOnly]);

  const commit = useCallback(
    (next: LatencyMapSelection | undefined) =>
      onSelectionCommit(
        next,
        next && selectionToEsqlCondition(next, { unit, scope: selectionCondition })
      ),
    [onSelectionCommit, unit, selectionCondition]
  );

  const gestureRef = useRef<Gesture>();
  const [draft, setDraft] = useState<CellRange>();
  const [keyboard, setKeyboard] = useState<KeyboardState>();
  const [hoverCell, setHoverCell] = useState<Cell>();
  // A press on the chart starts a brush, a press on the selection's own grip or handles a move.
  const [isBrushing, setIsBrushing] = useState(false);
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
    setIsBrushing(false);
  }, [gridKey]);

  const committedRange = useMemo(
    () => (geometry && selection ? geometry.selectionToRange(selection) : undefined),
    [geometry, selection]
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

  // Over the selection's own bounds, which the host's condition uses, not over the cells it was
  // snapped to: after a resize those are not the same spans.
  const selectedCounts = useMemo(
    () =>
      grid && timeGrid && stats && selection
        ? getSelectionCounts({ grid, timeGrid, stats, selection })
        : { spans: 0, failed: 0, estimated: false },
    [grid, timeGrid, stats, selection]
  );

  // Stable, so renders that change nothing of the chart do not reach the memoized heatmap.
  const commitRange = useCallback(
    (requested: CellRange) => {
      if (!geometry) return;
      const range = clampRange(requested, geometry.bins, geometry.rows);
      if (selection && committedRange && isSameRange(range, committedRange)) return;
      commit(geometry.rangeToSelection(range, failedOnly));
    },
    [geometry, selection, committedRange, commit, failedOnly]
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
  };

  const onOverlayPointerDown = (event: PointerEvent<SVGSVGElement>) => {
    if (!geometry || !plot || event.button !== 0) return;
    const gesture = startGesture(getPoint(event), geometry, committedRange);
    if (!gesture) return;
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

  const selectSlowest = (percentile: SlowestPercentile) => {
    if (!geometry || !stats) return;
    const row = Math.floor(durationToRow(percentile === 99 ? stats.p99 : stats.p95, stats));
    commitRange({
      x0: 0,
      x1: geometry.bins,
      y0: Math.min(geometry.rows - 1, Math.max(0, row)),
      y1: geometry.rows,
    });
  };

  const changeFailedOnly = (next: boolean) => {
    setFailedOnly(next);
    if (selection) {
      commit(next ? { ...selection, failedOnly: true } : withoutFailedOnly(selection));
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
    if (result.action?.type === 'clear') {
      setKeyboard(undefined);
      if (selection) commit(undefined);
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
    // Capturing, so that the chart below cannot stop it. A press anywhere but on the selection's
    // own controls is the chart's brush, which draws a new region while the old one lets go.
    const handlePointerDown = (event: Event) => {
      setKeyboard(undefined);
      if (!(event.target as Element).closest?.(`[${OVERLAY_CONTROL_ATTRIBUTE}]`)) {
        setIsBrushing(true);
      }
    };
    const handlePointerEnd = () => setIsBrushing(false);
    layer.addEventListener('keydown', handleKeyDown);
    layer.addEventListener('focusout', handleFocusOut);
    layer.addEventListener('pointerdown', handlePointerDown, true);
    window.addEventListener('pointerup', handlePointerEnd);
    window.addEventListener('pointercancel', handlePointerEnd);
    return () => {
      layer.removeEventListener('keydown', handleKeyDown);
      layer.removeEventListener('focusout', handleFocusOut);
      layer.removeEventListener('pointerdown', handlePointerDown, true);
      window.removeEventListener('pointerup', handlePointerEnd);
      window.removeEventListener('pointercancel', handlePointerEnd);
    };
  }, [layer]);

  const keyboardCell = geometry && keyboard ? describeCell(keyboard.cursor) : undefined;
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
                defaultMessage: 'No spans in this time range.',
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
        {/* The map is the widget: the chart brushes, the keys select. Announced as one. */}
        <div
          ref={setLayer}
          role="application"
          tabIndex={0}
          aria-label={i18n.translate('traceLatencyMap.interactiveLabel', {
            defaultMessage:
              'Latency map. Arrow keys move between cells, Shift and arrow keys select a region, Enter commits it, Escape clears.',
          })}
          aria-busy={isLoading}
          css={css`
            position: relative;
            opacity: ${isLoading ? 0.5 : 1};
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
            timeZone={timeZone}
            colors={colors}
            failedOnly={failedOnly}
            height={height}
            highlight={highlight}
            summary={summary}
            onBrush={commitRange}
            onCellClick={clickCell}
            onPlot={handlePlot}
            onCellHover={setHoverCell}
          />
          {plot && !keyboard && (
            <SelectionOverlay
              geometry={geometry}
              rect={overlayRange && geometry.rangeToRect(overlayRange)}
              hoverRect={
                hoverCell && !draft && !isBrushing && !isMoving
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
              showHandles={!isBrushing}
              isMoving={isMoving}
              onPointerDown={onOverlayPointerDown}
              onPointerMove={onOverlayPointerMove}
              onPointerUp={onOverlayPointerUp}
              onPointerCancel={cancelGesture}
            />
          )}
        </div>
        {keyboardCell && (
          <CellDetails {...keyboardCell} unit={unit} sampled={sampled} timeZone={timeZone} />
        )}
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

  return (
    <div ref={setContainer} data-test-subj={dataTestSubj}>
      <MapHeader
        failedOnly={failedOnly}
        onFailedOnlyChange={changeFailedOnly}
        onSelectSlowest={selectSlowest}
        sampled={sampled && Boolean(grid) && !isEmpty}
        isDisabled={!geometry || isEmpty}
      />
      <EuiSpacer size="s" />
      {body}
      {geometry && !isEmpty && !error && (
        <>
          <EuiSpacer size="xs" />
          <LatencyMapLegend colors={colors} unit={unit} />
        </>
      )}
      {selection && geometry && !error && (
        <>
          <EuiSpacer size="s" />
          <SelectionBar
            selection={selection}
            spans={selectedCounts.spans}
            failed={selectedCounts.failed}
            unit={unit}
            sampled={sampled || selectedCounts.estimated}
            timeZone={timeZone}
            onClear={() => commit(undefined)}
            actions={renderSelectionActions?.(
              selection,
              selectionToEsqlCondition(selection, { unit, scope: selectionCondition })
            )}
          />
        </>
      )}
    </div>
  );
}
