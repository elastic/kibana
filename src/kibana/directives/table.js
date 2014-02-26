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

  var defaults = {
    columns: [],
    rows: []
  };

  module.directive('kbnTable', function () {
    return {
      restrict: 'E',
      template: html,
      scope: {
        columns: '=',
        rows: '='
      },
      controller: function ($scope) {
        _.defaults($scope, defaults);

        $scope.makeRowHtml = function (row) {
          var html = '<tr>';
          _.each($scope.columns, function (col) {
            html += '<td>';
            if (row[col] !== void 0) {
              html += row[col];
            } else {
              html += row._source[col];
            }
            html += '</td>';
          });
          html += '</tr>';
          return html;
        };
      }
    };
  });
});