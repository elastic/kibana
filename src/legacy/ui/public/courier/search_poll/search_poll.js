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

import _ from 'lodash';

import { fatalError } from '../../notify';
import '../../promises';
import { searchRequestQueue } from '../search_request_queue';
import { FetchSoonProvider } from '../fetch';
import { timefilter } from 'ui/timefilter';

export function SearchPollProvider(Private, Promise) {
  const fetchSoon = Private(FetchSoonProvider);

  class SearchPoll {
    constructor() {
      this._isPolling = false;
      this._intervalInMs = undefined;
      this._timerId = null;
      this._searchPromise = null;
      this._isIntervalFasterThanSearch = false;
    }

    setIntervalInMs = intervalInMs => {
      this._intervalInMs = _.parseInt(intervalInMs);
    };

    resume = () => {
      this._isPolling = true;
      this.resetTimer();
    };

    pause = () => {
      this._isPolling = false;
      this.clearTimer();
    };

    resetTimer = () => {
      // Cancel the pending search and schedule a new one.
      this.clearTimer();

      if (this._isPolling) {
        this._timerId = setTimeout(this._search, this._intervalInMs);
      }
    };

    clearTimer = () => {
      // Cancel the pending search, if there is one.
      if (this._timerId) {
        clearTimeout(this._timerId);
        this._timerId = null;
      }
    };

    _search = () => {
      // If our interval is faster than the rate at which searches return results, then trigger
      // a new search as soon as the results come back.
      if (this._searchPromise) {
        this._isIntervalFasterThanSearch = true;
        return;
      }

      // Schedule another search.
      this.resetTimer();

      // We use resolve() here instead of try() because the latter won't trigger a $digest
      // when the promise resolves.
      this._searchPromise = Promise.resolve()
        .then(() => {
          timefilter.notifyShouldFetch();
          const requests = searchRequestQueue.getInactive();

          // The promise returned from fetchSearchRequests() only resolves when the requests complete.
          // We want to continue even if the requests abort so we return a different promise.
          fetchSoon.fetchSearchRequests(requests);

          return Promise.all(requests.map(request => request.getCompleteOrAbortedPromise()));
        })
        .then(() => {
          this._searchPromise = null;

          // If the search response comes back before the interval fires, then we'll wait
          // for the interval and let it kick off the next search. But if the interval fires before
          // the search returns results, then we'll need to wait for the search to return results
          // and then kick off another search again. A new search will also reset the interval.
          if (this._isIntervalFasterThanSearch) {
            this._isIntervalFasterThanSearch = false;
            this._search();
          }
        })
        .catch(err => {
          // If there was a problem, then kill Kibana.
          fatalError(err);
        });
    };
  }

  return new SearchPoll();
}
