define(function (require) {
  require('modules')
  .get('kibana')
  .directive('paginatedTable', function (config, Private) {
    var _ = require('lodash');

    return {
      restrict: 'E',
      template: require('text!components/paginated_table/paginated_table.html'),
      transclude: true,
      scope: {
        rows: '=',
        columns: '=',
        perPage: '=?',
        sortHandler: '=?',
        showSelector: '=?'
      },
      controllerAs: 'paginatedTable',
      controller: function ($scope) {
        var self = this;
        self.sort = {
          columnName: null,
          direction: null
        };

        self.sortColumn = function (col) {
          if (!$scope.sortHandler) return;

          // TODO: track sort direction

          self._setSortDirection(col.title);
          $scope.sortHandler(col, self.sort);
        };

        self._setSortDirection = function (columnName) {
          if (self.sort.columnName !== columnName) {
            self.sort.direction = 'asc';
          } else {
            var directions = {
              null: 'asc',
              'asc': 'desc',
              'desc': null
            };
            var direction = directions[self.sort.direction];
            self.sort.direction = direction;

          }
          self.sort.columnName = columnName;
        };
      }
    };
  });
});
