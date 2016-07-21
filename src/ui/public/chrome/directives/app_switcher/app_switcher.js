var parse = require('url').parse;
var bindKey = require('lodash').bindKey;

require('../app_switcher/app_switcher.less');
var DomLocationProvider = require('ui/domLocation');

require('ui/modules')
.get('kibana')
.directive('appSwitcher', function () {
  return {
    restrict: 'E',
    template: require('./app_switcher.html'),
    controllerAs: 'switcher',
    controller: function ($scope, Private) {
      var domLocation = Private(DomLocationProvider);

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

        var toParsed = parse(event.delegateTarget.href);
        var fromParsed = parse(domLocation.href);
        var sameProto = toParsed.protocol === fromParsed.protocol;
        var sameHost = toParsed.host === fromParsed.host;
        var samePath = toParsed.path === fromParsed.path;

        if (sameProto && sameHost && samePath) {
          toParsed.hash && domLocation.reload();

          // event.preventDefault() keeps the browser from seeing the new url as an update
          // and even setting window.location does not mimic that behavior, so instead
          // we use stopPropagation() to prevent angular from seeing the click and
          // starting a digest cycle/attempting to handle it in the router.
          event.stopPropagation();
        }
      };

    }
  };
});
