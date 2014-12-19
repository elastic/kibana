define(function (require) {
  return function CourierSegmentedReqHandle(Private) {
    var _ = require('lodash');
    var Events = Private(require('factories/events'));


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
    _(SegmentedHandle).inherits(Events);
    function SegmentedHandle(req) {
      SegmentedHandle.Super.call(this);
      this._req = req;
    }

    /**
     * Set the sort direction for the request.
     *
     * @param {string} dir - one of 'asc' or 'desc'
     */
    SegmentedHandle.prototype.setDirection = function (dir) {
      switch (dir) {
      case 'asc':
      case 'desc':
        return (this._req._direction = dir);
      default:
        throw new TypeError('unkown sort direction "' + dir + '"');
      }
    };

    return SegmentedHandle;
  };
});