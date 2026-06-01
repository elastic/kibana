/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { WORKFLOWS_EVENTS_TRACK_TOTAL_HITS_CAP } from '@kbn/workflows';
import {
  isWorkflowsEventsTotalHitsCapped,
  resolveWorkflowsEventsHasMoreHits,
} from './trigger_event_search_totals';

describe('trigger_event_search_totals', () => {
  describe('isWorkflowsEventsTotalHitsCapped', () => {
    it('returns false below the cap', () => {
      expect(isWorkflowsEventsTotalHitsCapped(9999)).toBe(false);
    });

    it('returns true at the cap', () => {
      expect(isWorkflowsEventsTotalHitsCapped(WORKFLOWS_EVENTS_TRACK_TOTAL_HITS_CAP)).toBe(true);
    });
  });

  describe('resolveWorkflowsEventsHasMoreHits', () => {
    const pageSize = 50;

    it('uses exact totals when below the cap', () => {
      expect(
        resolveWorkflowsEventsHasMoreHits({
          totalHits: 120,
          accumulatedHitsLength: 50,
          currentPageHitsLength: 50,
          pageSize,
        })
      ).toBe(true);

      expect(
        resolveWorkflowsEventsHasMoreHits({
          totalHits: 120,
          accumulatedHitsLength: 120,
          currentPageHitsLength: 20,
          pageSize,
        })
      ).toBe(false);
    });

    it('keeps load-more available at the cap while the latest page is full', () => {
      expect(
        resolveWorkflowsEventsHasMoreHits({
          totalHits: WORKFLOWS_EVENTS_TRACK_TOTAL_HITS_CAP,
          accumulatedHitsLength: 9950,
          currentPageHitsLength: pageSize,
          pageSize,
        })
      ).toBe(true);
    });

    it('stops load-more at the cap when the latest page is short', () => {
      expect(
        resolveWorkflowsEventsHasMoreHits({
          totalHits: WORKFLOWS_EVENTS_TRACK_TOTAL_HITS_CAP,
          accumulatedHitsLength: 9980,
          currentPageHitsLength: 20,
          pageSize,
        })
      ).toBe(false);
    });

    it('never loads beyond the grid cap', () => {
      expect(
        resolveWorkflowsEventsHasMoreHits({
          totalHits: WORKFLOWS_EVENTS_TRACK_TOTAL_HITS_CAP,
          accumulatedHitsLength: WORKFLOWS_EVENTS_TRACK_TOTAL_HITS_CAP,
          currentPageHitsLength: pageSize,
          pageSize,
        })
      ).toBe(false);
    });
  });
});
