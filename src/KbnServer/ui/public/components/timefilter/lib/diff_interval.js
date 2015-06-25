define(function (require) {
  var _ = require('lodash');
  return function diffTimeProvider(Private) {
    var diff = Private(require('utils/diff_time_picker_vals'));

    return function (self) {
      var oldRefreshInterval = _.clone(self.refreshInterval);

      return function () {
        if (diff(self.refreshInterval, oldRefreshInterval)) {
          self.emit('update');
          if (!self.refreshInterval.pause && self.refreshInterval.value !== 0) {
            self.emit('fetch');
          }
        }

        oldRefreshInterval = _.clone(self.refreshInterval);
      };
    };
  };
});
