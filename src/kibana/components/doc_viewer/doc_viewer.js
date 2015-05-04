define(function (require) {
  var _ = require('lodash');
  var angular = require('angular');
  require('angular-ui-ace');

  var html = require('text!components/doc_viewer/doc_viewer.html');
  require('css!components/doc_viewer/doc_viewer.css');

  require('modules').get('kibana')
  .directive('docViewer', function (config, Private) {
    return {
      restrict: 'E',
      template: html,
      scope: {
        hit: '=',
        indexPattern: '=',
        filter: '=?',
        columns: '=?'
      },
      link: function ($scope, $el, attr) {
        // If a field isn't in the mapping, use this
        $scope.mode = 'table';
        $scope.mapping = $scope.indexPattern.fields.byName;
        $scope.flattened = $scope.indexPattern.flattenHit($scope.hit);
        $scope.hitJson = angular.toJson($scope.hit, true);
        $scope.formatted = $scope.indexPattern.formatHit($scope.hit);
        $scope.fields = _.keys($scope.flattened).sort();

        $scope.toggleColumn = function (fieldName) {
          _.toggleInOut($scope.columns, fieldName);
        };

        $scope.showArrayInObjectsWarning = function (row, field) {
          var value = $scope.flattened[field];
          return _.isArray(value) && typeof value[0] === 'object';
        };

      }
    };
  });
});
