import 'angular-ui-select';
import { uiModules } from '../../modules';
import template from './filter_params_phrase_editor.html';
import { filterParamsPhraseController } from './filter_params_phrase_controller';
import './filter_params_input_type';
import '../../directives/documentation_href';
import '../../directives/ui_select_focus_on';
import '../../directives/focus_on';
import '../../filters/sort_prefix_first';

const module = uiModules.get('kibana');
module.directive('filterParamsPhraseEditor', function () {
  return {
    restrict: 'E',
    template,
    scope: {
      field: '=',
      params: '='
    },
    controllerAs: 'filterParamsPhraseEditor',
    controller: filterParamsPhraseController
  };
});
