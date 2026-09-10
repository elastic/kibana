/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { combineLatest, debounceTime, map, of, switchMap } from 'rxjs';
import { type HasUniqueId, apiHasUniqueId } from '../../has_uuid';
import type { PublishingSubject } from '../../../publishing_subject';
import { apiHasSerializableState, type HasSerializableState } from '../../has_serializable_state';

/**
 * Create an observable stream of latest state from all react embeddable children
 */
export function childrenLatestState$<Api extends unknown = unknown>(
  children$: PublishingSubject<{ [key: string]: Api }>
) {
  return children$.pipe(
    map((children) => Object.keys(children)),
    // children may change, so make sure we subscribe/unsubscribe with switchMap
    switchMap((newChildIds: string[]) => {
      if (newChildIds.length === 0) return of([]);
      const childrenThatHaveSerializedState = Object.values(children$.value).filter(
        (child) => apiHasSerializableState(child) && apiHasUniqueId(child)
      ) as Array<HasSerializableState & HasUniqueId>;

      return childrenThatHaveSerializedState.length === 0
        ? of([])
        : combineLatest(
            childrenThatHaveSerializedState.map((child) =>
              child.latestState$.pipe(
                map((latestState) => ({
                  uuid: child.uuid,
                  latestState,
                }))
              )
            )
          );
    }),
    debounceTime(0) // batch all children updates
  );
}
