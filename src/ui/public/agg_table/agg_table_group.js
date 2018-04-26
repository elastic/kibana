import 'angular';
import 'angular-recursion';
import './';
import { uiModules } from '../modules';
import aggTableGroupTemplate from './agg_table_group.html';

uiModules
  .get('kibana', ['RecursionHelper'])
  .directive('kbnAggTableGroup', function (RecursionHelper) {
    return {
      restrict: 'E',
      template: aggTableGroupTemplate,
      scope: {
        group: '=',
        perPage: '=?',
        sort: '=?',
        exportTitle: '=?',
        showTotal: '=',
        totalFunc: '='
      },
      compile: function ($el) {
      // Use the compile function from the RecursionHelper,
      // And return the linking function(s) which it returns
        return RecursionHelper.compile($el, {
          post: function ($scope) {
            $scope.$watch('group', function (group) {
            // clear the previous "state"
              $scope.rows = $scope.columns = false;

              if (!group || !group.tables.length) return;

              const firstTable = group.tables[0];
              const params = firstTable.aggConfig && firstTable.aggConfig.params;
              // render groups that have Table children as if they were rows, because iteration is cleaner
              const childLayout = (params && !params.row) ? 'columns' : 'rows';

              $scope[childLayout] = group.tables;
            });
          }
        });
      }
    };
  });
