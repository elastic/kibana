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

/**
 * Waits for the traces data-source profile to have engaged before assertions
 * on profile-driven UI run. Adds a 30s timeout to the visibility check to
 * make sure the trace profile is properly applied.
 */
async function waitForTracesProfileApplied(
  pageObjects: PageObjects & { tracesExperience: TracesExperiencePage }
) {
  await pageObjects.discover.waitForDocTableRendered();
  const [firstProfileSpecificColumn] = pageObjects.tracesExperience.grid.profileSpecificColumns;

  await expect(pageObjects.discover.getColumnHeader(firstProfileSpecificColumn)).toBeVisible({
    timeout: 30_000,
  });
}

export async function expectTracesExperienceEnabled(
  pageObjects: PageObjects & { tracesExperience: TracesExperiencePage },
  shouldCheckForREDMetricsCharts: boolean = true
) {
  await waitForTracesProfileApplied(pageObjects);

  for (const column of pageObjects.tracesExperience.grid.expectedColumns) {
    await expect(pageObjects.discover.getColumnHeader(column)).toBeVisible();
  }

  if (shouldCheckForREDMetricsCharts) {
    await expect(pageObjects.tracesExperience.charts.redMetricsCharts).toBeVisible();
  }
}
