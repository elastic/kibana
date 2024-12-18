/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { catchError, from, Observable, of } from 'rxjs';
import { mergeMap, last, map, toArray } from 'rxjs';
import type { RuntimeField, RuntimeFieldSpec, RuntimePrimitiveTypes } from '../types';

export const removeFieldAttrs = (runtimeField: RuntimeField): RuntimeFieldSpec => {
  const { type, script, fields } = runtimeField;
  const fieldsTypeOnly = fields && {
    fields: Object.entries(fields).reduce((col, [fieldName, field]) => {
      col[fieldName] = { type: field.type };
      return col;
    }, {} as Record<string, { type: RuntimePrimitiveTypes }>),
  };

  return {
    type,
    script,
    ...fieldsTypeOnly,
  };
};

const MAX_CONCURRENT_REQUESTS = 3;
/**
 * Helper function to run forkJoin
 * with restrictions on how many input observables can be subscribed to concurrently
 */
export function rateLimitingForkJoin<T>(
  observables: Array<Observable<T>>,
  maxConcurrentRequests = MAX_CONCURRENT_REQUESTS,
  failValue: T
): Observable<T[]> {
  return from(observables).pipe(
    mergeMap(
      (observable, index) =>
        observable.pipe(
          last(),
          map((value) => ({ index, value })),
          catchError(() => of({ index, value: failValue }))
        ),
      maxConcurrentRequests
    ),
    toArray(),
    map((indexedObservables) =>
      indexedObservables.sort((l, r) => l.index - r.index).map((obs) => obs.value)
    )
  );
}
