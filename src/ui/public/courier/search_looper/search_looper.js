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

export function SearchLooperProvider(Private, Promise, $timeout, $rootScope) {
  const fetchSoon = Private(FetchSoonProvider);

  class SearchLooper {
    constructor() {
      this._intervalInMs = undefined;
      this._timer = null;
      this._started = false;
    }

    /**
     * Set the number of milliseconds between
     * each loop
     *
     * @param  {integer} intervalInMs
     */
    setIntervalInMs = intervalInMs => {
      this._intervalInMs = _.parseInt(intervalInMs) || 0;

      if (!this._started) {
        return;
      }

      if (this._intervalInMs) {
        this.start(false);
      } else {
        this._unscheduleLoop();
      }
    };

    start = loopOver => {
      if (loopOver == null) {
        loopOver = true;
      }

      if (!this._started) {
        this._started = true;
      } else {
        this._unscheduleLoop();
      }

      if (loopOver) {
        this._executeLoop();
      } else {
        this._scheduleLoop();
      }
    };

    stop = () => {
      this._unscheduleLoop();
      this._started = false;
    };

    /**
     * Restart the looper only if it is already started.
     * Called automatically when ms is changed
     */
    restart = () => {
      this.start(false);
    };

    /**
     * Is the looper currently started/running/scheduled/going to execute
     *
     * @return {boolean}
     */
    started = () => {
      return !!this._started;
    };

    /**
     * Called when the loop is executed before the previous
     * run has completed.
     *
     * @override
     * @return {undefined}
     */
    _onHastyLoop = () => {
      if (this.afterHastyQueued) {
        return;
      }

      this.afterHastyQueued = Promise.resolve(this.active)
        .then(() => {
          return this._executeLoop();
        })
        .finally(() => {
          this.afterHastyQueued = null;
        });
    };

    /**
     * Wraps this._fn so that this._fn can be changed
     * without rescheduling and schedules
     * the next iteration
     *
     * @private
     * @return {undefined}
     */
    _executeLoop = () => {
      if (this.active) {
        this._onHastyLoop();
        return;
      }

      this.active = Promise.try(this._executeLoopAction)
        .then(() => {
          this._scheduleLoop();
        })
        .catch(err => {
          this.stop();
          fatalError(err);
        })
        .finally(() => {
          this.active = null;
        });
    };

    _executeLoopAction = () => {
      $rootScope.$broadcast('courier:searchRefresh');
      const requests = requestQueue.getInactive();

      // promise returned from fetch.fetchSearchRequests() only resolves when
      // the requests complete, but we want to continue even if
      // the requests abort so we make our own
      fetchSoon.fetchSearchRequests(requests);

      return Promise.all(
        requests.map(request => request.getCompleteOrAbortedPromise())
      );
    };

    /**
     * Schedule the next iteration of the loop
     *
     * @private
     * @return {number} - the timer promise
     */
    _scheduleLoop = () => {
      this._unscheduleLoop();

      this._timer = this._intervalInMs
        ? $timeout(this._executeLoop, this._intervalInMs)
        : null;

      return this._timer;
    };

    /**
     * Cancel the next iteration of the loop
     *
     * @private
     * @return {number} - the timer promise
     */
    _unscheduleLoop = () => {
      if (this._timer) {
        $timeout.cancel(this._timer);
        this._timer = null;
      }
    };
  }

  return new SearchLooper();
}
