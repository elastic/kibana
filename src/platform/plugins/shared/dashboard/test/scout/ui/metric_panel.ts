/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DashboardApiDataInput } from '@kbn/as-code-dashboard-schema';
import type { ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

/** Lens metric panel that shows the document count of a data view */
export const createMetricPanel = (
  dataView: string
): NonNullable<DashboardApiDataInput['panels']>[number] => ({
  type: 'vis',
  grid: { x: 0, y: 0, w: 24, h: 10 },
  config: {
    type: 'metric',
    data_source: {
      type: 'data_view_spec',
      index_pattern: dataView,
      time_field: '@timestamp',
    },
    metrics: [{ type: 'primary', operation: 'count' }],
  },
});

const parseMetricValue = (text: string) => Number(text.replace(/[^\d.]/g, ''));

// Assumes the dashboard has a single metric panel with a single tile.
export const getMetricValue = (page: ScoutPage): Promise<string> =>
  page.testSubj.locator('mtrVis').locator('.echMetricText__valueBlock').innerText();

/** Waits for the metric to render a value and returns it as a number */
export const readMetricValue = async (page: ScoutPage) => {
  await expect.poll(() => getMetricValue(page)).toMatch(/\d/);
  return parseMetricValue(await getMetricValue(page));
};
