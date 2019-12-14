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

import { searchRequestQueue } from '../../../search_request_queue';

import { createDefer } from 'ui/promises';
import { i18n } from '@kbn/i18n';

export function SearchRequestProvider(Promise) {
  class SearchRequest {
    constructor({ source, defer, errorHandler }) {
      if (!errorHandler) {
        throw new Error(
          i18n.translate('common.ui.courier.fetch.requireErrorHandlerErrorMessage', {
            defaultMessage: '{errorHandler} is required',
            values: { errorHandler: 'errorHandler' },
          })
        );
      }

      this.errorHandler = errorHandler;
      this.source = source;
      this.defer = defer || createDefer(Promise);
      this.abortedDefer = createDefer(Promise);
      this.type = 'search';

      // Track execution time.
      this.moment = undefined;
      this.ms = undefined;

      // Lifecycle state.
      this.started = false;
      this.stopped = false;
      this._isFetchRequested = false;

      searchRequestQueue.add(this);
    }

    /**
     *  Called by the searchPoll to find requests that should be sent to the
     *  fetchSoon module. When a module is sent to fetchSoon its _isFetchRequested flag
     *  is set, and this consults that flag so requests are not send to fetchSoon
     *  multiple times.
     *
     *  @return {Boolean}
     */
    canStart() {
      if (this.source._fetchDisabled) {
        return false;
      }

      if (this.stopped) {
        return false;
      }

      if (this._isFetchRequested) {
        return false;
      }

      return true;
    }

    /**
     *  Used to find requests that were previously sent to the fetchSoon module but
     *  have not been started yet, so they can be started.
     *
     *  @return {Boolean}
     */
    isFetchRequestedAndPending() {
      if (this.started) {
        return false;
      }

      return this._isFetchRequested;
    }

    /**
     *  Called by the fetchSoon module when this request has been sent to
     *  be fetched. At that point the request is somewhere between `ready-to-start`
     *  and `started`. The fetch module then waits a short period of time to
     *  allow requests to build up in the request queue, and then immediately
     *  fetches all requests that return true from `isFetchRequestedAndPending()`
     *
     *  @return {undefined}
     */
    _setFetchRequested() {
      this._isFetchRequested = true;
    }

    start() {
      if (this.started) {
        throw new TypeError(
          i18n.translate('common.ui.courier.fetch.unableStartRequestErrorMessage', {
            defaultMessage: 'Unable to start request because it has already started',
          })
        );
      }

      this.started = true;
      this.moment = moment();

      return this.source.requestIsStarting(this);
    }

    getFetchParams() {
      return this.source._flatten();
    }

    filterError() {
      return false;
    }

    handleResponse(resp) {
      this.success = true;
      this.resp = resp;
    }

    handleFailure(error) {
      this.success = false;
      this.resp = error;
      this.resp = (error && error.resp) || error;
      return this.errorHandler(this, error);
    }

    isIncomplete() {
      return false;
    }

    continue() {
      throw new Error(
        i18n.translate('common.ui.courier.fetch.unableContinueRequestErrorMessage', {
          defaultMessage: 'Unable to continue {type} request',
          values: { type: this.type },
        })
      );
    }

    retry() {
      const clone = this.clone();
      this.abort();
      return clone;
    }

    _markStopped() {
      if (this.stopped) return;
      this.stopped = true;
      this.source.requestIsStopped(this);
      searchRequestQueue.remove(this);
    }

    abort() {
      this._markStopped();
      this.aborted = true;
      const error = new Error('The request was aborted.');
      error.name = 'AbortError';
      this.abortedDefer.resolve(error);
      this.abortedDefer = null;
      this.defer.reject(error);
      this.defer = null;
    }

    whenAborted(cb) {
      this.abortedDefer.promise.then(cb);
    }

    complete() {
      this._markStopped();
      this.ms = this.moment.diff() * -1;
      this.defer.resolve(this.resp);
    }

    getCompletePromise() {
      return this.defer.promise;
    }

    getCompleteOrAbortedPromise() {
      return Promise.race([this.defer.promise, this.abortedDefer.promise]);
    }

    clone = () => {
      const { source, defer, errorHandler } = this;
      return new SearchRequest({ source, defer, errorHandler });
    };
  }

  return SearchRequest;
}
