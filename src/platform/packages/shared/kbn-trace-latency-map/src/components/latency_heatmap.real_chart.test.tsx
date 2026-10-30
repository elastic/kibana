/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * The tests of `latency_map.test.tsx` replace `@elastic/charts` and play the chart. These do not: they
 * render the real heatmap into a canvas that records what it draws, and check what the package
 * assumes of the chart (where it puts its grid and its cells, what its hover and its brush report,
 * where it draws the highlight of a selection) against what the chart does.
 */
import 'jest-canvas-mock';
import React from 'react';
import { act, render } from '@testing-library/react';
import { getTimeGrid } from '../query/time_grid';
import { addTableToGrid, createEmptyGrid } from '../query/parse';
import { getDensityLevel, getFailureLevel } from '../chart/encoding';
import { LAYOUT } from '../geometry/layout';
import { createMapGeometry } from '../geometry/map_geometry';
import type { PlotArea } from '../geometry/map_geometry';
import { GRID_ORIGIN } from '../geometry/plot_calibration';
import type { CellRange } from '../geometry/cell_range';
import type { DurationStats } from '../types';
import type { LatencyMapColors } from '../hooks/use_latency_map_colors';
import { LatencyHeatmap } from './latency_heatmap';

const WIDTH = 700;
const HEIGHT = 300;

const stats: DurationStats = {
  min: 100,
  p90: 5000,
  p95: 8000,
  p99: 10_000,
  max: 2_000_000,
  spans: 100,
};
const timeGrid = getTimeGrid('2026-10-26T10:00:00.000Z', '2026-10-26T11:00:00.000Z', 40);
// Three cells that differ in density and failure rate, so that each has a colour of its own.
const CELLS = [
  { xi: 3, yi: 5, spans: 40, failed: 10 },
  { xi: 4, yi: 5, spans: 20, failed: 0 },
  { xi: 30, yi: 20, spans: 3, failed: 3 },
];
const grid = addTableToGrid(createEmptyGrid(timeGrid.bins), {
  columns: ['xi', 'yi', 'spans', 'failed'].map((name) => ({ name, type: 'long' })),
  values: CELLS.map(({ xi, yi, spans, failed }) => [xi, yi, spans, failed]),
});

const hex = (value: number) => value.toString(16).padStart(2, '0');
/** The colour a cell is painted: density and failure level, as two of the three channels. */
const colorOf = (cell: { spans: number; failed: number }) =>
  `#${hex(getDensityLevel(cell.spans, 40))}${hex(getFailureLevel(cell.failed, cell.spans))}09`;
const colors: LatencyMapColors = {
  bandColor: (densityLevel, failureLevel) => `rgb(${densityLevel},${failureLevel},9)`,
  densityRamp: [],
  failureRamp: [],
  selectionStroke: 'rgb(1,2,3)',
  selectionFill: 'rgba(1,2,3,0.1)',
  outsideSelectionMask: 'rgba(255,255,255,0.5)',
  handleFill: '#fff',
  axisText: '#666',
  hoverOutline: '#000',
};

beforeAll(() => {
  // jsdom lays nothing out: every element is the size of the chart.
  Object.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: WIDTH,
      bottom: HEIGHT,
      width: WIDTH,
      height: HEIGHT,
      toJSON: () => ({}),
    }),
  });
  ['clientWidth', 'offsetWidth'].forEach((key) =>
    Object.defineProperty(HTMLElement.prototype, key, { configurable: true, get: () => WIDTH })
  );
  ['clientHeight', 'offsetHeight'].forEach((key) =>
    Object.defineProperty(HTMLElement.prototype, key, { configurable: true, get: () => HEIGHT })
  );
  (window as any).ResizeObserver = class {
    constructor(private callback: ResizeObserverCallback) {}
    observe(target: Element) {
      this.callback(
        [{ target, contentRect: { width: WIDTH, height: HEIGHT } } as any],
        this as any
      );
    }
    unobserve() {}
    disconnect() {}
  };
});

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function renderChart(initial: { highlight?: CellRange } = {}) {
  const onPlot = jest.fn();
  const onCellHover = jest.fn();
  const onBrush = jest.fn();
  const element = (props: { highlight?: CellRange }) => (
    <LatencyHeatmap
      grid={grid}
      timeGrid={timeGrid}
      stats={stats}
      unit="spans"
      sampled={false}
      timeZone="UTC"
      colors={colors}
      failedOnly={false}
      width={WIDTH}
      height={HEIGHT}
      summary="Latency map"
      onBrush={onBrush}
      onCellClick={jest.fn()}
      onPlot={onPlot}
      onCellHover={onCellHover}
      {...props}
    />
  );
  const view = render(element(initial));
  /** A selection arrives after the chart is on screen. */
  const setHighlight = (highlight?: CellRange) => view.rerender(element({ highlight }));
  const canvas = view.container.querySelector('canvas') as HTMLCanvasElement;
  const context = canvas.getContext('2d') as any;
  const pointer = view.container.querySelector('.echChartPointerContainer') as HTMLElement;

  /** What the chart drew: a rectangle, with its style and the translate it was drawn under. */
  const drawn = (type: 'fill' | 'stroke') => {
    let style = '';
    const out: Array<Rect & { style: string; translate: [number, number] }> = [];
    for (const event of context.__getEvents()) {
      if (event.type === (type === 'fill' ? 'fillStyle' : 'strokeStyle')) style = event.props.value;
      if (event.type === type) {
        const rect = event.props.path?.find((step: { type: string }) => step.type === 'rect');
        if (rect) {
          out.push({
            style,
            translate: [event.transform[4], event.transform[5]],
            x: event.transform[4] + rect.props.x,
            y: event.transform[5] + rect.props.y,
            w: rect.props.width,
            h: rect.props.height,
          });
        }
      }
    }
    return out;
  };
  /** The highlight of a selection: the chart draws it as four lines of an svg over the canvas. */
  const highlightRect = (): Rect | undefined => {
    const lines = Array.from(view.container.querySelectorAll('.echHighlighter g line'));
    if (!lines.length) return undefined;
    const read = (name: string) => lines.map((line) => Number(line.getAttribute(name)));
    const xs = [...read('x1'), ...read('x2')];
    const ys = [...read('y1'), ...read('y2')];
    return {
      x: Math.min(...xs),
      y: Math.min(...ys),
      w: Math.max(...xs) - Math.min(...xs),
      h: Math.max(...ys) - Math.min(...ys),
    };
  };
  const cellRect = (cell: { spans: number; failed: number }) =>
    drawn('fill').find((rect) => rect.style === colorOf(cell))!;

  // The chart reads the pointer from the mouse events' offsets.
  const fire = (type: 'mousemove' | 'mousedown' | 'mouseup', point: { x: number; y: number }) =>
    act(() => {
      const event = new MouseEvent(type, {
        clientX: point.x,
        clientY: point.y,
        bubbles: true,
        button: 0,
        buttons: type === 'mouseup' ? 0 : 1,
      });
      Object.defineProperty(event, 'offsetX', { value: point.x });
      Object.defineProperty(event, 'offsetY', { value: point.y });
      pointer.dispatchEvent(event);
    });
  const centerOf = (rect: Rect) => ({ x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 });
  const settle = () =>
    act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 150));
    });

  return {
    onPlot,
    onCellHover,
    onBrush,
    drawn,
    cellRect,
    highlightRect,
    fire,
    centerOf,
    settle,
    setHighlight,
  };
}

/** The plot the chart reported on hover, and what the package then thinks the cells' rectangles are. */
async function hoverAndCalibrate(chart: ReturnType<typeof renderChart>): Promise<PlotArea> {
  chart.fire('mousemove', chart.centerOf(chart.cellRect(CELLS[0])));
  await chart.settle();
  return chart.onPlot.mock.calls[0][0];
}

describe('LatencyHeatmap on the real chart', () => {
  it('draws its grid where GRID_ORIGIN says, which the geometry builds on', () => {
    const chart = renderChart();
    const cells = chart.drawn('fill').filter((rect) => rect.style !== 'rgba(0, 0, 0, 0)');
    expect(cells.length).toBeGreaterThan(0);
    // The canvas is translated to the grid's corner, below the margin and half a gap.
    cells.forEach((rect) => {
      expect(rect.translate[0]).toBeCloseTo(GRID_ORIGIN.left);
      expect(rect.translate[1]).toBeCloseTo(GRID_ORIGIN.top);
    });
  });

  it('paints each cell of the data once, in the colour of its density and failure level', () => {
    const chart = renderChart();
    CELLS.forEach((cell) => {
      expect(chart.drawn('fill').filter((rect) => rect.style === colorOf(cell))).toHaveLength(1);
    });
  });

  it('reports a hovered cell from which the package finds where every cell is', async () => {
    const chart = renderChart();
    const plot = await hoverAndCalibrate(chart);
    const geometry = createMapGeometry({ plot, timeGrid, stats });
    const gap = LAYOUT.cellGap;

    CELLS.forEach((cell) => {
      const slot = geometry.rangeToRect({
        x0: cell.xi,
        x1: cell.xi + 1,
        y0: cell.yi,
        y1: cell.yi + 1,
      });
      const real = chart.cellRect(cell);
      // The chart draws a cell a gap smaller than its slot, half a gap in from each edge.
      expect(real.x).toBeCloseTo(slot.x0 + gap / 2, 3);
      expect(real.y).toBeCloseTo(slot.y0 + gap / 2, 3);
      expect(real.w).toBeCloseTo(slot.x1 - slot.x0 - gap, 3);
      expect(real.h).toBeCloseTo(slot.y1 - slot.y0 - gap, 3);
    });
  });

  it('puts the first row at the top and the last column at the right, as the geometry assumes', async () => {
    const chart = renderChart();
    const plot = await hoverAndCalibrate(chart);
    const geometry = createMapGeometry({ plot, timeGrid, stats });
    // 24 rows from the top margin, a grid of 40 columns to the right edge of the chart's grid.
    expect(geometry.edgeToY(geometry.rows)).toBeCloseTo(GRID_ORIGIN.top, 3);
    expect(geometry.plotRight).toBeLessThanOrEqual(WIDTH);
    // The slowest row is the top one: the cell of row 20 is drawn above the cell of row 5.
    expect(chart.cellRect(CELLS[2]).y).toBeLessThan(chart.cellRect(CELLS[0]).y);
  });

  it('tells which cell is under the pointer, and not for the gaps between cells', async () => {
    const chart = renderChart();
    await hoverAndCalibrate(chart);
    expect(chart.onCellHover).toHaveBeenLastCalledWith({ xi: 3, yi: 5 });
  });

  it('reports a brush as the cells it covers, from the first cell to the last, rows included', async () => {
    const chart = renderChart();
    const from = chart.centerOf(chart.cellRect(CELLS[0]));
    const to = chart.centerOf(chart.cellRect(CELLS[1]));
    chart.fire('mousedown', from);
    chart.fire('mousemove', { x: (from.x + to.x) / 2, y: from.y });
    chart.fire('mousemove', to);
    chart.fire('mouseup', to);
    await chart.settle();
    // Columns 3 and 4 of row 5: the brush ends after the last column it covers.
    expect(chart.onBrush).toHaveBeenCalledWith({ x0: 3, x1: 5, y0: 5, y1: 6 });
  });

  it('reports a brush across rows and a long way off, from the slow end to the fast one', async () => {
    const chart = renderChart();
    const from = chart.centerOf(chart.cellRect(CELLS[2]));
    const to = chart.centerOf(chart.cellRect(CELLS[0]));
    chart.fire('mousedown', from);
    chart.fire('mousemove', { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 });
    chart.fire('mousemove', to);
    chart.fire('mouseup', to);
    await chart.settle();
    // From (3, 5) to (30, 20), whichever way the drag went.
    expect(chart.onBrush).toHaveBeenCalledWith({ x0: 3, x1: 31, y0: 5, y1: 21 });
  });

  const expectRect = (
    actual: Rect | undefined,
    expected: { x0: number; x1: number; y0: number; y1: number }
  ) => {
    expect(actual).toBeDefined();
    expect(actual!.x).toBeCloseTo(expected.x0, 2);
    expect(actual!.y).toBeCloseTo(expected.y0, 2);
    expect(actual!.w).toBeCloseTo(expected.x1 - expected.x0, 2);
    expect(actual!.h).toBeCloseTo(expected.y1 - expected.y0, 2);
  };

  it('draws the highlight of a selection over the cells it covers, where the handles then sit', async () => {
    const range = { x0: 3, x1: 5, y0: 5, y1: 6 };
    const chart = renderChart({ highlight: range });
    const plot = await hoverAndCalibrate(chart);
    const geometry = createMapGeometry({ plot, timeGrid, stats });
    // The chart's own highlight is the rectangle the geometry gives the handles.
    expectRect(chart.highlightRect(), geometry.rangeToRect(range));
  });

  it('draws the highlight at the right rows when the selection spans several, slowest at the top', async () => {
    const range = { x0: 2, x1: 8, y0: 18, y1: 22 };
    const chart = renderChart({ highlight: range });
    const plot = await hoverAndCalibrate(chart);
    const geometry = createMapGeometry({ plot, timeGrid, stats });
    expectRect(chart.highlightRect(), geometry.rangeToRect(range));
  });

  it('draws the highlight of the first column and the last, at the edges of the grid', async () => {
    const range = { x0: 0, x1: timeGrid.bins, y0: 0, y1: 24 };
    const chart = renderChart({ highlight: range });
    const plot = await hoverAndCalibrate(chart);
    const geometry = createMapGeometry({ plot, timeGrid, stats });
    expectRect(chart.highlightRect(), geometry.rangeToRect(range));
  });

  it('moves the highlight when the selection changes, and takes it away when it is cleared', async () => {
    const chart = renderChart();
    const plot = await hoverAndCalibrate(chart);
    const geometry = createMapGeometry({ plot, timeGrid, stats });
    expect(chart.highlightRect()).toBeUndefined();

    const first = { x0: 3, x1: 5, y0: 5, y1: 6 };
    chart.setHighlight(first);
    await chart.settle();
    expectRect(chart.highlightRect(), geometry.rangeToRect(first));

    const second = { x0: 10, x1: 14, y0: 2, y1: 9 };
    chart.setHighlight(second);
    await chart.settle();
    expectRect(chart.highlightRect(), geometry.rangeToRect(second));

    chart.setHighlight(undefined);
    await chart.settle();
    expect(chart.highlightRect()).toBeUndefined();
  });
});
