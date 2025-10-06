/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';
import { scan, filter, map } from 'rxjs';
import type { NodesVersionCompatibility } from './version_check/ensure_es_version';

// Emit only after threhold consecutive failures
/**
 * passes through compatible statuses immediately
 * but requires threshold consecutive incompatible statuses before emitting them,
 * which prevents status flapping from intermittent failures.
 * @param threshold
 * @returns
 */
export function bufferStatusFlapping(
  threshold: number = 3
): (source$: Observable<NodesVersionCompatibility>) => Observable<NodesVersionCompatibility> {
  return (source$) =>
    source$.pipe(
      scan(
        (state, current) => ({
          count: !current.isCompatible ? state.count + 1 : 0,
          status: current,
        }),
        { count: 0, status: {} as NodesVersionCompatibility }
      ),
      // only emit compatable statuses or after threshold consecutive failures
      filter((state) => state.status.isCompatible || state.count >= threshold),
      map((state) => state.status)
    );
}
