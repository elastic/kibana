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

import { FetchSoonProvider } from '../fetch';
import { requestQueue } from '../_request_queue';
import '../../promises';
import { fatalError } from '../../notify';

export function SearchLooperProvider(Private, Promise, $timeout, $rootScope) {
  const fetchSoon = Private(FetchSoonProvider);

  class SearchLooper {
    constructor() {
      this._ms = 1500;
      this._timer = null;
      this._started = false;
    }

    /**
     * Set the number of milliseconds between
     * each loop
     *
     * @param  {integer} ms
     * @chainable
     */
    ms = (ms) => {
      this._ms = _.parseInt(ms) || 0;

      if (!this._started) return;

      if (this._ms) {
        this.start(false);
      } else {
        this._unScheduleLoop();
      }

      return this;
    };

    /**
     * Cancels the current looper while keeping internal
     * state as started
     *
     * @chainable
     */
    pause = () => {
      this._unScheduleLoop();
      return this;
    };

    /**
     * Start the looping madness
     *
     * @chainable
     */
    start = (loopOver) => {
      if (loopOver == null) loopOver = true;

      if (!this._started) {
        this._started = true;
      } else {
        this._unScheduleLoop();
      }

      if (loopOver) {
        this._loopTheLoop();
      } else {
        this._scheduleLoop();
      }

      return this;
    };

    /**
     * ...
     *
     * @chainable
     */
    stop = () => {
      this._unScheduleLoop();
      this._started = false;
      return this;
    };

    /**
     * Restart the looper only if it is already started.
     * Called automatically when ms is changed
     *
     * @chainable
     */
    restart = () => {
      this.start(false);
      return this;
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
     * Returns the current loop interval
     *
     * @return {number}
     */
    loopInterval = () => {
      return this._ms;
    };

    /**
     * Called when the loop is executed before the previous
     * run has completed.
     *
     * @override
     * @return {undefined}
     */
    _onHastyLoop = () => {
      if (this.afterHastyQueued) return;

      this.afterHastyQueued = Promise.resolve(this.active)
        .then(() => {
          return this._loopTheLoop();
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
    _loopTheLoop = () => {
      if (this.active) {
        this._onHastyLoop();
        return;
      }

      this.active = Promise
        .try(this._action)
        .then(() => {
          this._scheduleLoop();
        })
        .catch((err) => {
          this.stop();
          fatalError(err);
        })
        .finally(() => {
          this.active = null;
        });
    };

    _action = () => {
      $rootScope.$broadcast('courier:searchRefresh');
      const requests = requestQueue.getInactive();
      // promise returned from fetch.fetchSearchRequests() only resolves when
      // the requests complete, but we want to continue even if
      // the requests abort so we make our own
      fetchSoon.fetchSearchRequests(requests);
      return Promise.all(requests.map(request => request.getCompleteOrAbortedPromise()));
    };

    /**
     * Schedule the next iteration of the loop
     *
     * @private
     * @return {number} - the timer promise
     */
    _scheduleLoop = () => {
      this._unScheduleLoop();
      this._timer = this._ms ? $timeout(this._loopTheLoop, this._ms) : null;
      return this._timer;
    };

    /**
     * Cancel the next iteration of the loop
     *
     * @private
     * @return {number} - the timer promise
     */
    _unScheduleLoop = () => {
      if (this._timer) {
        $timeout.cancel(this._timer);
        this._timer = null;
      }
    };

    /**
     * execute the this._fn, and restart the timer
     */
    run = () => {
      this.start();
    };
  }

  // This manages the doc fetch interval.
  return new SearchLooper();
}
