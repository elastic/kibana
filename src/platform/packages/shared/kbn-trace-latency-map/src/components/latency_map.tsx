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
  EuiCallOut,
  EuiFlexGroup,
  EuiLoadingChart,
  EuiScreenReaderOnly,
  EuiSpacer,
  EuiText,
  useResizeObserver,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type {
  DurationStats,
  LatencyMapCell,
  LatencyMapSelection,
  LatencyMapUnit,
  RunEsql,
  TraceSource,
} from '../types';
import { LATENCY_MAP_INNER_ROWS, durationUsToRow, rowToDurationUs } from '../query/duration_rows';
import { getMapSource } from '../query/latency_map_query';
import { getCellKey } from '../query/parse';
import { isSameRange } from '../geometry/cell_range';
import type { Cell, CellRange } from '../geometry/cell_range';
import { LAYOUT, getTimeBinsForWidth } from '../geometry/layout';
import { createMapGeometry } from '../geometry/map_geometry';
import type { PlotArea, Point } from '../geometry/map_geometry';
import { isSamePlot } from '../geometry/plot_calibration';
import { formatDurationUs, formatTimestamp } from '../geometry/ticks';
import { useLatencyGrid } from '../hooks/use_latency_grid';
import { useLatencyMapColors } from '../hooks/use_latency_map_colors';
import { endGesture, moveGesture, startGesture } from '../selection/gesture';
import type { Gesture } from '../selection/gesture';
import { getKeyboardRange, reduceKeyboard } from '../selection/keyboard';
import type { KeyboardState } from '../selection/keyboard';
import { selectionToEsqlCondition } from '../selection/to_esql';
import { CellDetails } from './cell_details';
import { LatencyHeatmap } from './latency_heatmap';
import { LatencyMapLegend } from './legend';
import { MapHeader } from './map_header';
import type { SlowestPercentile } from './map_header';
import { SelectionBar } from './selection_bar';
import { SelectionOverlay } from './selection_overlay';
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
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const { width: measuredWidth } = useResizeObserver(container);
  const width = Math.max(measuredWidth, LAYOUT.minWidth);
  const targetBins = getTimeBinsForWidth(measuredWidth);
  const mapSource = getMapSource(source, { unit, selectionCondition, mapFilters });
  const { grid, stats, timeGrid, sampled, isLoading, isEmpty, error, loadedSource } =
    useLatencyGrid({ source: mapSource, runEsql, targetBins });

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
      const fromMs = timeGrid!.fromMs + cell.xi * timeGrid!.binMs;
      return {
        fromMs,
        toMs: fromMs + timeGrid!.binMs,
        minDurationUs: rowToDurationUs(cell.yi, stats!),
        maxDurationUs: rowToDurationUs(cell.yi + 1, stats!),
        spans: counts?.spans ?? 0,
        failed: counts?.failed ?? 0,
      };
    },
    [grid, timeGrid, stats]
  );

  const selectedCounts = useMemo(() => {
    if (!grid || !committedRange || !selection) return { spans: 0, failed: 0 };
    let spans = 0;
    let failed = 0;
    grid.cells.forEach((cell) => {
      if (
        cell.xi >= committedRange.x0 &&
        cell.xi < committedRange.x1 &&
        cell.yi >= committedRange.y0 &&
        cell.yi < committedRange.y1
      ) {
        spans += cell.spans;
        failed += cell.failed;
      }
    });
    // A selection about failures selects the failed spans only.
    return selection.failedOnly ? { spans: failed, failed: 0 } : { spans, failed };
  }, [grid, committedRange, selection]);

  const commitRange = (range: CellRange) => {
    if (!geometry || (selection && committedRange && isSameRange(range, committedRange))) return;
    commit(geometry.rangeToSelection(range, failedOnly));
  };

  const clickCell = (cell: Cell) => {
    if (!geometry || !onCellClick) return;
    const details = describeCell(cell);
    if (details.spans <= 0) return;
    onCellClick({
      ...geometry.rangeToSelection({ x0: cell.xi, x1: cell.xi + 1, y0: cell.yi, y1: cell.yi + 1 }),
      spans: details.spans,
      failed: details.failed,
    });
  };

  const getPoint = (event: PointerEvent<SVGSVGElement>): Point => {
    const box = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - box.left, y: event.clientY - box.top };
  };
  const cancelGesture = () => {
    gestureRef.current = undefined;
    setDraft(undefined);
  };

  const onOverlayPointerDown = (event: PointerEvent<SVGSVGElement>) => {
    if (!geometry || !plot || event.button !== 0) return;
    const gesture = startGesture(getPoint(event), geometry, committedRange);
    if (!gesture) return;
    gestureRef.current = gesture;
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
    const row = Math.floor(durationUsToRow(percentile === 99 ? stats.p99 : stats.p95, stats));
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
    setKeyboard(result.state);
    if (result.action?.type === 'commit') commitRange(result.action.range);
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
    // Capturing, so that the chart below cannot stop it.
    const handlePointerDown = () => setKeyboard(undefined);
    layer.addEventListener('keydown', handleKeyDown);
    layer.addEventListener('focusout', handleFocusOut);
    layer.addEventListener('pointerdown', handlePointerDown, true);
    return () => {
      layer.removeEventListener('keydown', handleKeyDown);
      layer.removeEventListener('focusout', handleFocusOut);
      layer.removeEventListener('pointerdown', handlePointerDown, true);
    };
  }, [layer]);

  const keyboardCell = geometry && keyboard ? describeCell(keyboard.cursor) : undefined;
  const summary = stats
    ? i18n.translate('traceLatencyMap.summary', {
        defaultMessage:
          'Latency map of {count}, from {min} to {max}, with the slowest 1% from {p99}. Time runs left to right, duration bottom to top.',
        values: {
          count: getCountText(unit, stats.spans, sampled),
          min: formatDurationUs(stats.min),
          max: formatDurationUs(stats.max),
          p99: formatDurationUs(stats.p99),
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
      <EuiCallOut
        announceOnMount
        color="danger"
        iconType="error"
        size="s"
        title={i18n.translate('traceLatencyMap.error', {
          defaultMessage: 'The latency map could not be loaded',
        })}
        data-test-subj="traceLatencyMapError"
      >
        {error.message}
      </EuiCallOut>
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
          {i18n.translate('traceLatencyMap.empty', {
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
              'Latency map. Arrow keys move between cells, Shift and arrow keys select a region, Enter selects, Escape clears.',
          })}
          aria-busy={isLoading}
          css={css`
            position: relative;
            opacity: ${isLoading ? 0.5 : 1};
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
            width={width}
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
                hoverCell && !draft
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
              showHandles
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
              ? [
                  `${formatTimestamp(keyboardCell.fromMs, timeZone)} – ${formatTimestamp(
                    keyboardCell.toMs,
                    timeZone
                  )}`,
                  `${formatDurationUs(keyboardCell.minDurationUs)} – ${formatDurationUs(
                    keyboardCell.maxDurationUs
                  )}`,
                  getCountText(unit, keyboardCell.spans, sampled),
                ].join(', ')
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
            sampled={sampled}
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
