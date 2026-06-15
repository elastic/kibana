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
  const { profileSpecificColumns } = pageObjects.tracesExperience.grid;

  // Wait for every profile-specific column to be applied. Waiting for only the
  // first column risks moving on while the remaining columns are still being
  // swapped in.
  for (const column of profileSpecificColumns) {
    await expect(pageObjects.discover.getColumnHeader(column)).toBeVisible({
      timeout: 30_000,
    });
  }

  // The traces profile + APM init trigger more than one documents fetch, so
  // data-render-complete legitimately flips back to false at unpredictable
  // times. Wait for the search indicator to settle instead of a 2s-stable
  // attribute (see #261438).
  await pageObjects.discover.waitUntilSearchingHasFinished();
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
