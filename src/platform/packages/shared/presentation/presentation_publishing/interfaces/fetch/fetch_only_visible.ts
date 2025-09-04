/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject, skip, type Observable } from 'rxjs';
import { combineLatestWith, map } from 'rxjs';
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

export interface PublishesIsVisible {
  isVisible$: BehaviorSubject<boolean>;
}

export const apiPublishesIsVisible = (unknownApi?: unknown): unknownApi is PublishesIsVisible => {
  return Boolean(unknownApi && (unknownApi as PublishesIsVisible)?.isVisible$ !== undefined);
};

export const onVisibilityChange = (api: unknown, isVisible: boolean) => {
  if (apiPublishesIsVisible(api)) api.isVisible$.next(isVisible);
};

export const initializeVisibility = (
  parentApi: unknown
): (PublishesPauseFetch & PublishesIsVisible) | {} => {
  if (!apiPublishesFetchSetting(parentApi)) return {};

  const isVisible$ = new BehaviorSubject<boolean>(false);
  const isFetchPaused$ = parentApi.fetchSetting$.pipe(
    combineLatestWith(isVisible$.pipe(skip(1))),
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
