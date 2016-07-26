
import appSwitcherLinkTemplate from './app_switcher_link.html';
import './app_switcher_link.less';
import uiModules from 'ui/modules';

const module = uiModules.get('kibana');

module.directive('appSwitcherLink', chrome => {
  return {
    restrict: 'E',
    replace: true,
    scope: {
      isActive: '=appSwitcherLinkIsActive',
      isDisabled: '=appSwitcherLinkIsDisabled',
      tooltip: '=appSwitcherLinkTooltip',
      onClick: '&appSwitcherLinkOnClick',
      href: '=appSwitcherLinkHref',
      kbnRoute: '=appSwitcherLinkKbnRoute',
      icon: '=appSwitcherLinkIcon',
      title: '=appSwitcherLinkTitle'
    },
    template: appSwitcherLinkTemplate,
    link: scope => {
      scope.getHref = () => {
        if (scope.href) {
          return scope.href;
        }

        if (scope.kbnRoute) {
          return chrome.addBasePath(scope.kbnRoute);
        }
      };
    }
  };
});
