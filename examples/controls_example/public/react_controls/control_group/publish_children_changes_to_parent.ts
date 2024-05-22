/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PresentationContainer } from '@kbn/presentation-containers';
import { BehaviorSubject, combineLatest, isObservable, map, of, switchMap } from 'rxjs';

export const publishChildrenChangesToParent = <CompatibleApiType, PublishingSubjectType>(
  parentApi: PresentationContainer & CompatibleApiType,
  subscriptionKey: keyof CompatibleApiType,
  isCompatible: (api: unknown) => api is CompatibleApiType
) => {
  return parentApi.children$
    .pipe(
      switchMap((children) => {
        const compatibleChildren: CompatibleApiType[] = [];
        for (const child of Object.values(children)) {
          if (isCompatible(child) && isObservable(child[subscriptionKey]))
            compatibleChildren.push(child);
        }
        if (compatibleChildren.length === 0) return of([]);
        return combineLatest(
          compatibleChildren.map(
            (child) => child[subscriptionKey] as BehaviorSubject<PublishingSubjectType>
          )
        );
      }),
      map(
        (nextCompatble) =>
          nextCompatble.flat().filter((value) => Boolean(value)) as PublishingSubjectType[]
      )
    )
    .subscribe((value: PublishingSubjectType[]) => {
      (parentApi[subscriptionKey] as BehaviorSubject<PublishingSubjectType[]>).next(value);
    });
};
