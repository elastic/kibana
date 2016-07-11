
import appSwitcherLinkTemplate from './app_switcher_link.html';
import uiModules from 'ui/modules';

const module = uiModules.get('kibana');

module.directive('appSwitcherLink', function () {
  return {
    restrict: 'E',
    scope: {
      isActive: '=appSwitcherLinkIsActive',
      isDisabled: '=appSwitcherLinkIsDisabled',
      tooltip: '=appSwitcherLinkTooltip',
      onClick: '&appSwitcherLinkOnClick',
      href: '=appSwitcherLinkHref',
      icon: '=appSwitcherLinkIcon',
      title: '=appSwitcherLinkTitle'
    },
    template: appSwitcherLinkTemplate
  };
});
