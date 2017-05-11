import { uiModules } from 'ui/modules';
import { TermsVis } from './components/terms_vis';

const module = uiModules.get('kibana/terms_vis', ['kibana', 'react']);
module.controller('KbnTermsController', function ($scope) {
  $scope.reactProps = {
    visParams: $scope.vis.params
  };

  $scope.$watch('vis.params', function (visParams, oldParams) {
    if (visParams !== oldParams) {
      $scope.reactProps.visParams = visParams;
    }
  });
});

module.value('TermsVis', TermsVis);