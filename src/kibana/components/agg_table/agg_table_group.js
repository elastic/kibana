define(function (require) {
  require('services/compile_recursive_directive');
  require('components/agg_table/agg_table');

  require('modules')
  .get('kibana')
  .directive('kbnAggTableGroup', function (compileRecursiveDirective) {
    return {
      restrict: 'E',
      template: require('text!components/agg_table/agg_table_group.html'),
      scope: {
        group: '=',
        perPage: '=?'
      },
      compile: function ($el) {
        // Use the compile function from the RecursionHelper,
        // And return the linking function(s) which it returns
        return compileRecursiveDirective.compile($el, {
          post: function ($scope) {
            $scope.$watch('group', function (group) {
              if (group && !group.tables.length) {
                group = null;
              }

              if (!group) {
                $scope.rows = $scope.columns = false;
                return;
              }

              var firstTable = group.tables[0];
              var params = firstTable.aggConfig && firstTable.aggConfig.params;
              // render groups that have Table children as if they were rows, because itteration is cleaner
              var childLayout = (params && !params.row) ? 'columns' : 'rows';

              $scope[childLayout] = group.tables;
            });
          }
        });
      }
    };
  });
});
