/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable, Subscription } from 'rxjs';
import { distinctUntilChanged, pairwise, takeUntil, map, startWith } from 'rxjs';
import { type ServiceStatus, ServiceStatusLevels } from '@kbn/core-status-common';
import type { Logger } from '@kbn/logging';

interface LogOverallStatusChangesParams {
  logger: Logger;
  overall$: Observable<ServiceStatus>;
  stop$: Observable<void>;
}

export const logOverallStatusChanges = ({
  logger,
  overall$,
  stop$,
}: LogOverallStatusChangesParams): Subscription => {
  return overall$
    .pipe(
      takeUntil(stop$),
      distinctUntilChanged((previous, next) => {
        return previous.level.toString() === next.level.toString();
      }),
      startWith(undefined),
      pairwise(),
      map(([oldStatus, newStatus]) => {
        const oldStatusMessage = oldStatus ? ` (was ${oldStatus!.level.toString()})` : '';
        const reason =
          newStatus?.level !== ServiceStatusLevels.available && newStatus?.summary
            ? `: ${newStatus?.summary}`
            : '';
        return {
          message: `Kibana is now ${newStatus!.level.toString()}${oldStatusMessage}${reason}`,
          level: newStatus?.level,
        };
      })
    )
    .subscribe(({ message, level }) => {
      switch (level) {
        case ServiceStatusLevels.available:
          logger.info(message);
          break;
        case ServiceStatusLevels.degraded:
          logger.warn(message);
          break;
        default:
          logger.error(message);
      }
    });
};
