define(function (require) {
  return function GenericRequestProvider(Private, Promise) {
    var _ = require('lodash');
    var moment = require('moment');
    var errors = require('errors');
    var requestErrorHandler = Private(require('components/courier/fetch/request/_error_handler'));

    function GenericRequest(source, defer) {
      if (!(this instanceof GenericRequest) || !this.constructor || this.constructor === GenericRequest) {
        throw new Error('The GenericRequest class should not be called directly');
      }

      this.source = source;
      this.defer = defer || Promise.defer();
      this.started = false;
    }


    GenericRequest.prototype.isReady = function () {
      return !this.source._fetchDisabled;
    };


    GenericRequest.prototype.isIncomplete = function () {
      return false;
    };


    GenericRequest.prototype.start = function () {
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

      var history = source.history;
      if (history) {
        history = _.first(history.concat(this), 20);
      }
    };


    GenericRequest.prototype.stop = function () {
      if (this.complete) {
        throw new TypeError('Unable to stop request because it has already stopped');
      }

      this.ms = this.moment.diff() * -1;
      this.complete = true;
      this.source.activeFetchCount -= 1;
    };


    GenericRequest.prototype.resolve = function (resp) {
      this.stop();
      this.success = true;
      this.resp = resp;
      return this.defer.resolve(resp);
    };


    GenericRequest.prototype.reject = function (resp) {
      this.stop();
      this.success = false;
      this.resp = resp;
      return requestErrorHandler(this, new errors.FetchFailure(this));
    };


    GenericRequest.prototype.clone = function () {
      return new this.constructor(this.source, this.defer);
    };


    GenericRequest.prototype.cancel = function () {
      this.defer = null;
      this.started = false;
      this.canceled = true;
    };

    return GenericRequest;
  };
});