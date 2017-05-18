import 'ace';
import { uiModules } from 'ui/modules';
import template from './filter_dsl_editor.html';

const module = uiModules.get('kibana');
module.directive('filterDslEditor', function () {
  return {
    restrict: 'E',
    template,
    scope: {
      ngModel: '='
    },
    controllerAs: 'filterDslEditor',
    bindToController: true,
    controller: function ($scope) {
      $scope.aceLoaded = function (editor) {
        editor.$blockScrolling = Infinity;
        const session = editor.getSession();
        session.setTabSize(2);
        session.setUseSoftTabs(true);
      };
    }
  };
});
