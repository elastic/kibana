define(function (require) {
  return function CourierSegmentedReqHandle(Private) {
    var _ = require('lodash');
    var Events = Private(require('factories/events'));

    _(SegmentedHandle).inherits(Events);
    function SegmentedHandle(req) {
      SegmentedHandle.Super.call(this);
      this._req = req;
    }

    SegmentedHandle.prototype.setTotalSize = function (totalSize) {
      var req = this._req;
      totalSize = _.parseInt(totalSize);
      return (req._totalSize = totalSize || false);
    };

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