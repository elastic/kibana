define(function (require) {
  require('modules')
  .get('kibana')
  .directive('paginatedTable', function ($filter, config, Private) {
    var _ = require('lodash');
    var orderBy = $filter('orderBy');

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
          if (col.sortable === false) return;
          var sortDirection;
          var cols = _.pluck($scope.columns, 'title');
          var index = cols.indexOf(col.title);

          if (index === -1) return;

          if (self.sort.columnName !== col.title) {
            sortDirection = 'asc';
          } else {
            var directions = {
              null: 'asc',
              'asc': 'desc',
              'desc': null
            };
            sortDirection = directions[self.sort.direction];
          }

          self.sort.columnName = col.title;
          self.sort.direction = sortDirection;
          self._setSortGetter(index);
        };

        self._setSortGetter = function (index) {
          if (_.isFunction($scope.sortHandler)) {
            // use custom sort handler
            self.sort.getter = $scope.sortHandler(index);
          } else {
            // use generic sort handler
            self.sort.getter = function (row) {
              var value = row[index];
              if (value && value.value != null) return value.value;
              return value;
            };
          }
        };

        // update the sordedRows result
        $scope.$watch('rows', rowSorter);
        $scope.$watchCollection('paginatedTable.sort', rowSorter);

        function rowSorter() {
          if (self.sort.direction == null) {
            $scope.sortedRows = $scope.rows.slice(0);
            return;
          }

          $scope.sortedRows = orderBy($scope.rows, self.sort.getter, self.sort.direction === 'desc');
        }
      }
    };
  });
});
