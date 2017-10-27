import { get } from 'lodash';
import { documentationLinks } from '../documentation_links';
import { uiModules } from 'ui/modules';

const module = uiModules.get('kibana');

module.directive('documentationHref', function () {
  return {
    restrict: 'A',
    link: function (scope, element, attributes) {
      element.attr('href', get(documentationLinks, attributes.documentationHref));
    }
  };
});
