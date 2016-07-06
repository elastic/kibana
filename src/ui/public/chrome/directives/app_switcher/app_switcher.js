import DomLocationProvider from 'ui/dom_location';
import { parse } from 'url';
import { bindKey } from 'lodash';
import '../app_switcher/app_switcher.less';
import uiModules from 'ui/modules';
import appSwitcherTemplate from './app_switcher.html';

function isNavLinkEnabled(link) {
  return !link.disabled;
}

function isNavLinkShown(link) {
  return !link.hidden;
}

uiModules
.get('kibana')
.provider('appSwitcherEnsureNavigation', function () {
  let forceNavigation = false;

  this.forceNavigation = function (val) {
    forceNavigation = !!val;
  };

  this.$get = ['Private', function (Private) {
    const domLocation = Private(DomLocationProvider);

    return function (event, link) {
      if (!isNavLinkEnabled(link)) {
        event.preventDefault();
      }

      if (!forceNavigation || event.isDefaultPrevented() || event.altKey || event.metaKey || event.ctrlKey) {
        return;
      }

      const toParsed = parse(event.delegateTarget.href);
      const fromParsed = parse(domLocation.href);
      const sameProto = toParsed.protocol === fromParsed.protocol;
      const sameHost = toParsed.host === fromParsed.host;
      const samePath = toParsed.path === fromParsed.path;

      if (sameProto && sameHost && samePath) {
        toParsed.hash && domLocation.reload();

        // event.preventDefault() keeps the browser from seeing the new url as an update
        // and even setting window.location does not mimic that behavior, so instead
        // we use stopPropagation() to prevent angular from seeing the click and
        // starting a digest cycle/attempting to handle it in the router.
        event.stopPropagation();
      }
    };
  }];
})
.directive('appSwitcher', function () {
  return {
    restrict: 'E',
    template: appSwitcherTemplate,
    controllerAs: 'switcher',
    controller($scope, appSwitcherEnsureNavigation) {
      // since we render this in an isolate scope we can't "require: ^chrome", but
      // rather than remove all helpfull checks we can just check here.
      if (!$scope.chrome || !$scope.chrome.getNavLinks) {
        throw new TypeError('appSwitcher directive requires the "chrome" config-object');
      }

      this.isNavLinkEnabled = isNavLinkEnabled;

      const allNavLinks = $scope.chrome.getNavLinks();
      this.shownNavLinks = allNavLinks.filter(isNavLinkShown);

      // links don't cause full-navigation events in certain scenarios
      // so we force them when needed
      this.ensureNavigation = appSwitcherEnsureNavigation;
    }
  };
});
