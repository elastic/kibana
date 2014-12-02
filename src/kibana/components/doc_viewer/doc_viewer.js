define(function (require) {
  var _ = require('lodash');

  var html = require('text!components/doc_viewer/doc_viewer.html');

  require('modules').get('kibana')
  .directive('docViewer', function (config, courier) {
    return {
      restrict: 'E',
      template: html,
      transclude: true,
      replace: true,
      scope: {
        hit: '=',
        indexPattern: '=',
        filter: '=?',
      },
      link: function ($scope, $el, attr) {

        // If a field isn't in the mapping, use this
        var defaultFormat = courier.indexPatterns.fieldFormats.defaultByType.string;

        $scope.mode = 'table';
        $scope.mapping = $scope.indexPattern.fields.byName;

        $scope.flattened = $scope.indexPattern.flattenHit($scope.hit);
        $scope.formatted =  _.mapValues($scope.flattened, function (value, name) {
          var formatter = $scope.mapping[name] ? $scope.mapping[name].format : defaultFormat;
          return formatter.convert(value);
        });
        $scope.fields = _.keys($scope.flattened).sort();

        $scope.showFilters = function (mapping) {
          var validTypes = ['string', 'number', 'date', 'ip'];
          if (!$scope.filter || !mapping || !mapping.indexed) return false;
          return _.contains(validTypes, mapping.type);
        };

        $scope.showArrayInObjectsWarning = function (row, field) {
          var value = $scope.flattened[field];
          return _.isArray(value) && typeof value[0] === 'object';
        };

      }
    };
  });
});