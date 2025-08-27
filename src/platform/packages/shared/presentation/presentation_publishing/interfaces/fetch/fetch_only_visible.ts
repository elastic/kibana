/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';
import { Subject, combineLatestWith, map, of } from 'rxjs';
import type { PublishesPauseFetch } from '../..';

export type FetchSetting = 'onlyVisible' | 'always';

/**
 * Parent APIs can publish a fetch setting that determines when child components should fetch data.
 */
export interface PublishesFetchSetting {
  fetchSetting$: Observable<FetchSetting>;
}

export const apiPublishesFetchSetting = (
  unknownApi?: unknown
): unknownApi is PublishesFetchSetting => {
  return Boolean(unknownApi && (unknownApi as PublishesFetchSetting)?.fetchSetting$ !== undefined);
};

interface PublishesIsVisible {
  isVisible$: Subject<boolean>;
}

const apiPublishesIsVisible = (unknownApi?: unknown): unknownApi is PublishesIsVisible => {
  return Boolean(unknownApi && (unknownApi as PublishesIsVisible)?.isVisible$ !== undefined);
};

export const onVisibilityChange = (api: unknown, isVisible: boolean) => {
  if (apiPublishesIsVisible(api)) api.isVisible$.next(isVisible);
};

export const initializeVisibility = (
  parentApi: unknown
): PublishesPauseFetch & PublishesIsVisible => {
  const isVisible$ = new Subject<boolean>();
  const parentFetchSetting$ = apiPublishesFetchSetting(parentApi)
    ? parentApi.fetchSetting$
    : of('always' as FetchSetting);

  const isFetchPaused$ = parentFetchSetting$.pipe(
    combineLatestWith(isVisible$),
    map(([parentFetchSetting, isVisible]) => {
      if (parentFetchSetting === 'onlyVisible') return !isVisible;
      return false; // If the fetch setting is 'always', we do not pause the fetch
    })
  );
  return {
    isVisible$,
    isFetchPaused$,
  };
};
