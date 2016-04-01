define(function (require) {
  return function CourierSegmentedReqHandle(Private) {
    let _ = require('lodash');
    let Events = Private(require('ui/events'));


    /**
     * Simple class for creating an object to send to the
     * requester of a SegmentedRequest. Since the SegmentedRequest
     * extends AbstractRequest, it wasn't able to be the event
     * emitter it was born to be. This provides a channel for
     * setting values on the segmented request, and an event
     * emitter for the request to speak outwardly
     *
     * @param {SegmentedRequest} - req - the requst this handle relates to
     */
    _.class(SegmentedHandle).inherits(Events);
    function SegmentedHandle(req) {
      SegmentedHandle.Super.call(this);

      // export a couple methods from the request
      this.setDirection = _.bindKey(req, 'setDirection');
      this.setSize = _.bindKey(req, 'setSize');
      this.setMaxSegments = _.bindKey(req, 'setMaxSegments');
      this.setSortFn = _.bindKey(req, 'setSortFn');
    }

    return SegmentedHandle;
  };
});
