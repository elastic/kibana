/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useMemo, useState } from 'react';
import type { PlotArea } from '../geometry/map_geometry';
import { isSamePlot } from '../geometry/plot_calibration';
import type { TimeGrid } from '../query/time_grid';

/**
 * Where the chart put its cells. Known from the first cell the chart tells of (a hover, a
 * click, a brush), and kept for as long as the chart keeps its height and its columns. A
 * resize within a tier (a flyout opening beside the map, say) and the band gutter only
 * change how wide the columns are, so the calibration follows them exactly: same corner
 * and rows, each column's share of the change. The chart's next event confirms it.
 */
export function usePlotCalibration({
  plotKey,
  width,
  rightMargin,
  timeGrid,
}: {
  /** What the plot depends on besides its width: the chart's height and its columns. */
  plotKey: string;
  width: number;
  rightMargin: number;
  timeGrid?: TimeGrid;
}): { plot?: PlotArea; handlePlot: (next: PlotArea) => void } {
  const [calibrated, setCalibrated] = useState<{
    key: string;
    plot: PlotArea;
    rightMargin: number;
    width: number;
  }>();
  const plot = useMemo(() => {
    if (!calibrated || calibrated.key !== plotKey) return undefined;
    const widthDelta = width - calibrated.width;
    const marginDelta = rightMargin - calibrated.rightMargin;
    if ((widthDelta === 0 && marginDelta === 0) || !timeGrid) return calibrated.plot;
    return {
      ...calibrated.plot,
      colWidth: calibrated.plot.colWidth + (widthDelta - marginDelta) / timeGrid.bins,
    };
  }, [calibrated, plotKey, rightMargin, width, timeGrid]);
  const handlePlot = useCallback(
    (next: PlotArea) =>
      setCalibrated((previous) =>
        previous?.key === plotKey &&
        previous.rightMargin === rightMargin &&
        previous.width === width &&
        isSamePlot(previous.plot, next)
          ? previous
          : { key: plotKey, plot: next, rightMargin, width }
      ),
    [plotKey, rightMargin, width]
  );
  return { plot, handlePlot };
}
