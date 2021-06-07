/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { combineLatest, Observable, timer, of } from 'rxjs';
import { map, catchError, filter, mergeMap, tap } from 'rxjs/operators';
import { i18n } from '@kbn/i18n';
import { FetchResult, NewsfeedPluginBrowserConfig } from '../types';
import { NewsfeedApiDriver } from './driver';
import { NewsfeedStorage } from './storage';

export enum NewsfeedApiEndpoint {
  KIBANA = 'kibana',
  KIBANA_ANALYTICS = 'kibana-analytics',
  SECURITY_SOLUTION = 'security-solution',
  OBSERVABILITY = 'observability',
}

export interface NewsfeedApi {
  /**
   * The current fetch results
   */
  fetchResults$: Observable<void | null | FetchResult>;

  /**
   * Mark the given items as read.
   * Will refresh the `hasNew` value of the emitted FetchResult accordingly
   */
  markAsRead(itemHashes: string[]): void;
}

/*
 * Creates an Observable to newsfeed items, powered by the main interval
 * Computes hasNew value from new item hashes saved in localStorage
 */
export function getApi(
  config: NewsfeedPluginBrowserConfig,
  kibanaVersion: string,
  newsfeedId: string
): NewsfeedApi {
  const userLanguage = i18n.getLocale();
  const fetchInterval = config.fetchInterval.asMilliseconds();
  const mainInterval = config.mainInterval.asMilliseconds();
  const storage = new NewsfeedStorage(newsfeedId);
  const driver = new NewsfeedApiDriver(kibanaVersion, userLanguage, fetchInterval, storage);

  const results$ = timer(0, mainInterval).pipe(
    filter(() => driver.shouldFetch()),
    mergeMap(() =>
      driver.fetchNewsfeedItems(config.service).pipe(
        catchError((err) => {
          window.console.error(err);
          return of({
            error: err,
            kibanaVersion,
            hasNew: false,
            feedItems: [],
          });
        })
      )
    ),
    tap(() => storage.setLastFetchTime(new Date()))
  );

  const merged$ = combineLatest([results$, storage.isAnyUnread$()]).pipe(
    map(([results, isAnyUnread]) => {
      return {
        ...results,
        hasNew: results.error ? false : isAnyUnread,
      };
    })
  );

  return {
    fetchResults$: merged$,
    markAsRead: (itemHashes) => {
      storage.markItemsAsRead(itemHashes);
    },
  };
}
