var parse = require('url').parse;
var bindKey = require('lodash').bindKey;

require('../appSwitcher/appSwitcher.less');

require('ui/modules')
.get('kibana')
.directive('appSwitcher', function () {
  return {
    restrict: 'E',
    template: require('./appSwitcher.html'),
    controllerAs: 'switcher',
    controller: function ($scope, $window) {

      // since we render this in an isolate scope we can't "require: ^chrome", but
      // rather than remove all helpfull checks we can just check here.
      if (!$scope.chrome || !$scope.chrome.getNavLinks) {
        throw new TypeError('appSwitcher directive requires the "chrome" config-object');
      }

      this.getNavLinks = bindKey($scope.chrome, 'getNavLinks');

      // links don't cause full-navigation events in certain scenarios
      // so we force them when needed
      this.ensureNavigation = function (event, app) {
        if (event.isDefaultPrevented() || event.altKey || event.metaKey || event.ctrlKey) {
          return;
        }

        var toParsed = parse(app.url);
        var fromParsed = parse(window.location.href);
        var sameProto = toParsed.protocol === fromParsed.protocol;
        var sameHost = toParsed.host === fromParsed.host;
        var samePath = toParsed.path === fromParsed.path;

        if (sameProto && sameHost && samePath) {
          window.location.reload(true);
        }
      };

    }
  };
});
