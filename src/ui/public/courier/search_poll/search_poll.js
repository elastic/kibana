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
import { requestQueue } from '../_request_queue';
import { FetchSoonProvider } from '../fetch';

export function SearchPollProvider(Private, Promise, $timeout, $rootScope) {
  const fetchSoon = Private(FetchSoonProvider);

  class SearchPoll {
    constructor() {
      this._isIntervalPaused = true;
      this._intervalInMs = undefined;
      this._timer = null;
      this._searchPromise = null;
      this._redoSearchPromise = null;
    }

    /**
     * Set the number of milliseconds between
     * each loop
     *
     * @param  {integer} intervalInMs
     */
    setIntervalInMs = intervalInMs => {
      this._intervalInMs = _.parseInt(intervalInMs);
    };

    setIsIntervalPaused = (isPaused) => {
      this._isIntervalPaused = isPaused;

      if (this._isIntervalPaused) {
        this._clearTimer();
      } else {
        this.resetTimer();
      }
    };

    _search = () => {
      // If we're waiting on the results of a previous search, then cancel and redo it.
      if (this._searchPromise) {
        this._redoSearch();
        return;
      }

      this._searchPromise = Promise.try(() => {
        $rootScope.$broadcast('courier:searchRefresh');
        const requests = requestQueue.getInactive();

        // promise returned from fetch.fetchSearchRequests() only resolves when
        // the requests complete, but we want to continue even if
        // the requests abort so we make our own
        fetchSoon.fetchSearchRequests(requests);

        return Promise.all(
          requests.map(request => request.getCompleteOrAbortedPromise())
        );
      })
        .then(() => {
          this.resetTimer();
        })
        .catch(err => {
          // If there was a problem, then stop future searches and kill Kibana.
          this._clearTimer();
          fatalError(err);
        })
        .finally(() => {
          this._searchPromise = null;
        });
    };

    _redoSearch = () => {
      // If we're already redoing the search, don't redo it again. This prevents us from
      // endlessly redoing searches and never getting any results back.
      if (this._redoSearchPromise) {
        return;
      }

      // Resolve the original searchPromise so that finally() is called and it gets set to null.
      this._redoSearchPromise = Promise.resolve(this._searchPromise)
        .then(() => {
          return this._search();
        })
        .finally(() => {
          this._redoSearchPromise = null;
        });
    };

    /**
     * Schedule the next iteration of the loop
     */
    resetTimer = () => {
      this._clearTimer();

      if (!this._isIntervalPaused) {
        this._timer = $timeout(this._search, this._intervalInMs);
      }
    };

    /**
     * Cancel the next iteration of the loop
     */
    _clearTimer = () => {
      if (this._timer) {
        $timeout.cancel(this._timer);
        this._timer = null;
      }
    };
  }

  return new SearchPoll();
}
