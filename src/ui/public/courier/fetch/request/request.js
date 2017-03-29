import _ from 'lodash';
import moment from 'moment';

import RequestQueueProvider from '../../_request_queue';
import ErrorHandlerRequestProvider from './error_handler';

export default function AbstractReqProvider(Private, Promise) {
  const requestQueue = Private(RequestQueueProvider);
  const requestErrorHandler = Private(ErrorHandlerRequestProvider);

  return class AbstractReq {
    constructor(source, defer) {
      this.source = source;
      this.defer = defer || Promise.defer();
      this.abortedDefer = Promise.defer();
      requestQueue.push(this);
    }

    /**
     *  Called by the loopers to find requests that should be sent to the
     *  fetch() module. When a module is sent to fetch() it's _fetchRequested flag
     *  is set, and this consults that flag so requests are not send to fetch()
     *  multiple times.
     *
     *  @return {Boolean}
     */
    canStart() {
      return !this._fetchRequested && !this.stopped && !this.source._fetchDisabled;
    }

    /**
     *  Used to find requests that were previously sent to the fetch() module but
     *  have not been started yet, so they can be started.
     *
     *  @return {Boolean}
     */
    isFetchRequestedAndPending() {
      return this._fetchRequested && !this.started;
    }

    /**
     *  Called by the fetch() module when this request has been sent to
     *  be fetched. At that point the request is somewhere between `ready-to-start`
     *  and `started`. The fetch module then waits a short period of time to
     *  allow requests to build up in the request queue, and then immediately
     *  fetches all requests that return true from `isFetchRequestedAndPending()`
     *
     *  @return {undefined}
     */
    _setFetchRequested() {
      this._fetchRequested = true;
    }

    start() {
      if (this.started) {
        throw new TypeError('Unable to start request because it has already started');
      }

      this.started = true;
      this.moment = moment();

      const source = this.source;
      if (source.activeFetchCount) {
        source.activeFetchCount += 1;
      } else {
        source.activeFetchCount = 1;
      }

      source.history = [this];
    }

    getFetchParams() {
      return this.source._flatten();
    }

    transformResponse(resp) {
      return resp;
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
      this.resp = error && error.resp;
      this.retry();
      return requestErrorHandler(this, error);
    }

    isIncomplete() {
      return false;
    }

    continue() {
      throw new Error('Unable to continue ' + this.type + ' request');
    }

    retry() {
      const clone = this.clone();
      this.abort();
      return clone;
    }

    _markStopped() {
      if (this.stopped) return;
      this.stopped = true;
      this.source.activeFetchCount -= 1;
      _.pull(requestQueue, this);
    }

    abort() {
      this._markStopped();
      this.defer = null;
      this.aborted = true;
      this.abortedDefer.resolve();
      this.abortedDefer = null;
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
      return Promise.race([ this.defer.promise, this.abortedDefer.promise ]);
    }

    clone() {
      return new this.constructor(this.source, this.defer);
    }
  };
}
