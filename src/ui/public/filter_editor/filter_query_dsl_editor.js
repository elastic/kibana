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
    link: {
      pre: function ($scope) {
        $scope.queryDsl = _.omit($scope.filter, ['meta', '$state']);
        $scope.aceLoaded = function (editor) {
          editor.$blockScrolling = Infinity;
          const session = editor.getSession();
          session.setTabSize(2);
          session.setUseSoftTabs(true);
        };
      }
    }
  };
});
