// Debounce service, angularized version of lodash debounce
// borrowed heavily from https://github.com/shahata/angular-debounce

define(function (require) {
  var _ = require('lodash');
  var module = require('ui/modules').get('kibana');

  module.service('debounce', ['$timeout', function ($timeout) {
    return function (func, wait, options) {
      var timeout;
      var args;
      var self;
      var result;
      options = _.defaults(options || {}, {
        leading: false,
        trailing: true
      });

      function debounce() {
        self = this;
        args = arguments;

        var later = function () {
          timeout = null;
          if (!options.leading || options.trailing) {
            result = func.apply(self, args);
          }
        };

        var callNow = options.leading && !timeout;

        if (timeout) {
          $timeout.cancel(timeout);
        }
        timeout = $timeout(later, wait);

        if (callNow) {
          result = func.apply(self, args);
        }

        return result;
      }

      debounce.cancel = function () {
        $timeout.cancel(timeout);
        timeout = null;
      };

      return debounce;
    };
  }]);
});
