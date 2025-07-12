/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { combineLatest, map, pairwise, startWith, switchMap, skipWhile, of } from 'rxjs';

import { PresentationContainer } from '@kbn/presentation-containers';
import {
  PublishesPhaseEvents,
  apiPublishesPhaseEvents,
  apiPublishesSavedObjectId,
} from '@kbn/presentation-publishing';
import { takePreviewScreenshot } from '@kbn/preview-screenshots';

export function startPreviewScreenshotting(
  dashboard: PresentationContainer,
  savedObjectId: string
) {
  return dashboard.children$
    .pipe(
      skipWhile((children) => {
        // Don't track render-status when the dashboard is still adding embeddables.
        return Object.values(children).length !== dashboard.getPanelCount();
      }),
      map((children) => {
        // Filter for embeddables which publish phase events
        const childPhaseEventTrackers: PublishesPhaseEvents[] = [];
        const values = Object.values(children);

        for (const child of values) {
          if (apiPublishesPhaseEvents(child)) {
            childPhaseEventTrackers.push(child);
          }
        }
        return childPhaseEventTrackers;
      }),
      switchMap((children) => {
        if (children.length === 0) {
          return of([]); // map to empty stream
        }
        // Map to new stream of phase-events for each embeddable
        return combineLatest(children.map((child) => child.phase$));
      }),
      map((latestPhaseEvents) => {
        // Map individual render-state of panels to global render-state.
        return latestPhaseEvents.some((phaseEvent) => {
          return phaseEvent && phaseEvent.status !== 'rendered';
        });
      }),
      startWith(false),
      pairwise()
    )
    .subscribe(async ([wasDashboardStillLoading, isDashboardStillLoading]: [boolean, boolean]) => {
      const panelCount = dashboard.getPanelCount();
      const queryHasFinished = wasDashboardStillLoading && !isDashboardStillLoading;

      if (panelCount === 0 || queryHasFinished) {
        /**
         * we consider the Dashboard creation to be finished when all the panels are loaded.
         */
        await takePreviewScreenshot({
          savedObjectId,
        });

        // Augment logic to check for saved object ID and call takePreviewScreenshot in parallel
        const screenshotPromises = Object.values(dashboard.children$.value).map(async (child) => {
          if (apiPublishesSavedObjectId(child)) {
            const childSavedObjectId = child.savedObjectId$.value;
            if (childSavedObjectId) {
              return takePreviewScreenshot({
                savedObjectId: childSavedObjectId,
                querySelector: `[data-preview-screenshot="${childSavedObjectId}"]`,
              });
            }
          }
        });

        await Promise.all(screenshotPromises);
      }
    });
}
