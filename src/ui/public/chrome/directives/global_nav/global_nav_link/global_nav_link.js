
import globalNavLinkTemplate from './global_nav_link.html';
import './global_nav_link.less';
import { uiModules } from 'ui/modules';

const module = uiModules.get('kibana');

module.directive('globalNavLink', () => {
  return {
    restrict: 'E',
    replace: true,
    scope: {
      isActive: '=',
      isDisabled: '=',
      tooltipContent: '=',
      onClick: '&',
      url: '=',
      icon: '=',
      label: '=',
    },
    template: globalNavLinkTemplate,
  };
});
