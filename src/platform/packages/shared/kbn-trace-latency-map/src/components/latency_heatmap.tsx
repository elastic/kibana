/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { Chart, Heatmap, ScaleType, Settings, Tooltip, TooltipStickTo } from '@elastic/charts';
import type {
  BrushEndListener,
  CustomTooltip,
  ElementClickListener,
  ElementOverListener,
  PartialTheme,
} from '@elastic/charts';
import { EuiPanel } from '@elastic/eui';
import { useElasticChartsTheme } from '@kbn/charts-theme';
import type { DurationStats, LatencyMapUnit } from '../types';
import { LATENCY_MAP_ROWS, rowToDurationUs } from '../query/duration_rows';
import type { LatencyGrid } from '../query/parse';
import type { TimeGrid } from '../query/time_grid';
import { getXAxisLabels, getYAxisLabels } from '../chart/axis_labels';
import { brushToRange, rangeToHighlight } from '../chart/brush';
import { buildColorBands, buildHeatmapData } from '../chart/encoding';
import type { Cell as GridPosition, CellRange } from '../geometry/cell_range';
import { LAYOUT } from '../geometry/layout';
import { resolveTimeZone } from '../geometry/ticks';
import { calibratePlot } from '../geometry/plot_calibration';
import type { ChartCell } from '../geometry/plot_calibration';
import type { PlotArea } from '../geometry/map_geometry';
import type { LatencyMapColors } from '../hooks/use_latency_map_colors';
import { CellDetails } from './cell_details';

/** Room, in pixels, a label of the axes needs, to leave blanks between them. */
const Y_LABEL_PX = 18;
const X_LABEL_PX = 96;

export interface LatencyHeatmapProps {
  grid: LatencyGrid;
  timeGrid: TimeGrid;
  stats: DurationStats;
  unit: LatencyMapUnit;
  sampled: boolean;
  timeZone?: string;
  colors: LatencyMapColors;
  /** The cells of the failed spans alone. */
  failedOnly: boolean;
  /** Width and height of the chart, in pixels. */
  width: number;
  height: number;
  /** The cells to draw as selected: the selection, the region being moved, the keyboard's. */
  highlight?: CellRange;
  /** What a screen reader hears of the chart. */
  summary: string;
  /** A region was drawn: the chart's own brush, snapped to whole cells. */
  onBrush: (range: CellRange) => void;
  onCellClick: (cell: GridPosition) => void;
  /** Where the chart put its cells, whenever it tells us of one. */
  onPlot: (plot: PlotArea) => void;
  /** The cell under the pointer, and undefined when it leaves. */
  onCellHover: (cell?: GridPosition) => void;
}

/** What the chart's events tell of a heatmap cell: where it is on the plot and in the grid. */
const toChartCell = (cell: ChartCell & { datum: ChartDatum }, timeGrid: TimeGrid) =>
  calibratePlot(cell, Math.round((Number(cell.datum.x) - timeGrid.fromMs) / timeGrid.binMs));

/** The cell of a chart event: the chart's own datum, which holds where the cell is and not our counts. */
interface ChartDatum {
  x: number | string;
  y: number | string;
}

const isCell = (element: unknown): element is [ChartCell & { datum: ChartDatum }] =>
  Array.isArray(element) && typeof element[0]?.yIndex === 'number' && Boolean(element[0]?.datum);

/**
 * The map as an `@elastic/charts` heatmap: time on X as a raster time scale, the duration rows
 * as categories. One colour scale carries opacity and hue together, see `encodeCell`. The brush,
 * the tooltip and the highlight of the selection are the chart's own.
 */
export function LatencyHeatmap({
  grid,
  timeGrid,
  stats,
  unit,
  sampled,
  timeZone,
  colors,
  failedOnly,
  width,
  height,
  highlight,
  summary,
  onBrush,
  onCellClick,
  onPlot,
  onCellHover,
}: LatencyHeatmapProps) {
  const baseTheme = useElasticChartsTheme();

  const data = useMemo(
    () => buildHeatmapData(grid, timeGrid, failedOnly),
    [grid, timeGrid, failedOnly]
  );
  const bands = useMemo(() => buildColorBands(colors.bandColor), [colors]);

  const rowHeight = Math.max(1, (height - LAYOUT.plotInset.vertical) / LATENCY_MAP_ROWS);
  const yLabels = useMemo(
    () => getYAxisLabels(stats, Math.max(1, Math.ceil(Y_LABEL_PX / rowHeight))),
    [stats, rowHeight]
  );
  const xLabels = useMemo(
    () =>
      getXAxisLabels(
        timeGrid,
        Math.max(2, Math.floor((width - LAYOUT.plotInset.horizontal) / X_LABEL_PX)),
        timeZone
      ),
    [timeGrid, width, timeZone]
  );

  const theme = useMemo<PartialTheme>(
    () => ({
      // So that the plot starts where `GRID_ORIGIN` says, whatever the base theme is.
      chartMargins: { top: LAYOUT.plotTopMargin, right: 0, bottom: 0, left: 0 },
      chartPaddings: { top: 0, right: 0, bottom: 0, left: 0 },
      // The panel of the host shows through.
      background: { color: 'transparent' },
      heatmap: {
        // The grid line is the gap between cells, left transparent so that the panel shows through.
        grid: { stroke: { width: LAYOUT.cellGap, color: 'transparent' } },
        cell: {
          maxWidth: 'fill',
          maxHeight: 'fill',
          label: { visible: false },
          border: { strokeWidth: 0 },
        },
        xAxisLabel: { visible: true, fontSize: 10 },
        yAxisLabel: { visible: true, fontSize: 10, width: LAYOUT.yAxisLabelWidth },
        brushMask: { visible: true, fill: colors.outsideSelectionMask },
        brushArea: {
          visible: true,
          fill: colors.selectionFill,
          stroke: colors.selectionStroke,
          strokeWidth: 2,
        },
        brushTool: { visible: true, fill: colors.selectionStroke },
      },
    }),
    [colors]
  );

  // The chart gives its tooltip its own cell, with the time and row; the counts are ours.
  const dataByCell = useMemo(
    () => new Map(data.map((datum) => [`${datum.x}:${datum.y}`, datum])),
    [data]
  );
  const customTooltip = useMemo<CustomTooltip>(
    () =>
      function LatencyTooltip({ values }) {
        const cell = values[values.length - 1]?.datum as ChartDatum | undefined;
        const datum = cell && dataByCell.get(`${Number(cell.x)}:${Number(cell.y)}`);
        if (!datum || datum.spans <= 0) return null;
        return (
          <EuiPanel paddingSize="s" hasShadow>
            <CellDetails
              fromMs={datum.x}
              toMs={datum.x + timeGrid.binMs}
              minDurationUs={rowToDurationUs(datum.y, stats)}
              maxDurationUs={rowToDurationUs(datum.y + 1, stats)}
              spans={datum.spans}
              failed={datum.failed}
              unit={unit}
              sampled={sampled}
              timeZone={timeZone}
            />
          </EuiPanel>
        );
      },
    [dataByCell, timeGrid.binMs, stats, unit, sampled, timeZone]
  );

  const handleBrush: BrushEndListener = (event) => {
    if (!('cells' in event)) return;
    const [cell] = event.cells;
    if (cell) onPlot(toChartCell(cell as never, timeGrid));
    const range = brushToRange(event.x, event.y, timeGrid, LATENCY_MAP_ROWS);
    if (range) onBrush(range);
  };

  const toPosition = (cell: { datum: ChartDatum }) => ({
    xi: Math.round((Number(cell.datum.x) - timeGrid.fromMs) / timeGrid.binMs),
    yi: Number(cell.datum.y),
  });

  // The chart tells of a cell as the pointer enters it. The first one is all it takes to know
  // where the plot is, for the handles of the selection.
  const handleOver: ElementOverListener = (elements) => {
    const [element] = elements;
    if (!isCell(element)) return;
    onPlot(toChartCell(element[0], timeGrid));
    const { datum } = element[0];
    const spans = dataByCell.get(`${Number(datum.x)}:${Number(datum.y)}`)?.spans ?? 0;
    onCellHover(spans > 0 ? toPosition(element[0]) : undefined);
  };

  const handleClick: ElementClickListener = (elements) => {
    const [element] = elements;
    if (!isCell(element)) return;
    onPlot(toChartCell(element[0], timeGrid));
    onCellClick(toPosition(element[0]));
  };

  return (
    <div data-test-subj="traceLatencyMapChart">
      <Chart size={{ width: '100%', height }}>
        <Settings
          baseTheme={baseTheme}
          theme={theme}
          showLegend={false}
          ariaLabel={summary}
          onBrushEnd={handleBrush}
          onElementOver={handleOver}
          onElementOut={() => onCellHover(undefined)}
          onElementClick={handleClick}
        />
        {/* Below the cell it is about, not over it: the overlay outlines that cell. */}
        <Tooltip
          customTooltip={customTooltip}
          stickTo={TooltipStickTo.Bottom}
          placement="bottom"
          fallbackPlacements={['top', 'right', 'left']}
          offset={6}
        />
        <Heatmap
          id="traceLatencyMap"
          name={unit}
          data={data}
          xAccessor="x"
          yAccessor="y"
          valueAccessor="value"
          valueFormatter={(value) => `${value}`}
          colorScale={{ type: 'bands', bands }}
          xScale={{
            type: ScaleType.Time,
            interval: { type: 'fixed', unit: 'ms', value: timeGrid.binMs },
          }}
          xSortPredicate="numAsc"
          ySortPredicate="numDesc"
          timeZone={resolveTimeZone(timeZone)}
          xAxisLabelFormatter={(value) =>
            xLabels.get(Math.round((Number(value) - timeGrid.fromMs) / timeGrid.binMs)) ?? ''
          }
          yAxisLabelFormatter={(value) => yLabels.get(Number(value)) ?? ''}
          highlightedData={highlight ? rangeToHighlight(highlight, timeGrid) : undefined}
        />
      </Chart>
    </div>
  );
}
