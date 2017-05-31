import { uiModules } from 'ui/modules';
import template from './filter_params_range_editor.html';
import { documentationLinks } from 'ui/documentation_links/documentation_links';
import './filter_params_input_type';
import '../../directives/focus_on';

const module = uiModules.get('kibana');
module.directive('filterParamsRangeEditor', function () {
  return {
    restrict: 'E',
    template,
    scope: {
      field: '=',
      params: '='
    },
    link: function (scope) {
      scope.dateDocLinks = documentationLinks.date;
    }
  };
});
