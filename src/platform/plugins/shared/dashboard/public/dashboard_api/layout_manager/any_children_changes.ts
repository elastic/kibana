/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HasSerializableState, PublishingSubject } from '@kbn/presentation-publishing';
import { apiHasSerializableState } from '@kbn/presentation-publishing';
import { map, merge, of, switchMap } from 'rxjs';

/**
 *  Create an observable stream of any children changes
 */
export function anyChildrenChanges$<Api extends unknown = unknown>(
  children$: PublishingSubject<{ [key: string]: Api }>
) {
  return children$.pipe(
    map((children) => Object.keys(children)),
    // children may change, so make sure we subscribe/unsubscribe with switchMap
    switchMap((newChildIds: string[]) => {
      if (newChildIds.length === 0) return of();
      const childrenThatPublishChanges = Object.values(children$.value).filter((child) =>
        apiHasSerializableState(child)
      ) as Array<HasSerializableState>;

      return childrenThatPublishChanges.length === 0
        ? of()
        : merge(...childrenThatPublishChanges.map((child) => child.anyStateChange$));
    }),
  );
}
