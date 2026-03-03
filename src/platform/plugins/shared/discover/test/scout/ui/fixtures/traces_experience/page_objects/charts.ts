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
  readonly expectedTitles: readonly string[];
  getChartTitle(title: string): Locator;
}

export function createTracesCharts(page: ScoutPage): TracesCharts {
  const redMetricsCharts = page.testSubj.locator('metricsExperienceGrid');

  return {
    redMetricsCharts,
    expectedTitles: RED_METRICS_CHART_TITLES,
    getChartTitle: (title: string): Locator => redMetricsCharts.getByText(title),
  };
}
