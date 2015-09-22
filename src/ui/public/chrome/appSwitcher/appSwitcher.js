var parse = require('url').parse;

require('../appSwitcher/appSwitcher.less');

require('ui/modules')
.get('kibana')
.directive('appSwitcher', function () {
  return {
    restrict: 'E',
    template: require('./appSwitcher.html'),
    controllerAs: 'switcher',
    controller: function () {

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
