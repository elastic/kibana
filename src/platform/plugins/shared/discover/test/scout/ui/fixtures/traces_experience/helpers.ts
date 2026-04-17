/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import type { PageObjects } from '@kbn/scout';
import type { TracesExperiencePage } from './page_objects';

export async function expectTracesExperienceEnabled(
  pageObjects: PageObjects & { tracesExperience: TracesExperiencePage }
) {
  await pageObjects.discover.waitForDocTableRendered();
  for (const column of pageObjects.tracesExperience.grid.expectedColumns) {
    await expect(pageObjects.discover.getColumnHeader(column)).toBeVisible();
  }
  await expect(pageObjects.tracesExperience.charts.redMetricsCharts).toBeVisible();
}
