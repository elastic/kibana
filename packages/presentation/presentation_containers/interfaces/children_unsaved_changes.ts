/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { combineLatest, debounceTime, distinctUntilChanged, map, of, switchMap } from 'rxjs';
import deepEqual from 'fast-deep-equal';
import { PublishingSubject } from "@kbn/presentation-publishing/publishing_subject";
import { apiPublishesUnsavedChanges, PublishesUnsavedChanges } from '@kbn/presentation-publishing';
import { PresentationContainer } from './presentation_container';

/**
 *  Create an observable stream of unsaved changes from all react embeddable children
 */
export function childrenUnsavedChanges$(children$: PresentationContainer['children$']) {
  return children$.pipe(
    map((children) => Object.keys(children)),
    distinctUntilChanged(deepEqual),
  
    // children may change, so make sure we subscribe/unsubscribe with switchMap
    switchMap((newChildIds: string[]) => {
      if (newChildIds.length === 0) return of([]);
      const childrenThatPublishUnsavedChanges = Object.entries(children$.value).filter(
        ([childId, child]) => apiPublishesUnsavedChanges(child)
      ) as Array<[string, PublishesUnsavedChanges]>;
  
      if (childrenThatPublishUnsavedChanges.length === 0) return of([]);
  
      return combineLatest(
        childrenThatPublishUnsavedChanges.map(([childId, child]) =>
          child.unsavedChanges.pipe(map((unsavedChanges) => ({ childId, unsavedChanges })))
        )
      );
    }),
    debounceTime(100),
    map((children) => children.filter((child) => Boolean(child.unsavedChanges)))
  );
}