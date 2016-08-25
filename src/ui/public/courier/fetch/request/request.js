import _ from 'lodash';
import moment from 'moment';

import errors from 'ui/errors';

import RequestQueueProvider from '../../_request_queue';
import ErrorHandlerRequestProvider from './error_handler';

export default function AbstractReqProvider(Private, Promise) {
  const requestQueue = Private(RequestQueueProvider);
  const requestErrorHandler = Private(ErrorHandlerRequestProvider);

  return class AbstractReq {
    constructor(source, defer) {
      this.source = source;
      this.defer = defer || Promise.defer();
      this._whenAbortedHandlers = [];

      requestQueue.push(this);
    }

    canStart() {
      return Boolean(!this.stopped && !this.source._fetchDisabled);
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

    filterError(resp) {
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
      _.callEach(this._whenAbortedHandlers);
    }

    whenAborted(cb) {
      this._whenAbortedHandlers.push(cb);
    }

    complete() {
      this._markStopped();
      this.ms = this.moment.diff() * -1;
      this.defer.resolve(this.resp);
    }

    clone() {
      return new this.constructor(this.source, this.defer);
    }
  };
}
