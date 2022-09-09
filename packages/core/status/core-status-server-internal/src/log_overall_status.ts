/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Observable } from 'rxjs';
import { distinctUntilChanged, pairwise, startWith, takeUntil, map } from 'rxjs/operators';
import type { ServiceStatus } from '@kbn/core-status-common';

export const getOverallStatusChanges = (
  overall$: Observable<ServiceStatus>,
  stop$: Observable<void>
) => {
  return overall$.pipe(
    takeUntil(stop$),
    distinctUntilChanged((previous, next) => {
      return previous.level.toString() === next.level.toString();
    }),
    startWith(undefined),
    pairwise(),
    map(([oldStatus, newStatus]) => {
      if (oldStatus) {
        return `Kibana is now ${newStatus!.level.toString()} (was ${oldStatus!.level.toString()})`;
      }
      return `Kibana is now ${newStatus!.level.toString()}`;
    })
  );
};
