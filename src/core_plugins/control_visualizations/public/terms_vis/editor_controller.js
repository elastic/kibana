import { uiModules } from 'ui/modules';
import { TermsVisEditor } from './components/terms_vis_editor';

const module = uiModules.get('kibana/terms_vis', ['kibana', 'react']);
module.controller('KbnTermsEditorController', ($scope, indexPatterns) => {
  $scope.reactProps = {
    indexPatterns: indexPatterns,
    visParams: $scope.vis.params,
    setVisParam: (paramName, paramValue) => {
      $scope.vis.params[paramName] = paramValue;
    },
    getIndexPatternIds: () => {
      return indexPatterns.getIds();
    },
    getIndexPattern: (indexPatternId) => {
      return indexPatterns.get(indexPatternId);
    }
  };
});

module.value('TermsVisEditor', TermsVisEditor);
