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

export class SearchPoll {
  constructor() {
    this._isPolling = false;
    this._intervalInMs = undefined;
    this._timerId = null;
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
    // Schedule another search.
    this.resetTimer();

    timefilter.notifyShouldFetch();
  };
}
