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
import { HttpSetup } from 'src/core/public';
import {
  NEWSFEED_FALLBACK_LANGUAGE,
  NEWSFEED_LAST_FETCH_STORAGE_KEY,
  NEWSFEED_HASH_SET_STORAGE_KEY,
} from '../../constants';
import { NewsfeedPluginInjectedConfig, ApiItem, NewsfeedItem, FetchResult } from '../../types';

type ApiConfig = NewsfeedPluginInjectedConfig['newsfeed']['service'];

export class NewsfeedApiDriver {
  private readonly loadedTime = moment().utc(); // the date is compared to time in UTC format coming from the service

  constructor(
    private readonly kibanaVersion: string,
    private readonly userLanguage: string,
    private readonly fetchInterval: number
  ) {}

  shouldFetch(): boolean {
    const lastFetchUtc: string | null = sessionStorage.getItem(NEWSFEED_LAST_FETCH_STORAGE_KEY);
    if (lastFetchUtc == null) {
      return true;
    }
    const last = moment(lastFetchUtc, 'x'); // parse as unix ms timestamp (already is UTC)

    // does the last fetch time precede the time that the page was loaded?
    if (this.loadedTime.diff(last) > 0) {
      return true;
    }

    const now = moment.utc(); // always use UTC to compare timestamps that came from the service
    const duration = moment.duration(now.diff(last));

    return duration.asMilliseconds() > this.fetchInterval;
  }

  updateLastFetch() {
    sessionStorage.setItem(NEWSFEED_LAST_FETCH_STORAGE_KEY, Date.now().toString());
  }

  updateHashes(items: NewsfeedItem[]): { previous: string[]; current: string[] } {
    // replace localStorage hashes with new hashes
    const stored: string | null = localStorage.getItem(NEWSFEED_HASH_SET_STORAGE_KEY);
    let old: string[] = [];
    if (stored != null) {
      old = stored.split(',');
    }

    const newHashes = items.map(i => i.hash);
    const updatedHashes = [...new Set(old.concat(newHashes))];
    localStorage.setItem(NEWSFEED_HASH_SET_STORAGE_KEY, updatedHashes.join(','));

    return { previous: old, current: updatedHashes };
  }

  fetchNewsfeedItems(http: HttpSetup, config: ApiConfig): Rx.Observable<FetchResult> {
    const urlPath = config.pathTemplate.replace('{VERSION}', this.kibanaVersion);
    const fullUrl = config.urlRoot + urlPath;

    return Rx.from(
      http
        .fetch(fullUrl, {
          method: 'GET',
        })
        .then(({ items }) => this.modelItems(items))
    );
  }

  validateItem(item: Partial<NewsfeedItem>) {
    const hasMissing = [
      item.title,
      item.description,
      item.linkText,
      item.linkUrl,
      item.publishOn,
      item.hash,
    ].includes(undefined);

    return !hasMissing;
  }

  modelItems(items: ApiItem[]): FetchResult {
    const feedItems: NewsfeedItem[] = items.reduce((accum: NewsfeedItem[], it: ApiItem) => {
      let chosenLanguage = this.userLanguage;
      const {
        expire_on: expireOnUtc,
        publish_on: publishOnUtc,
        languages,
        title,
        description,
        link_text: linkText,
        link_url: linkUrl,
        badge,
        hash,
      } = it;

      if (moment(expireOnUtc).isBefore(Date.now())) {
        return accum; // ignore item if expired
      }

      if (moment(publishOnUtc).isAfter(Date.now())) {
        return accum; // ignore item if publish date hasn't occurred yet (pre-published)
      }

      if (languages && !languages.includes(chosenLanguage)) {
        chosenLanguage = NEWSFEED_FALLBACK_LANGUAGE; // don't remove the item: fallback on a language
      }

      const tempItem: NewsfeedItem = {
        title: title[chosenLanguage],
        description: description[chosenLanguage],
        linkText: linkText[chosenLanguage],
        linkUrl: linkUrl[chosenLanguage],
        badge: badge != null ? badge![chosenLanguage] : null,
        publishOn: moment(publishOnUtc),
        expireOn: moment(expireOnUtc),
        hash: hash.slice(0, 10), // optimize for storage and faster parsing
      };

      if (!this.validateItem(tempItem)) {
        return accum; // ignore if title, description, etc is missing
      }

      return [...accum, tempItem];
    }, []);

    // calculate hasNew
    const { previous, current } = this.updateHashes(feedItems);
    const hasNew = current.length > previous.length;

    return {
      error: null,
      kibanaVersion: this.kibanaVersion,
      hasNew,
      feedItems,
    };
  }
}

/*
 * Creates an Observable to newsfeed items, powered by the main interval
 * Computes hasNew value from new item hashes saved in localStorage
 */
export function getApi(
  http: HttpSetup,
  config: NewsfeedPluginInjectedConfig['newsfeed'],
  kibanaVersion: string
): Rx.Observable<void | FetchResult> {
  const userLanguage = i18n.getLocale() || config.defaultLanguage;
  const fetchInterval = config.fetchInterval;
  const driver = new NewsfeedApiDriver(kibanaVersion, userLanguage, fetchInterval);

  return Rx.timer(0, config.mainInterval).pipe(
    filter(() => driver.shouldFetch()),
    mergeMap(() =>
      driver.fetchNewsfeedItems(http, config.service).pipe(
        catchError(err => {
          window.console.error(err);
          return Rx.of({
            error: err,
            kibanaVersion,
            hasNew: false,
            feedItems: [],
          });
        })
      )
    ),
    tap(() => driver.updateLastFetch())
  );
}
