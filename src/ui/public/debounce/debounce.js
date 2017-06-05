import _ from 'lodash';
import { uiModules } from 'ui/modules';
// Debounce service, angularized version of lodash debounce
// borrowed heavily from https://github.com/shahata/angular-debounce

const module = uiModules.get('kibana');

module.service('debounce', ['$timeout', function ($timeout) {
  return function (func, wait, options) {
    let timeout;
    let args;
    let self;
    let result;
    options = _.defaults(options || {}, {
      leading: false,
      trailing: true,
      invokeApply: true,
    });

    function debounce() {
      self = this;
      args = arguments;

      const later = function () {
        timeout = null;
        if (!options.leading || options.trailing) {
          result = func.apply(self, args);
        }
      };

      const callNow = options.leading && !timeout;

      if (timeout) {
        $timeout.cancel(timeout);
      }
      timeout = $timeout(later, wait, options.invokeApply);

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
