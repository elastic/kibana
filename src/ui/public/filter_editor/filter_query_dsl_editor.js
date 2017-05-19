import 'ace';
import _ from 'lodash';
import { uiModules } from 'ui/modules';
import template from './filter_query_dsl_editor.html';

const module = uiModules.get('kibana');
module.directive('filterQueryDslEditor', function () {
  return {
    restrict: 'E',
    template,
    scope: {
      filter: '=',
      onChange: '&'
    },
    controllerAs: 'filterQueryDslEditor',
    bindToController: true,
    controller: function ($scope) {
      this.queryDsl = _.omit(this.filter, ['meta', '$state']);
      $scope.aceLoaded = function (editor) {
        editor.$blockScrolling = Infinity;
        const session = editor.getSession();
        session.setTabSize(2);
        session.setUseSoftTabs(true);
      };
    }
  };
});
