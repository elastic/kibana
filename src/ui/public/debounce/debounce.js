// Debounce service, angularized version of lodash debounce
// borrowed heavily from https://github.com/shahata/angular-debounce

define(function (require) {
  let _ = require('lodash');
  let module = require('ui/modules').get('kibana');

  module.service('debounce', ['$timeout', function ($timeout) {
    return function (func, wait, options) {
      let timeout;
      let args;
      let self;
      let result;
      options = _.defaults(options || {}, {
        leading: false,
        trailing: true
      });

      function debounce() {
        self = this;
        args = arguments;

        let later = function () {
          timeout = null;
          if (!options.leading || options.trailing) {
            result = func.apply(self, args);
          }
        };

        let callNow = options.leading && !timeout;

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
