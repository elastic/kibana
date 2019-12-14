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

import { timefilter } from 'ui/timefilter';

import '../es';
import '../directives/listen';
import { uiModules } from '../modules';
import { addFatalErrorCallback } from '../notify';
import '../promises';

import { searchRequestQueue } from './search_request_queue';
import { FetchSoonProvider } from './fetch';
import { SearchPollProvider } from './search_poll';

uiModules.get('kibana/courier').service('courier', ($rootScope, Private) => {
  const fetchSoon = Private(FetchSoonProvider);

  // This manages the doc fetch interval.
  const searchPoll = Private(SearchPollProvider);

  class Courier {
    constructor() {
      // Listen for refreshInterval changes
      const updateRefreshInterval = () => {
        const refreshIntervalMs = _.get(timefilter.getRefreshInterval(), 'value');
        const isRefreshPaused = _.get(timefilter.getRefreshInterval(), 'pause');

        // Update the time between automatic search requests.
        searchPoll.setIntervalInMs(refreshIntervalMs);

        if (isRefreshPaused) {
          searchPoll.pause();
        } else {
          searchPoll.resume();
        }
      };

      const refreshIntervalSubscription = timefilter
        .getRefreshIntervalUpdate$()
        .subscribe(updateRefreshInterval);

      const closeOnFatal = _.once(() => {
        // If there was a fatal error, then stop future searches. We want to use pause instead of
        // clearTimer because if the search results come back after the fatal error then we'll
        // resume polling.
        searchPoll.pause();

        // And abort all pending requests.
        searchRequestQueue.abortAll();

        if (searchRequestQueue.getCount()) {
          throw new Error('Aborting all pending requests failed.');
        }

        refreshIntervalSubscription.unsubscribe();
      });

      addFatalErrorCallback(closeOnFatal);
      updateRefreshInterval();
    }

    /**
     * Fetch the pending requests.
     */
    fetch() {
      fetchSoon.fetchQueued().then(() => {
        // Reset the timer using the time that we get this response as the starting point.
        searchPoll.resetTimer();
      });
    }
  }

  return new Courier();
});
