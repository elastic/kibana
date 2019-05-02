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

import moment from 'moment';
import { once } from 'lodash';

export class SearchRequest {
  constructor({ source }) {
    this.source = source;

    this._promise = new Promise((resolve, reject) => {
      this._resolve = resolve;
      this._reject = reject;
    });

    this._abort = () => {};

    // Track execution time.
    this._moment = moment();
    this._ms = undefined;
  }

  handleResponse(resp) {
    this._ms = this._moment.diff() * -1;
    this._resolve(resp);
  }

  handleFailure(error) {
    this._ms = this._moment.diff() * -1;
    this._reject(error);
  }

  getFetchParams() {
    return this.source._flatten();
  }

  getPromise() {
    return this._promise;
  }

  getRequestTime() {
    return this._ms;
  }

  /**
   * We don't know upfront how to abort this request. We only know as soon as the search strategy
   * has given us the abort function, so this is set at that point.
   * @param fn The function that actually aborts the request
   */
  setAbort(fn) {
    this._abort = once(fn);
  }

  /**
   * Abort the request, if it hasn't yet completed. This works because if the request has already
   * handled a response and its promise has fulfilled, then calling reject() on it won't actually
   * do anything, and the catch() handler will never actually be called.
   */
  abort() {
    this._reject(new Error('Request was aborted'));
    this._promise.catch(() => this._abort());
  }
}
