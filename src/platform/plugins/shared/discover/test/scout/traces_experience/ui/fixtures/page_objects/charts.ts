/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Locator, ScoutPage } from '@kbn/scout';

const RED_METRICS_CHART_TITLES = ['Latency', 'Error Rate', 'Throughput'];

export interface TracesCharts {
  readonly redMetricsCharts: Locator;
  readonly legendItems: Locator;
  readonly expectedTitles: readonly string[];
  getChartTitle(title: string): Locator;
  getChartError(title: string): Locator;
  readonly latencyMapToggle: Locator;
  readonly healthMetricsToggle: Locator;
  readonly latencyMap: Locator;
  readonly latencyMapLayer: Locator;
  readonly latencyMapLegend: Locator;
  readonly latencyMapSelectionBar: Locator;
  readonly latencyMapClearSelection: Locator;
  /** Waits until the map has drawn its cells and takes pointer input. */
  waitForLatencyMapReady(): Promise<void>;
  /** Draws a selection by dragging between two fractions of the map's plot area. */
  dragLatencyMapSelection(
    from?: { x: number; y: number },
    to?: { x: number; y: number }
  ): Promise<void>;
  /** Clicks one cell of the map, at a fraction of the plot area. */
  clickLatencyMapCell(at?: { x: number; y: number }): Promise<void>;
}

export function createTracesCharts(page: ScoutPage): TracesCharts {
  const redMetricsCharts = page.testSubj.locator('metricsExperienceGrid');
  const latencyMapLayer = page.testSubj.locator('traceLatencyMapLayer');

  const layerPoint = async (fraction: { x: number; y: number }) => {
    const box = await latencyMapLayer.boundingBox();
    if (!box) throw new Error('The latency map layer is not visible');
    return { x: box.x + box.width * fraction.x, y: box.y + box.height * fraction.y };
  };

  return {
    redMetricsCharts,
    legendItems: redMetricsCharts.locator('[data-testid="echLegendItemLabel"]'),
    expectedTitles: RED_METRICS_CHART_TITLES,
    getChartTitle: (title: string): Locator => redMetricsCharts.getByText(title),
    getChartError: (title: string): Locator => {
      const headingTestSubj = `embeddablePanelHeading-${title.replace(/\s/g, '')}`;
      return redMetricsCharts
        .locator('[data-test-subj="embeddablePanel"]')
        .filter({ has: page.testSubj.locator(headingTestSubj) })
        .locator('[data-test-subj="embeddable-lens-failure"]');
    },
    latencyMapToggle: page.testSubj.locator('tracesLatencyMapToggle'),
    healthMetricsToggle: page.testSubj.locator('tracesHealthMetricsToggle'),
    latencyMap: page.testSubj.locator('traceLatencyMap'),
    latencyMapLayer,
    latencyMapLegend: page.testSubj.locator('traceLatencyMapLegend'),
    latencyMapSelectionBar: page.testSubj.locator('traceLatencyMapSelectionBar'),
    latencyMapClearSelection: page.testSubj.locator('traceLatencyMapClearSelection'),
    waitForLatencyMapReady: async () => {
      await latencyMapLayer.waitFor({ state: 'visible' });
      await page.testSubj.locator('traceLatencyMapLoading').waitFor({ state: 'hidden' });
    },
    dragLatencyMapSelection: async (from = { x: 0.25, y: 0.25 }, to = { x: 0.75, y: 0.75 }) => {
      const start = await layerPoint(from);
      const end = await layerPoint(to);
      await page.mouse.move(start.x, start.y);
      await page.mouse.down();
      // In steps, so the overlay sees the drag grow rather than one jump.
      await page.mouse.move(end.x, end.y, { steps: 10 });
      await page.mouse.up();
    },
    clickLatencyMapCell: async (at = { x: 0.5, y: 0.5 }) => {
      const point = await layerPoint(at);
      await page.mouse.click(point.x, point.y);
    },
  };
}
