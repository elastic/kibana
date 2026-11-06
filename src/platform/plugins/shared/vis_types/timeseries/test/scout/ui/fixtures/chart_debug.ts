/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DebugState } from '@elastic/charts';

/** `[x, y]` pair as asserted by the TSVB chart data specs. */
export type ChartDataPoint = [number, number];

/**
 * Every editor change makes TSVB re-query Elasticsearch and re-render, and the
 * debug state is only refreshed once that completes, so assertions on it need a
 * longer window than the `expect.poll` default.
 */
export const CHART_POLL_OPTIONS = { timeout: 30_000 };

export type AnnotationData = NonNullable<DebugState['annotations']>[number]['data'];

interface ElasticChartDebugContext {
  addInitScript: (script: () => void) => Promise<{ dispose: () => Promise<void> }>;
}

/**
 * Enables the `@elastic/charts` debug state for every page loaded in this browser
 * context. Must run before navigation: the flag is read while the chart mounts.
 */
export const enableElasticChartDebug = async (context: ElasticChartDebugContext): Promise<void> => {
  await context.addInitScript(() => {
    (window as unknown as { _echDebugStateFlag?: boolean })._echDebugStateFlag = true;
  });
};

export const getAreasCount = (debugState: DebugState): number => debugState.areas?.length ?? 0;

export const getBarsCount = (debugState: DebugState): number => debugState.bars?.length ?? 0;

export const getLegendNames = (debugState: DebugState): string[] =>
  debugState.legend?.items.map(({ name }) => name) ?? [];

export const getAreaChartColors = (debugState: DebugState): string[] =>
  debugState.areas?.map(({ color }) => color) ?? [];

export const getXAxisTitle = (debugState: DebugState, nth = 0): string | undefined =>
  debugState.axes?.x[nth]?.title;

export const getAreaChartData = (debugState: DebugState, nth = 0): ChartDataPoint[] =>
  [...(debugState.areas?.[nth]?.lines.y1.points ?? [])]
    .sort((a, b) => a.x - b.x)
    .map(({ x, y }) => [x, y] as ChartDataPoint);

export const getAnnotationsData = (debugState: DebugState): AnnotationData[] =>
  debugState.annotations?.map(({ data }) => data) ?? [];
