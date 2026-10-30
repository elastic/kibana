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
import type { ESQLSearchResponse } from '@kbn/es-types';
import type { LatencyMapSelection, TraceSource } from '../types';
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
// The width jsdom cannot measure: 320 is the narrowest map, which gets the same 40 columns.
let mockWidth = 320;
jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  useResizeObserver: () => ({ width: mockWidth, height: 0 }),
}));

const source: TraceSource = {
  timeRange: { from: '2026-10-26T10:00:00.000Z', to: '2026-10-26T11:00:00.000Z' },
};
const stats = {
  min: 100_000,
  p90: 5_000_000,
  p95: 8_000_000,
  p99: 10_000_000,
  max: 2_000_000_000,
  spans: 100,
};
const statsTable: ESQLSearchResponse = {
  columns: Object.keys(stats).map((name) => ({ name, type: 'long' })),
  values: [Object.values(stats)],
};
const gridTable = (values: number[][]): ESQLSearchResponse => ({
  columns: ['xi', 'yi', 'spans', 'failed'].map((name) => ({ name, type: 'long' })),
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

function renderMap(
  props: Partial<LatencyMapProps> = {},
  table: ESQLSearchResponse = gridTable(CELLS)
) {
  const runEsql = jest.fn(async (query: string) =>
    query.includes('PERCENTILE') ? statsTable : table
  );
  const onSelectionCommit = jest.fn();
  const mapProps = { source, runEsql, onSelectionCommit, timeZone: 'UTC', ...props };
  const view = render(<LatencyMap {...mapProps} />);
  return {
    ...view,
    runEsql,
    onSelectionCommit,
    /** Renders again with the same props, picking up a changed `mockWidth`. */
    rerenderMap: () => view.rerender(<LatencyMap {...mapProps} />),
  };
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
  beforeEach(() => {
    // Not carried between tests: a test must not read the chart of the one before it.
    mockChart.settings = mockChart.heatmap = mockChart.tooltip = undefined;
  });

  it('loads nothing until the map is measured', async () => {
    mockWidth = 0;
    try {
      const { runEsql } = renderMap();
      expect(await screen.findByTestId('traceLatencyMapLoading')).toBeInTheDocument();
      expect(runEsql).not.toHaveBeenCalled();
    } finally {
      mockWidth = 320;
    }
  });

  it('reloads only when a resize crosses a tier of time columns', async () => {
    try {
      const { runEsql, rerenderMap } = renderMap();
      await waitForChart();
      const initialCalls = runEsql.mock.calls.length;

      // A resize inside the tier: the cells stretch, nothing reloads.
      mockWidth = 321;
      rerenderMap();
      await act(() => new Promise((resolve) => setTimeout(resolve, 300)));
      expect(runEsql.mock.calls.length).toBe(initialCalls);

      // Across tiers: the grid loads again, with the statistics it already has.
      mockWidth = 2000;
      rerenderMap();
      await waitFor(() => expect(runEsql.mock.calls.length).toBeGreaterThan(initialCalls));
      const newQueries = runEsql.mock.calls.slice(initialCalls).map(([query]) => query);
      expect(newQueries.some((query) => query.includes('PERCENTILE'))).toBe(false);

      // Hidden (width 0) and shown again: the width is kept, nothing reloads.
      const total = runEsql.mock.calls.length;
      mockWidth = 0;
      rerenderMap();
      mockWidth = 2000;
      rerenderMap();
      await act(() => new Promise((resolve) => setTimeout(resolve, 300)));
      expect(runEsql.mock.calls.length).toBe(total);
    } finally {
      mockWidth = 320;
    }
  });

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

  it('labels the durations sparsely and every column with its time', async () => {
    renderMap();
    await waitForChart();
    const { yAxisLabelFormatter, xAxisLabelFormatter } = mockChart.heatmap;
    const yLabels = Array.from({ length: 24 }, (_, row) => yAxisLabelFormatter(row));
    expect(yLabels.filter(Boolean).length).toBeGreaterThan(2);
    expect(yLabels.filter(Boolean).length).toBeLessThan(12);
    expect(yAxisLabelFormatter(23)).toBe('≥10ms');
    const xLabels = Array.from({ length: 40 }, (_, column) => xAxisLabelFormatter(timeAt(column)));
    // The chart thins the columns' labels to the ones that fit.
    // Columns that do not span whole minutes read with seconds, so that no two read alike.
    expect(xLabels.every((label) => /^\d\d:\d\d(:\d\d)?$/.test(label))).toBe(true);
    expect(new Set(xLabels).size).toBe(40);
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

    it('treats a click in "failed only" mode as a click on the failed spans', async () => {
      const onCellClick = jest.fn();
      renderMap({ onCellClick });
      await waitForChart();
      fireEvent.click(screen.getByTestId('traceLatencyMapFailedOnly'));
      await waitFor(() =>
        expect(mockChart.heatmap.data.some((datum: { spans: number }) => datum.spans === 10)).toBe(
          true
        )
      );

      act(() => mockChart.settings.onElementClick([[chartCell(3, 5), {}]]));
      // 10 of the 40 spans failed: the cell is those 10, and the selection is about failures.
      expect(onCellClick).toHaveBeenCalledWith(
        expect.objectContaining({ spans: 10, failed: 10, failedOnly: true })
      );

      // A cell without failures is empty in this mode.
      onCellClick.mockClear();
      act(() => mockChart.settings.onElementClick([[chartCell(4, 5), {}]]));
      expect(onCellClick).not.toHaveBeenCalled();
    });

    it('selects the slowest 1% and 5% across the whole range', async () => {
      const { onSelectionCommit } = renderMap();
      await waitForChart();
      fireEvent.click(screen.getByTestId('traceLatencyMapSlowest99'));
      const [selection] = onSelectionCommit.mock.calls[0];
      expect(selection.from).toBe(source.timeRange.from);
      expect(selection.minDuration).toBeCloseTo(stats.p99);
      expect(selection.maxDuration).toBeGreaterThan(stats.max);

      fireEvent.click(screen.getByTestId('traceLatencyMapSlowest95'));
      expect(onSelectionCommit.mock.calls[1][0].minDuration).toBeLessThan(stats.p99);
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

    it('lets go of the handles while a new region is brushed, and shows them again after', async () => {
      renderMap({ selection });
      await waitForChart();
      hover(4, 5);
      expect(screen.getAllByTestId(/^traceLatencyMapHandle-/)).toHaveLength(8);
      fireEvent.pointerDown(screen.getByTestId('traceLatencyMapLayer'), {
        button: 0,
        pointerId: 1,
      });
      expect(screen.queryByTestId(/^traceLatencyMapHandle-/)).not.toBeInTheDocument();
      fireEvent.pointerUp(window, { pointerId: 1 });
      expect(screen.getAllByTestId(/^traceLatencyMapHandle-/)).toHaveLength(8);
    });

    it('keeps the handles when a press lands on them', async () => {
      renderMap({ selection });
      await waitForChart();
      hover(4, 5);
      fireEvent.pointerDown(screen.getByTestId('traceLatencyMapHandle-tr'), {
        button: 0,
        pointerId: 1,
      });
      expect(screen.getAllByTestId(/^traceLatencyMapHandle-/)).toHaveLength(8);
    });

    it('grabs the region, and the hover outline gives way while it is moved', async () => {
      renderMap({ selection });
      await waitForChart();
      hover(4, 5);
      const grip = screen.getByTestId('traceLatencyMapGrip');
      expect(grip).toHaveStyle({ cursor: 'grab' });
      expect(screen.getByTestId('traceLatencyMapHover')).toBeInTheDocument();
      fireEvent.pointerDown(grip, { ...centerOf(4, 5), button: 0, pointerId: 1 });
      expect(screen.getByTestId('traceLatencyMapGrip')).toHaveStyle({ cursor: 'grabbing' });
      expect(screen.queryByTestId('traceLatencyMapHover')).not.toBeInTheDocument();
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

    it('leaves the selection as it was when Escape ends the gesture', async () => {
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
      fireEvent.keyDown(screen.getByTestId('traceLatencyMapLayer'), { key: 'Escape' });
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

    it('counts a selection that does not follow the cells over its own bounds, as an estimate', async () => {
      // The map was resized after the selection was made: its start is in the middle of column 3.
      const shifted = {
        ...selection,
        from: new Date(timeAt(3) + timeGrid.binMs / 2).toISOString(),
      };
      renderMap({ selection: shifted });
      const summary = await screen.findByTestId('traceLatencyMapSelectionSummary');
      // Half of the 40 spans of column 3, and the 20 of column 4.
      expect(summary).toHaveTextContent('~40 spans');
    });

    it('does not call the count of a selection on the cell edges an estimate', async () => {
      renderMap({ selection });
      const summary = await screen.findByTestId('traceLatencyMapSelectionSummary');
      expect(summary).toHaveTextContent('60 spans');
      expect(summary).not.toHaveTextContent('~60');
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
      // Done selecting: the cursor and its readout close, instead of hiding the
      // fresh selection behind a one-cell highlight.
      expect(screen.queryByTestId('traceLatencyMapCellDetails')).not.toBeInTheDocument();
    });

    it('drops the cursor when focus leaves the map', async () => {
      const selection = geometry.rangeToSelection({ x0: 3, x1: 5, y0: 5, y1: 6 });
      renderMap({ selection });
      const layer = await getLayer();
      act(() => layer.focus());
      press(layer, 'ArrowRight');
      expect(screen.getByTestId('traceLatencyMapCellDetails')).toBeInTheDocument();

      fireEvent.focusOut(layer, { relatedTarget: document.body });
      expect(screen.queryByTestId('traceLatencyMapCellDetails')).not.toBeInTheDocument();
      expect(mockChart.heatmap.highlightedData).toEqual(
        rangeToHighlight({ x0: 3, x1: 5, y0: 5, y1: 6 }, timeGrid)
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

    it('drops the cursor when the map gets other columns, so that it cannot point past the new edge', async () => {
      const view = renderMap();
      const layer = await getLayer();
      act(() => layer.focus());
      press(layer, 'ArrowRight');
      expect(screen.getByTestId('traceLatencyMapCellDetails')).toBeInTheDocument();

      // A longer range: other columns.
      view.rerender(
        <LatencyMap
          source={{ timeRange: { from: source.timeRange.from, to: '2026-10-26T14:00:00.000Z' } }}
          runEsql={view.runEsql}
          onSelectionCommit={view.onSelectionCommit}
          timeZone="UTC"
        />
      );
      await waitFor(() =>
        expect(screen.queryByTestId('traceLatencyMapCellDetails')).not.toBeInTheDocument()
      );
      // Enter then has no cursor to commit.
      press(await getLayer(), 'Enter');
      expect(view.onSelectionCommit).not.toHaveBeenCalled();
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

    it('does nothing on Enter with a cursor and no region, so the selection stays', async () => {
      const { onSelectionCommit } = renderMap({
        selection: geometry.rangeToSelection({ x0: 3, x1: 5, y0: 5, y1: 6 }),
      });
      const layer = await getLayer();
      act(() => layer.focus());
      press(layer, 'ArrowRight');
      press(layer, 'Enter');
      expect(onSelectionCommit).not.toHaveBeenCalled();
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
