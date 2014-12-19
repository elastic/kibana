define(function (require) {
  return function SegmentedReqProvider(Private) {
    var _ = require('lodash');

    var strategy = Private(require('components/courier/fetch/strategy/segmented'));
    var SearchReq = Private(require('components/courier/fetch/request/search'));
    var SegmentedReqState = Private(require('components/courier/fetch/segmented_state'));
    var requestQueue = Private(require('components/courier/_request_queue'));

    _(SegmentedReq).inherits(SearchReq);
    function SegmentedReq(source, defer, initFn) {
      SegmentedReq.Super.call(this, source, defer);
      this.initFn = initFn;
    }

    SegmentedReq.prototype.start = function () {
      if (!this.segState) {
        this.segState = new SegmentedReqState(this.source, this.initFn);

        // generate requests for all upcomming segments and push into the request queue
        _.range(this.segState.all.length - 1)
        .reduce(function (prev) {
          var next = prev.next = prev.makeNext();
          next.prev = prev;
          next.segState = prev.segState;
          requestQueue.push(next);
          return next;
        }, this);
      }

      return SegmentedReq.Super.prototype.start.call(this);
    };

    SegmentedReq.prototype.type = 'segmented';


    SegmentedReq.prototype.clone = function () {
      return new SegmentedReq(this.source, this.defer, this.initFn);
    };

    SegmentedReq.prototype.makeNext = SegmentedReq.Super.prototype.clone;


    SegmentedReq.prototype.strategy = strategy;


    SegmentedReq.prototype.isReady = function () {
      var parent = SegmentedReq.Super.prototype.isReady.call(this);
      return parent && !this.prev;
    };


    SegmentedReq.prototype.isIncomplete = function () {
      return this.prev && this.prev.complete === true;
    };

    return SegmentedReq;
  };
});