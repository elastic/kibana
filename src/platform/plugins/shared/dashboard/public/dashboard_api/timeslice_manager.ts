/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { combineCompatibleChildrenApis } from '@kbn/presentation-containers';
import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import {
  apiPublishesTimeslice,
  type PublishesTimeslice,
  type PublishingSubject,
} from '@kbn/presentation-publishing';
import { BehaviorSubject } from 'rxjs';

type Timeslice = [number, number] | undefined;
export const initializeTimesliceManager = (
  children$: PublishingSubject<{ [key: string]: DefaultEmbeddableApi }>
) => {
  const timeslice$ = new BehaviorSubject<Timeslice>(undefined);
  const childrenTimesliceSubscription = combineCompatibleChildrenApis<
    PublishesTimeslice,
    Timeslice
  >({ children$ }, 'timeslice$', apiPublishesTimeslice, undefined).subscribe((newTimeslice) => {
    timeslice$.next(newTimeslice);
  });

  return {
    api: { timeslice$ },
    cleanup: () => {
      childrenTimesliceSubscription.unsubscribe();
    },
  };
};
