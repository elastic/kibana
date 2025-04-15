/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { concatAll, map, type Observable, type Subject, takeUntil, bufferTime } from 'rxjs';
import type { LoggableServiceStatus } from './types';

export interface CreateLogThrottledBufferOptions<LoggableStatus extends LoggableServiceStatus> {
  buffer$: Subject<LoggableStatus>;
  stop$: Observable<void>;
  bufferTimeMillis?: number;
  maxThrottledMessages: number;
}

export function createLogThrottledBuffer<LoggableStatus extends LoggableServiceStatus>({
  buffer$,
  stop$,
  maxThrottledMessages,
  bufferTimeMillis = 1_000,
}: CreateLogThrottledBufferOptions<LoggableStatus>): Observable<LoggableStatus | string> {
  const throttled$: Observable<LoggableStatus | string> = buffer$.asObservable().pipe(
    takeUntil(stop$),
    bufferTime(bufferTimeMillis),
    map((statuses) => {
      const aggregated = // aggregate repeated messages, and count nbr. of repetitions
        statuses.filter((candidateStatus, index) => {
          const firstMessageIndex = statuses.findIndex(
            (status) =>
              candidateStatus.name === status.name &&
              candidateStatus.level === status.level &&
              candidateStatus.summary === status.summary
          );
          if (index !== firstMessageIndex) {
            // this is not the first time this message is logged, increase 'repeats' counter for the first occurrence
            statuses[firstMessageIndex].repeats = (statuses[firstMessageIndex].repeats ?? 1) + 1;
            return false;
          } else {
            // this is the first time this message is logged, let it through
            return true;
          }
        });

      if (aggregated.length > maxThrottledMessages) {
        const list: string = [
          ...new Set(aggregated.slice(maxThrottledMessages).map(({ name }) => name)),
        ].join(', ');

        return [
          ...aggregated.slice(0, maxThrottledMessages),
          `${
            aggregated.length - maxThrottledMessages
          } other status updates from [${list}] have been truncated to avoid flooding the logs`,
        ];
      } else {
        return aggregated;
      }
    }),
    concatAll()
  );

  return throttled$;
}
