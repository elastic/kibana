define(function (require) {
  function IndexPattern(index, interval) {
    this.text = index;
    this.interval = interval;
  }

  IndexPattern.prototype = {
    toJSON: function () {
      return this.text;
    },
    toString: function () {
      return this.text;
    },
    forTimeRange: function () {
      throw new Error('not implemented');
    },
    wildcard: function () {
      throw new Error('not implemented');
    }
  };

  return IndexPattern;
});