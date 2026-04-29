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
import {
  type PublishesUnsavedChanges,
  apiPublishesUnsavedChanges,
} from '../../publishes_unsaved_changes';
import type { PublishingSubject } from '../../../publishing_subject';

export const DEBOUNCE_TIME = 100;

/**
 *  Create an observable stream of unsaved changes from all react embeddable children
 */
export function childrenUnsavedChanges$<Api extends unknown = unknown>(
  children$: PublishingSubject<{ [key: string]: Api }>
) {
  return children$.pipe(
    map((children) => Object.keys(children)),
    // children may change, so make sure we subscribe/unsubscribe with switchMap
    switchMap((newChildIds: string[]) => {
      if (newChildIds.length === 0) return of([]);
      const childrenThatPublishUnsavedChanges = Object.values(children$.value).filter(
        (child) => apiPublishesUnsavedChanges(child) && apiHasUniqueId(child)
      ) as Array<PublishesUnsavedChanges & HasUniqueId>;

      return childrenThatPublishUnsavedChanges.length === 0
        ? of([])
        : combineLatest(
            childrenThatPublishUnsavedChanges.map((child) =>
              child.hasUnsavedChanges$.pipe(
                map((hasUnsavedChanges) => ({ uuid: child.uuid, hasUnsavedChanges }))
              )
            )
          );
    }),
    debounceTime(DEBOUNCE_TIME)
  );
}
