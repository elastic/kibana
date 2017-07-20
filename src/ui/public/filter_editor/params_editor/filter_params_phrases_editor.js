import 'angular-ui-select';
import { uiModules } from 'ui/modules';
import template from './filter_params_phrases_editor.html';
import { filterParamsPhraseController } from './filter_params_phrase_controller';
import '../../directives/ui_select_focus_on';
import '../../filters/sort_prefix_first';

const module = uiModules.get('kibana');
module.directive('filterParamsPhrasesEditor', function () {
  return {
    restrict: 'E',
    template,
    scope: {
      field: '=',
      params: '='
    },
    controllerAs: 'filterParamsPhrasesEditor',
    controller: filterParamsPhraseController
  };
});
