/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { WORKFLOWS_EVENTS_TRACK_TOTAL_HITS_CAP } from '@kbn/workflows';

export function isWorkflowsEventsTotalHitsCapped(totalHits: number): boolean {
  return totalHits >= WORKFLOWS_EVENTS_TRACK_TOTAL_HITS_CAP;
}

export interface ResolveWorkflowsEventsHasMoreHitsParams {
  totalHits: number;
  accumulatedHitsLength: number;
  currentPageHitsLength: number;
  pageSize: number;
}

/**
 * When the API total hits the ES track_total_hits cap, `total` is a lower bound. Keep offering
 * load-more while under the cap and the latest page was full; stop on a short page.
 */
export function resolveWorkflowsEventsHasMoreHits(
  params: ResolveWorkflowsEventsHasMoreHitsParams
): boolean {
  const { totalHits, accumulatedHitsLength, currentPageHitsLength, pageSize } = params;

  if (accumulatedHitsLength >= WORKFLOWS_EVENTS_TRACK_TOTAL_HITS_CAP) {
    return false;
  }

  if (!isWorkflowsEventsTotalHitsCapped(totalHits)) {
    return accumulatedHitsLength < totalHits;
  }

  if (currentPageHitsLength < pageSize) {
    return false;
  }

  return accumulatedHitsLength < WORKFLOWS_EVENTS_TRACK_TOTAL_HITS_CAP;
}
