define(function (require) {
  return function SegmentedRequestProvider(Private) {
    var _ = require('lodash');

    var strategy = Private(require('components/courier/fetch/strategy/segmented'));
    var SearchRequest = Private(require('components/courier/fetch/request/search'));
    var SegmentedState = Private(require('components/courier/fetch/segmented_state'));
    var requestQueue = Private(require('components/courier/_request_queue'));

    _(SegmentedRequest).inherits(SearchRequest);
    function SegmentedRequest(source, defer, initFn) {
      SegmentedRequest.Super.call(this, source, defer);

      this.initFn;

      if (_.isFunction(initFn)) {
        this.segState = new SegmentedState(source, initFn);
        // generate requests for all upcomming segments and push into the request queue
        _.range(this.segState.all.length - 1)
        .reduce(function (prev) {
          var next = prev.next = prev.getNext();
          next.prev = prev;
          next.segState = prev.segState;
          requestQueue.push(next);
          return next;
        }, this);
      }
    }

    SegmentedRequest.prototype.type = 'segmented';


    SegmentedRequest.prototype.clone = function () {
      return new SegmentedRequest(this.source, this.defer, this.initFn);
    };


    SegmentedRequest.prototype.getNext = SegmentedRequest.Super.prototype.clone;


    SegmentedRequest.prototype.strategy = strategy;


    SegmentedRequest.prototype.isReady = function () {
      var parent = SegmentedRequest.Super.prototype.isReady.call(this);
      return parent && !this.prev;
    };


    SegmentedRequest.prototype.isIncomplete = function () {
      return this.prev && this.prev.complete === true;
    };

    return SegmentedRequest;
  };
});