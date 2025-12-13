/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import deepEqual from 'fast-deep-equal';
import { combineCompatibleChildrenApis } from '@kbn/presentation-containers';
import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import type { AppliesTimeslice } from '@kbn/presentation-publishing';
import { apiAppliesTimeslice, type PublishingSubject } from '@kbn/presentation-publishing';
import { BehaviorSubject, combineLatestWith, filter } from 'rxjs';
import type { TimeSlice } from '@kbn/controls-schemas';
import type { initializeSettingsManager } from './settings_manager';

export const initializeTimesliceManager = (
  children$: PublishingSubject<{ [key: string]: DefaultEmbeddableApi }>,
  settingsManager: ReturnType<typeof initializeSettingsManager>
) => {
  const unpublishedTimeslice$ = new BehaviorSubject<TimeSlice | undefined>(undefined);

  const timeslice$ = new BehaviorSubject<TimeSlice | undefined>(undefined);
  const publishTimeslice = () => {
    if (!deepEqual(unpublishedTimeslice$.value, timeslice$.value))
      timeslice$.next(unpublishedTimeslice$.value);
  };

  const childrenTimesliceSubscription = combineCompatibleChildrenApis<
    AppliesTimeslice,
    TimeSlice | undefined
  >(
    { children$ },
    'appliedTimeslice$',
    apiAppliesTimeslice,
    undefined, // flatten method
    (values) => {
      // dashboard should never allow multiple timeslider controls
      // return last timeslider control value
      return values.length === 0 ? undefined : values[values.length - 1];
    }
  ).subscribe((newTimeslice) => {
    // Guard against children that publish an empty timeslice
    const [from, to] = newTimeslice ?? [];
    if (typeof from !== 'number' || typeof to !== 'number') unpublishedTimeslice$.next(undefined);
    else unpublishedTimeslice$.next(newTimeslice);
  });

  const autoPublishTimesliceSubscription = unpublishedTimeslice$
    .pipe(
      combineLatestWith(settingsManager.api.settings.autoApplyFilters$),
      filter(
        ([unpublishedTimeslice, autoApplyFilters]) => !unpublishedTimeslice || autoApplyFilters
      )
    )
    .subscribe(() => {
      publishTimeslice();
    });

  return {
    api: { timeslice$, publishedTimeslice$: timeslice$, unpublishedTimeslice$, publishTimeslice },
    cleanup: () => {
      childrenTimesliceSubscription.unsubscribe();
      autoPublishTimesliceSubscription.unsubscribe();
    },
  };
};
