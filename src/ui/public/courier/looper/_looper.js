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

import '../../promises';
import { fatalError } from '../../notify';

export function LooperProvider($timeout, Promise) {
  function Looper(ms, fn) {
    this._fn = fn;
    this._ms = ms === void 0 ? 1500 : ms;
    this._timer = null;
    this._started = false;

    this._loopTheLoop = _.bind(this._loopTheLoop, this);
  }

  /**
   * Set the number of milliseconds between
   * each loop
   *
   * @param  {integer} ms
   * @chainable
   */
  Looper.prototype.ms = function (ms) {
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
  Looper.prototype.pause = function () {
    this._unScheduleLoop();
    return this;
  };

  /**
   * Start the looping madness
   *
   * @chainable
   */
  Looper.prototype.start = function (loopOver) {
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
  Looper.prototype.stop = function () {
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
  Looper.prototype.restart = function () {
    this.start(false);
    return this;
  };

  /**
   * Is the looper currently started/running/scheduled/going to execute
   *
   * @return {boolean}
   */
  Looper.prototype.started = function () {
    return !!this._started;
  };

  /**
   * Returns the current loop interval
   *
   * @return {number}
   */
  Looper.prototype.loopInterval = function () {
    return this._ms;
  };

  /**
   * Called when the loop is executed before the previous
   * run has completed.
   *
   * @override
   * @return {undefined}
   */
  Looper.prototype.onHastyLoop = function () {
    // override this in subclasses
  };

  /**
   * Wraps this._fn so that this._fn can be changed
   * without rescheduling and schedules
   * the next itteration
   *
   * @private
   * @return {undefined}
   */
  Looper.prototype._loopTheLoop = function () {
    const self = this;

    if (self.active) {
      self.onHastyLoop();
      return;
    }

    self.active = Promise
      .try(this._fn)
      .then(function () {
        self._scheduleLoop();
      })
      .catch(function (err) {
        self.stop();
        fatalError(err);
      })
      .finally(function () {
        self.active = null;
      });
  };

  /**
   * Schedule the next itteration of the loop
   *
   * @private
   * @return {number} - the timer promise
   */
  Looper.prototype._scheduleLoop = function () {
    this._unScheduleLoop();
    this._timer = this._ms ? $timeout(this._loopTheLoop, this._ms) : null;
    return this._timer;
  };

  /**
   * Cancel the next itteration of the loop
   *
   * @private
   * @return {number} - the timer promise
   */
  Looper.prototype._unScheduleLoop = function () {
    if (this._timer) {
      $timeout.cancel(this._timer);
      this._timer = null;
    }
  };

  /**
   * execute the this._fn, and restart the timer
   */
  Looper.prototype.run = function () {
    this.start();
  };

  return Looper;
}
