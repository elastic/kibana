/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import * as Rx from 'rxjs';
import moment from 'moment';
import { i18n } from '@kbn/i18n';
import { catchError, filter, mergeMap, tap } from 'rxjs/operators';
import { HttpServiceBase } from 'src/core/public';
import { ApiItem, NewsfeedItem, FetchResult } from '../../types';

const DEFAULT_LANGUAGE = 'en';
const NEWSFEED_MAIN_INTERVAL = 120000; // A main interval to check for need to refresh (2min)
const NEWSFEED_FETCH_INTERVAL = moment.duration(1, 'day'); // how often to actually fetch the API
const NEWSFEED_LAST_FETCH_STORAGE_KEY = 'newsfeed.lastfetchtime';
const NEWSFEED_HASH_SET_STORAGE_KEY = 'newsfeed.hashes';
const NEWSFEED_SERVICE_PATH_TEMPLATE = '/kibana/v{VERSION}.json';

class NewsfeedApiDriver {
  private readonly userLanguage: string;

  constructor(private readonly kibanaVersion: string, userLanguage: string) {
    this.userLanguage = userLanguage || DEFAULT_LANGUAGE;
  }

  shouldFetch(): boolean {
    const lastFetch: string | null = sessionStorage.getItem(NEWSFEED_LAST_FETCH_STORAGE_KEY);
    if (lastFetch == null) {
      return true;
    }
    const last = moment(lastFetch, 'x'); // parse as unix ms timestamp
    const now = moment();
    const duration = moment.duration(now.diff(last));

    return duration > NEWSFEED_FETCH_INTERVAL;
  }

  updateLastFetch() {
    sessionStorage.setItem(NEWSFEED_LAST_FETCH_STORAGE_KEY, Date.now().toString());
  }

  updateHashes(items: ApiItem[]): { previous: string[]; current: string[] } {
    // combine localStorage hashes with new hashes
    const hashSet: string | null = localStorage.getItem(NEWSFEED_HASH_SET_STORAGE_KEY);
    let oldHashes: string[] = [];
    if (hashSet != null) {
      oldHashes = hashSet.split(',');
    }
    const newHashes = items.map(i => i.hash.slice(0, 10));
    const updatedHashes = [...new Set(oldHashes.concat(newHashes))];
    localStorage.setItem(NEWSFEED_HASH_SET_STORAGE_KEY, updatedHashes.join(','));

    return { previous: oldHashes, current: updatedHashes };
  }

  fetchNewsfeedItems(http: HttpServiceBase, urlRoot: string): Rx.Observable<ApiItem[] | null> {
    const urlPath = NEWSFEED_SERVICE_PATH_TEMPLATE.replace('{VERSION}', this.kibanaVersion);
    const fullUrl = urlRoot + urlPath;

    return Rx.from(
      http
        .fetch(fullUrl, {
          method: 'GET',
        })
        .then(({ items }) => items)
    ).pipe(
      catchError(err => {
        window.console.error(err);
        return Rx.of(null);
      })
    );
  }

  validateItem(item: Partial<NewsfeedItem>) {
    if ([item.title, item.description, item.linkText, item.linkUrl].includes(undefined)) {
      return false;
    }
    return true;
  }

  modelItems(items: ApiItem[]): Rx.Observable<FetchResult> {
    // calculate hasNew
    const { previous, current } = this.updateHashes(items);
    const hasNew = current.length > previous.length;

    // build feedItems
    const userLanguage = this.userLanguage;
    const feedItems: NewsfeedItem[] = items.reduce((accum: NewsfeedItem[], it: ApiItem) => {
      const {
        expire_on: expireOn,
        languages,
        title,
        description,
        link_text: linkText,
        link_url: linkUrl,
        badge,
        publish_on: publishOn,
      } = it;

      if (moment(expireOn).isBefore(Date.now())) {
        return accum; // ignore item if expired
      }

      if (languages && !languages.includes(userLanguage)) {
        return accum; // ignore language mismatch
      }

      const tempItem: NewsfeedItem = {
        title: title[userLanguage],
        description: description[userLanguage],
        linkText: linkText[userLanguage],
        linkUrl: linkUrl[userLanguage],
        badge: badge != null ? badge![userLanguage] : badge,
        publishOn: moment(publishOn),
      };

      if (!this.validateItem(tempItem)) {
        return accum; // ignore if title, description, etc is missing
      }

      return [...accum, tempItem];
    }, []);

    return Rx.of({
      kibanaVersion: this.kibanaVersion,
      hasNew,
      feedItems,
    });
  }
}

/*
 * Creates an Observable to newsfeed items, powered by the main interval
 * Computes hasNew value from new item hashes saved in localStorage
 */
export function getApi(
  http: HttpServiceBase,
  urlRoot: string,
  kibanaVersion: string
): Rx.Observable<void | FetchResult> {
  const userLanguage = i18n.getLocale();
  const driver = new NewsfeedApiDriver(kibanaVersion, userLanguage);
  return Rx.timer(0, NEWSFEED_MAIN_INTERVAL).pipe(
    filter(() => driver.shouldFetch()),
    mergeMap(() => driver.fetchNewsfeedItems(http, urlRoot)),
    filter(items => items != null && items.length > 0),
    tap(() => driver.updateLastFetch()),
    mergeMap(items => driver.modelItems(items!))
  );
}
