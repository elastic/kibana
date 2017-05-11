import { uiModules } from 'ui/modules';
import { TermsVisEditor } from './components/terms_vis_editor';

const module = uiModules.get('kibana/terms_vis', ['kibana', 'react']);
module.controller('KbnTermsEditorController', function ($scope) {
  $scope.reactProps = {
    visParams: $scope.vis.params,
    setVisParam: function (paramName, paramValue) {
      $scope.vis.params[paramName] = paramValue;
    }
  };
});

module.value('TermsVisEditor', TermsVisEditor);