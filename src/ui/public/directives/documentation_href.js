import { getDocLink } from '../documentation_links';
import { uiModules } from '../modules';

const module = uiModules.get('kibana');

module.directive('documentationHref', function () {
  return {
    restrict: 'A',
    link: function (scope, element, attributes) {
      element.attr('href', getDocLink(attributes.documentationHref));
    }
  };
});
