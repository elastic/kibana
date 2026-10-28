/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { EsqlTable, LatencyMapSelection, TraceSource } from '../types';
import { getTimeGrid } from '../query/time_grid';
import { LAYOUT, getTimeBinsForWidth } from '../geometry/layout';
import { createMapGeometry } from '../geometry/map_geometry';
import { GRID_ORIGIN } from '../geometry/plot_calibration';
import type { PlotArea } from '../geometry/map_geometry';
import { rangeToHighlight } from '../chart/brush';
import { LatencyMap } from './latency_map';
import type { LatencyMapProps } from './latency_map';

// jsdom cannot draw a chart. The mock records what the map gives the chart, and the test plays
// the chart: its brush, its hover, its click.
const mockChart: {
  settings?: any;
  heatmap?: any;
  tooltip?: any;
} = {};
jest.mock('@elastic/charts', () => ({
  Chart: ({ children }: { children: React.ReactNode }) =>
    jest.requireActual('react').createElement('div', { 'data-test-subj': 'mockChart' }, children),
  Settings: (props: unknown) => {
    mockChart.settings = props;
    return null;
  },
  Heatmap: (props: unknown) => {
    mockChart.heatmap = props;
    return null;
  },
  Tooltip: (props: unknown) => {
    mockChart.tooltip = props;
    return null;
  },
  ScaleType: { Time: 'time' },
  TooltipStickTo: { Bottom: 'bottom' },
}));
jest.mock('@kbn/charts-theme', () => ({ useElasticChartsTheme: () => ({}) }));

const source: TraceSource = {
  timeRange: { from: '2026-10-26T10:00:00.000Z', to: '2026-10-26T11:00:00.000Z' },
};
const stats = { min: 100, p90: 5000, p95: 8000, p99: 10_000, max: 2_000_000, spans: 100 };
const statsTable: EsqlTable = {
  columns: Object.keys(stats).map((name) => ({ name })),
  values: [Object.values(stats)],
};
const gridTable = (values: number[][]): EsqlTable => ({
  columns: ['xi', 'yi', 'spans', 'failed'].map((name) => ({ name })),
  values,
});
// A busy cell with failures, a quiet one beside it, and one far away.
const CELLS = [
  [3, 5, 40, 10],
  [4, 5, 20, 0],
  [30, 20, 3, 3],
];

// jsdom measures nothing: the map is as narrow as it can be, and has 40 columns of 90 s.
const timeGrid = getTimeGrid(source.timeRange.from, source.timeRange.to, getTimeBinsForWidth(0));
// Where the chart put its cells: 40 columns of 6 px and 24 rows of 8 px, from the grid origin the
// theme pins.
const plot: PlotArea = { ...GRID_ORIGIN, colWidth: 6, rowHeight: 8 };
const geometry = createMapGeometry({ plot, timeGrid, stats });
const timeAt = (column: number) => timeGrid.fromMs + column * timeGrid.binMs;

/** A cell as the chart reports it: its pixels are on the grid, a gap smaller than its slot. */
const chartCell = (xi: number, yi: number) => ({
  x: xi * plot.colWidth + LAYOUT.cellGap / 2,
  y: (23 - yi) * plot.rowHeight + LAYOUT.cellGap / 2,
  width: plot.colWidth - LAYOUT.cellGap,
  height: plot.rowHeight - LAYOUT.cellGap,
  yIndex: 23 - yi,
  datum: { x: timeAt(xi), y: yi },
});
// jsdom truncates the coordinates of a pointer, so the tests hand it whole pixels.
const centerOf = (xi: number, yi: number) => ({
  clientX: Math.round(geometry.edgeToX(xi + 0.5)),
  clientY: Math.round(geometry.edgeToY(yi + 0.5)),
});
const edgeOf = (xi: number, yi: number) => ({
  clientX: Math.round(geometry.edgeToX(xi)),
  clientY: Math.round(geometry.edgeToY(yi)),
});

beforeAll(() => {
  // jsdom has no PointerEvent.
  if (!('PointerEvent' in window)) {
    class PointerEventPolyfill extends MouseEvent {
      pointerId: number;
      constructor(type: string, init: PointerEventInit = {}) {
        super(type, init);
        this.pointerId = init.pointerId ?? 0;
      }
    }
    Object.defineProperty(window, 'PointerEvent', { value: PointerEventPolyfill });
  }
});

function renderMap(props: Partial<LatencyMapProps> = {}, table: EsqlTable = gridTable(CELLS)) {
  const runEsql = jest.fn(async (query: string) =>
    query.includes('PERCENTILE') ? statsTable : table
  );
  const onSelectionCommit = jest.fn();
  const view = render(
    <LatencyMap
      source={source}
      runEsql={runEsql}
      onSelectionCommit={onSelectionCommit}
      timeZone="UTC"
      {...props}
    />
  );
  return { ...view, runEsql, onSelectionCommit };
}

const waitForChart = async () => screen.findByTestId('mockChart');
/** The chart tells of a cell: its hover, which is how the map learns where the plot is. */
const hover = (xi: number, yi: number) =>
  act(() => mockChart.settings.onElementOver([[chartCell(xi, yi), {}]]));
const brush = (xs: [number, number], rows: number[]) =>
  act(() =>
    mockChart.settings.onBrushEnd({
      cells: [chartCell(xs[0], rows[0])],
      x: [timeAt(xs[0]), timeAt(xs[1])],
      y: rows,
    })
  );

describe('LatencyMap', () => {
  it('shows a loading chart, then the heatmap with a legend and a summary', async () => {
    const onStats = jest.fn();
    const onLoad = jest.fn();
    renderMap({ onStats, onLoad });
    expect(screen.getByTestId('traceLatencyMapLoading')).toBeInTheDocument();

    await waitForChart();
    expect(mockChart.settings.ariaLabel).toMatch(/Latency map of 100 spans, from 100µs to 2s/);
    expect(mockChart.settings.showLegend).toBe(false);
    expect(screen.getByTestId('traceLatencyMapLegend')).toBeInTheDocument();
    expect(onStats).toHaveBeenCalledWith({ ...stats, sampled: false });
    expect(onLoad).toHaveBeenCalledWith(source);
  });

  it('gives the chart a time scale of the columns, the rows as categories, one colour scale', async () => {
    renderMap();
    await waitForChart();
    const { heatmap } = mockChart;
    expect(heatmap.xScale).toEqual({
      type: 'time',
      interval: { type: 'fixed', unit: 'ms', value: timeGrid.binMs },
    });
    expect(heatmap.ySortPredicate).toBe('numDesc');
    expect(heatmap.colorScale.type).toBe('bands');
    const real = heatmap.data.filter((datum: { spans: number }) => datum.spans > 0);
    expect(real).toHaveLength(CELLS.length);
    expect(real[0]).toMatchObject({ x: timeAt(3), y: 5, spans: 40, failed: 10 });
    // Every row exists on the chart, though only three have spans.
    expect(new Set(heatmap.data.map((datum: { y: number }) => datum.y)).size).toBe(24);
  });

  it("gives the chart a time zone it knows, where the host has the browser's", async () => {
    renderMap({ timeZone: 'Browser' });
    await waitForChart();
    expect(mockChart.heatmap.timeZone).not.toBe('Browser');
    expect(typeof mockChart.heatmap.timeZone).toBe('string');
  });

  it('labels the axes sparsely, with round durations and times', async () => {
    renderMap();
    await waitForChart();
    const { yAxisLabelFormatter, xAxisLabelFormatter } = mockChart.heatmap;
    const yLabels = Array.from({ length: 24 }, (_, row) => yAxisLabelFormatter(row));
    expect(yLabels.filter(Boolean).length).toBeGreaterThan(2);
    expect(yLabels.filter(Boolean).length).toBeLessThan(12);
    expect(yAxisLabelFormatter(23)).toBe('≥10ms');
    const xLabels = Array.from({ length: 40 }, (_, column) => xAxisLabelFormatter(timeAt(column)));
    expect(xLabels.filter(Boolean).length).toBeGreaterThan(1);
    expect(xLabels.filter(Boolean)[0]).toMatch(/^\d\d:\d\d$/);
  });

  it('says so when the range has no spans, and reports it loaded', async () => {
    const onLoad = jest.fn();
    const runEsql = jest.fn(async () => ({ ...statsTable, values: [[0, 0, 0, 0, 0, 0]] }));
    renderMap({ runEsql, onLoad });
    expect(await screen.findByTestId('traceLatencyMapEmpty')).toBeInTheDocument();
    expect(onLoad).toHaveBeenCalledWith(source);
    expect(screen.queryByTestId('mockChart')).not.toBeInTheDocument();
  });

  it('shows the error of a query', async () => {
    renderMap({ runEsql: jest.fn().mockRejectedValue(new Error('index_not_found')) });
    expect(await screen.findByTestId('traceLatencyMapError')).toHaveTextContent('index_not_found');
  });

  it('keeps the failed spans only with the switch on', async () => {
    renderMap();
    await waitForChart();
    fireEvent.click(screen.getByTestId('traceLatencyMapFailedOnly'));
    await waitFor(() =>
      expect(
        mockChart.heatmap.data.filter((datum: { spans: number }) => datum.spans > 0)
      ).toHaveLength(2)
    );
    expect(
      mockChart.heatmap.data.find((datum: { spans: number }) => datum.spans === 10)
    ).toMatchObject({ failed: 10 });
  });

  describe('the tooltip', () => {
    it('sits below the cell it is about, so that the cell stays in view', async () => {
      renderMap();
      await waitForChart();
      expect(mockChart.tooltip).toMatchObject({ stickTo: 'bottom', placement: 'bottom' });
    });

    it('shows the window, durations and counts of a cell, and nothing for an empty one', async () => {
      renderMap();
      await waitForChart();
      const Tooltip = mockChart.tooltip.customTooltip;
      const { unmount } = render(
        <Tooltip values={[{}, {}, { datum: { x: timeAt(3), y: 5, spans: 40, failed: 10 } }]} />
      );
      const details = screen.getByTestId('traceLatencyMapCellDetails');
      expect(details).toHaveTextContent('40 spans');
      expect(details).toHaveTextContent('10 failed (25%)');
      unmount();

      const empty = render(
        <Tooltip values={[{}, {}, { datum: { x: 0, y: 0, spans: 0, failed: 0 } }]} />
      );
      expect(empty.container).toBeEmptyDOMElement();
    });
  });

  describe('the cell under the pointer', () => {
    it('is outlined where the chart put it, and not once the pointer leaves', async () => {
      renderMap();
      await waitForChart();
      // Nothing to outline before the chart tells where its cells are.
      expect(screen.queryByTestId('traceLatencyMapHover')).not.toBeInTheDocument();

      hover(3, 5);
      const outline = screen.getByTestId('traceLatencyMapHover');
      const expected = geometry.rangeToRect({ x0: 3, x1: 4, y0: 5, y1: 6 });
      expect(Number(outline.getAttribute('x'))).toBeCloseTo(expected.x0);
      expect(Number(outline.getAttribute('y'))).toBeCloseTo(expected.y0);
      expect(Number(outline.getAttribute('width'))).toBeCloseTo(expected.x1 - expected.x0);
      expect(Number(outline.getAttribute('height'))).toBeCloseTo(expected.y1 - expected.y0);

      act(() => mockChart.settings.onElementOut());
      expect(screen.queryByTestId('traceLatencyMapHover')).not.toBeInTheDocument();
    });

    it('is not outlined when it has no spans, as it has no tooltip', async () => {
      renderMap();
      await waitForChart();
      hover(10, 10);
      expect(screen.queryByTestId('traceLatencyMapHover')).not.toBeInTheDocument();
    });

    it('comes without a grip or handles when nothing is selected', async () => {
      renderMap();
      await waitForChart();
      hover(3, 5);
      expect(screen.queryByTestId('traceLatencyMapGrip')).not.toBeInTheDocument();
      expect(screen.queryByTestId(/^traceLatencyMapHandle-/)).not.toBeInTheDocument();
    });
  });

  describe('selecting', () => {
    it('takes the brush of the chart, snapped to its cells, with the ES|QL condition', async () => {
      const { onSelectionCommit } = renderMap();
      await waitForChart();
      brush([3, 7], [2, 3, 4, 5]);

      expect(onSelectionCommit).toHaveBeenCalledTimes(1);
      const [selection, condition] = onSelectionCommit.mock.calls[0];
      expect(selection).toEqual(geometry.rangeToSelection({ x0: 3, x1: 7, y0: 2, y1: 6 }));
      expect(selection.from).toBe('2026-10-26T10:04:30.000Z');
      expect(selection.to).toBe('2026-10-26T10:10:30.000Z');
      expect(condition).toContain('@timestamp >= TO_DATETIME("2026-10-26T10:04:30.000Z")');
      expect(condition).toContain('transaction.duration.us >=');
    });

    it('scopes the condition of a map of traces', async () => {
      const { onSelectionCommit } = renderMap({
        unit: 'traces',
        selectionCondition: 'service.name == "cart"',
      });
      await waitForChart();
      brush([3, 5], [5, 6]);
      expect(onSelectionCommit.mock.calls[0][1]).toMatch(
        /AND \(parent\.id IS NULL AND parent_span_id IS NULL\) AND \(service\.name == "cart"\)$/
      );
    });

    it('does not commit a brush over the region that is already selected', async () => {
      const selection = geometry.rangeToSelection({ x0: 3, x1: 7, y0: 2, y1: 6 });
      const { onSelectionCommit } = renderMap({ selection });
      await waitForChart();
      brush([3, 7], [2, 3, 4, 5]);
      expect(onSelectionCommit).not.toHaveBeenCalled();
    });

    it('has the chart draw the selection', async () => {
      const selection = geometry.rangeToSelection({ x0: 3, x1: 7, y0: 2, y1: 6 });
      renderMap({ selection });
      await waitForChart();
      expect(mockChart.heatmap.highlightedData).toEqual(
        rangeToHighlight({ x0: 3, x1: 7, y0: 2, y1: 6 }, timeGrid)
      );
    });

    it('reports a click on a cell with spans, and ignores one without', async () => {
      const onCellClick = jest.fn();
      const { onSelectionCommit } = renderMap({ onCellClick });
      await waitForChart();
      act(() => mockChart.settings.onElementClick([[chartCell(3, 5), {}]]));
      expect(onCellClick).toHaveBeenCalledWith(
        expect.objectContaining({ spans: 40, failed: 10, from: '2026-10-26T10:04:30.000Z' })
      );
      act(() => mockChart.settings.onElementClick([[chartCell(10, 10), {}]]));
      expect(onCellClick).toHaveBeenCalledTimes(1);
      expect(onSelectionCommit).not.toHaveBeenCalled();
    });

    it('selects the slowest 1% and 5% across the whole range', async () => {
      const { onSelectionCommit } = renderMap();
      await waitForChart();
      fireEvent.click(screen.getByTestId('traceLatencyMapSlowest99'));
      const [selection] = onSelectionCommit.mock.calls[0];
      expect(selection.from).toBe(source.timeRange.from);
      expect(selection.minDurationUs).toBeCloseTo(stats.p99);
      expect(selection.maxDurationUs).toBeGreaterThan(stats.max);

      fireEvent.click(screen.getByTestId('traceLatencyMapSlowest95'));
      expect(onSelectionCommit.mock.calls[1][0].minDurationUs).toBeLessThan(stats.p99);
    });
  });

  describe('moving and resizing', () => {
    const range = { x0: 3, x1: 6, y0: 4, y1: 8 };
    const selection = geometry.rangeToSelection(range);

    it('has no handles until the chart has told where its cells are', async () => {
      renderMap({ selection });
      await waitForChart();
      expect(screen.queryByTestId('traceLatencyMapOverlay')).not.toBeInTheDocument();
      hover(4, 5);
      expect(screen.getByTestId('traceLatencyMapOverlay')).toBeInTheDocument();
      expect(screen.getAllByTestId(/^traceLatencyMapHandle-/)).toHaveLength(8);
    });

    it('learns the plot from a brush or a click as well', async () => {
      renderMap({ selection });
      await waitForChart();
      act(() => mockChart.settings.onElementClick([[chartCell(3, 5), {}]]));
      expect(screen.getByTestId('traceLatencyMapOverlay')).toBeInTheDocument();
    });

    it('forgets the plot when the columns change', async () => {
      const view = renderMap({ selection });
      await waitForChart();
      hover(4, 5);
      view.rerender(
        <LatencyMap
          source={{
            ...source,
            timeRange: { from: source.timeRange.from, to: '2026-10-26T12:00:00.000Z' },
          }}
          runEsql={view.runEsql}
          selection={selection}
          onSelectionCommit={view.onSelectionCommit}
        />
      );
      await waitFor(() =>
        expect(screen.queryByTestId('traceLatencyMapOverlay')).not.toBeInTheDocument()
      );
    });

    it('moves the region by whole cells, drawn by the chart as it goes', async () => {
      const { onSelectionCommit } = renderMap({ selection });
      await waitForChart();
      hover(4, 5);
      const overlay = screen.getByTestId('traceLatencyMapOverlay');
      const grip = screen.getByTestId('traceLatencyMapGrip');
      fireEvent.pointerDown(grip, { ...centerOf(4, 5), button: 0, pointerId: 1 });
      fireEvent.pointerMove(overlay, { ...centerOf(7, 6), pointerId: 1 });
      expect(mockChart.heatmap.highlightedData).toEqual(
        rangeToHighlight({ x0: 6, x1: 9, y0: 5, y1: 9 }, timeGrid)
      );
      fireEvent.pointerUp(overlay, { ...centerOf(7, 6), pointerId: 1 });
      expect(onSelectionCommit.mock.calls[0][0]).toEqual(
        geometry.rangeToSelection({ x0: 6, x1: 9, y0: 5, y1: 9 })
      );
    });

    it('resizes the region from a handle', async () => {
      const { onSelectionCommit } = renderMap({ selection });
      await waitForChart();
      hover(4, 5);
      const overlay = screen.getByTestId('traceLatencyMapOverlay');
      // The top right corner.
      fireEvent.pointerDown(screen.getByTestId('traceLatencyMapHandle-tr'), {
        ...edgeOf(6, 8),
        button: 0,
        pointerId: 1,
      });
      fireEvent.pointerMove(overlay, { ...edgeOf(10, 12), pointerId: 1 });
      fireEvent.pointerUp(overlay, { ...edgeOf(10, 12), pointerId: 1 });
      expect(onSelectionCommit.mock.calls[0][0]).toEqual(
        geometry.rangeToSelection({ x0: 3, x1: 10, y0: 4, y1: 12 })
      );
    });

    it('reads a press on the region that does not travel as a click on the cell', async () => {
      const onCellClick = jest.fn();
      const { onSelectionCommit } = renderMap({ selection, onCellClick });
      await waitForChart();
      hover(4, 5);
      const overlay = screen.getByTestId('traceLatencyMapOverlay');
      fireEvent.pointerDown(screen.getByTestId('traceLatencyMapGrip'), {
        ...centerOf(4, 5),
        button: 0,
        pointerId: 1,
      });
      fireEvent.pointerUp(overlay, { ...centerOf(4, 5), pointerId: 1 });
      expect(onCellClick).toHaveBeenCalledWith(expect.objectContaining({ spans: 20 }));
      expect(onSelectionCommit).not.toHaveBeenCalled();
    });

    it('leaves the selection as it was when the gesture is cancelled', async () => {
      const { onSelectionCommit } = renderMap({ selection });
      await waitForChart();
      hover(4, 5);
      const overlay = screen.getByTestId('traceLatencyMapOverlay');
      fireEvent.pointerDown(screen.getByTestId('traceLatencyMapGrip'), {
        ...centerOf(4, 5),
        button: 0,
        pointerId: 1,
      });
      fireEvent.pointerMove(overlay, { ...centerOf(9, 9), pointerId: 1 });
      fireEvent.pointerCancel(overlay);
      expect(onSelectionCommit).not.toHaveBeenCalled();
      expect(mockChart.heatmap.highlightedData).toEqual(rangeToHighlight(range, timeGrid));
    });
  });

  describe('with a selection', () => {
    const selection: LatencyMapSelection = geometry.rangeToSelection({
      x0: 3,
      x1: 5,
      y0: 5,
      y1: 6,
    });

    it('shows its bounds and the counts of its cells, and the host actions', async () => {
      renderMap({
        selection,
        renderSelectionActions: (_, condition) => <button>Filter ({condition.length})</button>,
      });
      const summary = await screen.findByTestId('traceLatencyMapSelectionSummary');
      // The busy cell and the quiet one: 60 spans, 10 of them failed (17%).
      expect(summary).toHaveTextContent('60 spans');
      expect(summary).toHaveTextContent('10 failed (17%)');
      expect(screen.getByRole('button', { name: /^Filter \(\d+\)$/ })).toBeInTheDocument();
    });

    it('narrows to the failed spans when the switch goes on, keeping the region', async () => {
      const { onSelectionCommit } = renderMap({ selection });
      await screen.findByTestId('traceLatencyMapSelectionBar');
      fireEvent.click(screen.getByTestId('traceLatencyMapFailedOnly'));
      expect(onSelectionCommit).toHaveBeenCalledWith(
        { ...selection, failedOnly: true },
        expect.stringContaining('event.outcome == "failure"')
      );
    });

    it('follows the switch of a selection about failures, counting its failed spans', async () => {
      renderMap({ selection: { ...selection, failedOnly: true } });
      const summary = await screen.findByTestId('traceLatencyMapSelectionSummary');
      expect(screen.getByTestId('traceLatencyMapFailedOnly')).toBeChecked();
      expect(summary).toHaveTextContent('10 spans');
      expect(summary).toHaveTextContent('failed only');
    });

    it('clears the selection', async () => {
      const { onSelectionCommit } = renderMap({ selection });
      fireEvent.click(await screen.findByTestId('traceLatencyMapClearSelection'));
      expect(onSelectionCommit).toHaveBeenCalledWith(undefined, undefined);
    });
  });

  describe('with the keyboard', () => {
    const press = (layer: HTMLElement, key: string, shiftKey = false) =>
      fireEvent.keyDown(layer, { key, shiftKey });
    const getLayer = async () => {
      await waitForChart();
      return screen.getByTestId('traceLatencyMapLayer');
    };

    it('selects a region with Shift and the arrows, and Enter, the chart drawing it as it grows', async () => {
      const { onSelectionCommit } = renderMap();
      const layer = await getLayer();
      act(() => layer.focus());
      // Focus alone shows nothing. The first key starts in the middle: column 20, row 11.
      expect(mockChart.heatmap.highlightedData).toBeUndefined();
      press(layer, 'ArrowRight', true);
      press(layer, 'ArrowRight', true);
      press(layer, 'ArrowUp', true);
      // From the cell it started in, column 20, to the one it reached, column 22.
      expect(mockChart.heatmap.highlightedData).toEqual(
        rangeToHighlight({ x0: 20, x1: 23, y0: 11, y1: 13 }, timeGrid)
      );
      press(layer, 'Enter');
      expect(onSelectionCommit.mock.calls[0][0]).toEqual(
        geometry.rangeToSelection({ x0: 20, x1: 23, y0: 11, y1: 13 })
      );
    });

    it('reads out the cell under the cursor', async () => {
      renderMap({ selection: geometry.rangeToSelection({ x0: 3, x1: 5, y0: 5, y1: 6 }) });
      const layer = await getLayer();
      act(() => layer.focus());
      // Starts at the selection's first cell, column 3 row 5, and moves to the quiet one beside it.
      press(layer, 'ArrowRight');
      expect(screen.getByTestId('traceLatencyMapCellDetails')).toHaveTextContent('20 spans');
      expect(screen.getByTestId('traceLatencyMapAnnouncement')).toHaveTextContent(/20 spans/);
    });

    it('does not hide the selection when the map is clicked into focus', async () => {
      const selection = geometry.rangeToSelection({ x0: 3, x1: 5, y0: 5, y1: 6 });
      renderMap({ selection });
      const layer = await getLayer();
      act(() => layer.focus());
      expect(mockChart.heatmap.highlightedData).toEqual(
        rangeToHighlight({ x0: 3, x1: 5, y0: 5, y1: 6 }, timeGrid)
      );
    });

    it('goes back to the selection when the pointer takes over', async () => {
      const selection = geometry.rangeToSelection({ x0: 3, x1: 5, y0: 5, y1: 6 });
      renderMap({ selection });
      const layer = await getLayer();
      act(() => layer.focus());
      press(layer, 'ArrowRight');
      fireEvent.pointerDown(layer, { pointerId: 1 });
      expect(screen.queryByTestId('traceLatencyMapCellDetails')).not.toBeInTheDocument();
      expect(mockChart.heatmap.highlightedData).toEqual(
        rangeToHighlight({ x0: 3, x1: 5, y0: 5, y1: 6 }, timeGrid)
      );
    });

    it('clears the selection on Escape, only when there is one', async () => {
      const first = renderMap();
      let layer = await getLayer();
      act(() => layer.focus());
      press(layer, 'Escape');
      expect(first.onSelectionCommit).not.toHaveBeenCalled();
      first.unmount();

      const second = renderMap({
        selection: geometry.rangeToSelection({ x0: 3, x1: 5, y0: 5, y1: 6 }),
      });
      layer = await getLayer();
      act(() => layer.focus());
      press(layer, 'Escape');
      expect(second.onSelectionCommit).toHaveBeenCalledWith(undefined, undefined);
    });

    it('ignores Enter before the cursor is shown', async () => {
      const { onSelectionCommit } = renderMap();
      const layer = await getLayer();
      act(() => layer.focus());
      press(layer, 'Enter');
      expect(onSelectionCommit).not.toHaveBeenCalled();
    });
  });

  it('notes a sampled map and marks its counts as estimates', async () => {
    const big = { ...statsTable, values: [[100, 5000, 8000, 10_000, 2_000_000, 2_000_000]] };
    const runEsql = jest.fn(async (query: string) =>
      query.includes('PERCENTILE') ? big : gridTable([[3, 5, 40, 10]])
    );
    renderMap({ runEsql });
    expect(await screen.findByTestId('traceLatencyMapSamplingNote')).toBeInTheDocument();
    await waitForChart();
    const Tooltip = mockChart.tooltip.customTooltip;
    render(<Tooltip values={[{}, {}, { datum: { x: timeAt(3), y: 5, spans: 40, failed: 10 } }]} />);
    expect(screen.getByTestId('traceLatencyMapCellDetails')).toHaveTextContent(/~\d+ spans/);
  });
});
