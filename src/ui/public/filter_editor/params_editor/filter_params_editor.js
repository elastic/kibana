import { uiModules } from 'ui/modules';
import template from './filter_params_editor.html';
import './filter_params_phrase_editor';
import './filter_params_phrases_editor';
import './filter_params_range_editor';

const module = uiModules.get('kibana');
module.directive('filterParamsEditor', function () {
  return {
    restrict: 'E',
    template,
    scope: {
      field: '=',
      operator: '=',
      params: '='
    }
  };
});
