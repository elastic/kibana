define(function (require) {
  var html = require('text!partials/table.html');
  var angular = require('angular');
  var _ = require('lodash');

  var module = angular.module('kibana/directives');

  /**
   * kbnTable directive
   *
   * displays results in a simple table view. Pass the result object
   * via the results attribute on the kbnTable element:
   * ```
   * <kbn-table results="queryResult"></kbn-table>
   * ```
   */
  module.directive('kbnTable', function () {
    return {
      restrict: 'E',
      template: html,
      scope: {
        columns: '=',
        rows: '='
      },
      link: function (scope, element, attrs) {
        scope.$watch('rows', render);
        scope.$watch('columns', render);

        function render() {
          var $body = element.find('tbody').empty();

          if (!scope.rows || scope.rows.length === 0) return;
          if (!scope.columns || scope.columns.length === 0) return;

          _.each(scope.rows, function (row) {
            var tr = document.createElement('tr');

            _.each(scope.columns, function (name) {
              var td = document.createElement('td');
              td.innerText = row._source[name] || row[name] || '';
              tr.appendChild(td);
            });

            $body.append(tr);
          });
        }
      }
    };
  });
});