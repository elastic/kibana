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
import { filter, mergeMap, tap } from 'rxjs/operators';
import { HttpServiceBase } from '../../../../../src/core/public';

interface ApiItem {
  hash: string;
  expire_on: Date;
  title: { [lang: string]: string };
  description: { [lang: string]: string };
  link_text: { [lang: string]: string };
  link_url: { [lang: string]: string };

  badge: null; // not used phase 1
  image_url: null; // not used phase 1
  languages: null; // not used phase 1
  publish_on: null; // not used phase 1
}

interface NewsfeedItem {
  title: string;
  description: string;
  linkText: string;
  linkUrl: string;
}

export interface FetchResult {
  hasNew: boolean;
  feedItems: NewsfeedItem[];
}

const DEFAULT_LANGUAGE = 'en'; // TODO: read from settings, default to en
const NEWSFEED_MAIN_INTERVAL = 120000; // A main interval to check for need to refresh (2min)
const NEWSFEED_FETCH_INTERVAL = moment.duration(1, 'day'); // how often to actually fetch the API
const NEWSFEED_LAST_FETCH_STORAGE_KEY = 'xpack.newsfeed.lastfetchtime';
const NEWSFEED_HASH_SET_STORAGE_KEY = 'xpack.newsfeed.hashes';
const NEWSFEED_SERVICE_URL = 'https://feeds.elastic.co/kibana/v7.0.0.json'; // FIXME: should be dynamic

function shouldFetch(): boolean {
  const lastFetch: string | null = localStorage.getItem(NEWSFEED_LAST_FETCH_STORAGE_KEY);
  if (lastFetch == null) {
    return true;
  }
  const last = moment(lastFetch, 'x'); // parse as unix ms timestamp
  const now = moment();
  const duration = moment.duration(now.diff(last));

  return duration > NEWSFEED_FETCH_INTERVAL;
}

function updateLastFetch() {
  localStorage.setItem(NEWSFEED_LAST_FETCH_STORAGE_KEY, Date.now().toString());
}

function updateHashes(items: ApiItem[]): { previous: string[]; current: string[] } {
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

/*
 * Creates an Observable to newsfeed items, powered by the main interval
 * Computes hasNew value from new item hashes saved in localStorage
 */
export function getApi(http: HttpServiceBase): Rx.Observable<void | FetchResult> {
  return Rx.timer(0, NEWSFEED_MAIN_INTERVAL).pipe(
    filter(() => shouldFetch()),
    mergeMap(
      (value: number): Rx.Observable<ApiItem[]> => {
        return Rx.from(
          http.fetch(NEWSFEED_SERVICE_URL, { method: 'GET' }).then(({ items }) => items)
        );
      }
    ),
    filter(items => items.length > 0),
    tap(() => updateLastFetch()),
    mergeMap(
      (items): Rx.Observable<FetchResult> => {
        // calculate hasNew
        const { previous, current } = updateHashes(items);
        const hasNew = current.length > previous.length;

        // model feed items
        const feedItems: NewsfeedItem[] = items.map(it => {
          return {
            title: it.title[DEFAULT_LANGUAGE],
            description: it.description[DEFAULT_LANGUAGE],
            linkText: it.link_text[DEFAULT_LANGUAGE],
            linkUrl: it.link_url[DEFAULT_LANGUAGE],
          };
        });

        return Rx.of({
          hasNew,
          feedItems,
        });
      }
    )
  );
}
