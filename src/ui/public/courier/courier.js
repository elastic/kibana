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
import '../index_patterns';
import { uiModules } from '../modules';
import { addFatalErrorCallback } from '../notify';
import '../promises';

import { requestQueue } from './_request_queue';
import { FetchSoonProvider } from './fetch';
import { SearchLooperProvider } from './search_looper';

uiModules.get('kibana/courier').service('courier', ($rootScope, Private) => {
  const fetchSoon = Private(FetchSoonProvider);

  // This manages the doc fetch interval.
  const searchLooper = Private(SearchLooperProvider);

  class Courier {
    constructor() {
      // Listen for refreshInterval changes
      $rootScope.$listen(timefilter, 'refreshIntervalUpdate', function () {
        const refreshValue = _.get(timefilter.getRefreshInterval(), 'value');
        const refreshPause = _.get(timefilter.getRefreshInterval(), 'pause');

        // Update the time between automatic search requests.
        if (_.isNumber(refreshValue) && !refreshPause) {
          searchLooper.setIntervalInMs(refreshValue);
        } else {
          searchLooper.setIntervalInMs(0);
        }
      });

      // Abort all pending requests if there's a fatal error.
      const closeOnFatal = _.once(() => {
        searchLooper.stop();

        _.invoke(requestQueue, 'abort');

        if (requestQueue.length) {
          throw new Error('Aborting all pending requests failed.');
        }
      });

      addFatalErrorCallback(closeOnFatal);
    }

    /**
     * Process the pending request queue right now, returns
     * a promise that resembles the success of the fetch completing,
     * individual errors are routed to their respective requests.
     */
    fetch = () => {
      fetchSoon.fetchQueued().then(() => {
        searchLooper.restart();
      });
    };
  }

  return new Courier();
});
