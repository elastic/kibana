define(function (require) {
  return function AbstractReqProvider(Private, Promise) {
    var _ = require('lodash');
    var moment = require('moment');
    var errors = require('errors');
    var requestQueue = Private(require('components/courier/_request_queue'));
    var requestErrorHandler = Private(require('components/courier/fetch/request/_error_handler'));

    function AbstractReq(source, defer) {
      if (!(this instanceof AbstractReq) || !this.constructor || this.constructor === AbstractReq) {
        throw new Error('The AbstractReq class should not be called directly');
      }

      this.source = source;
      this.defer = defer || Promise.defer();
      this.started = false;

      requestQueue.push(this);
    }


    AbstractReq.prototype.isReady = function () {
      return !this.complete && !this.canceled && !this.source._fetchDisabled;
    };


    AbstractReq.prototype.isIncomplete = function () {
      return false;
    };


    AbstractReq.prototype.start = function () {
      if (this.started) {
        throw new TypeError('Unable to start request because it has already started');
      }

      this.started = true;
      this.moment = moment();

      var source = this.source;
      if (source.activeFetchCount) {
        source.activeFetchCount += 1;
      } else {
        source.activeFetchCount = 1;
      }

      if (source.history) {
        source.history = _.first(source.history.concat(this), 20);
      }
    };


    AbstractReq.prototype.stop = function () {
      if (this.complete) {
        throw new TypeError('Unable to stop request because it has already stopped');
      }

      _.pull(requestQueue, this);

      this.ms = this.moment.diff() * -1;
      this.complete = true;
      this.source.activeFetchCount -= 1;
    };


    AbstractReq.prototype.cancel = function () {
      this.defer = null;
      this.canceled = true;
      _.pull(requestQueue, this);
    };


    AbstractReq.prototype.restart = function () {
      var clone = this.clone();
      this.cancel();
      clone.start();
      return clone;
    };


    AbstractReq.prototype.resolve = function (resp) {
      this.stop();
      this.success = true;
      this.resp = resp;
      return this.defer.resolve(resp);
    };


    AbstractReq.prototype.reject = function (resp) {
      this.stop();
      this.success = false;
      this.resp = resp;
      this.clone();
      return requestErrorHandler(this, new errors.FetchFailure(this));
    };


    AbstractReq.prototype.clone = function () {
      return new this.constructor(this.source, this.defer);
    };

    return AbstractReq;
  };
});