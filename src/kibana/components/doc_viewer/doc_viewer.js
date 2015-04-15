define(function (require) {
  var _ = require('lodash');
  var angular = require('angular');
  require('angular-ui-ace');

  var html = require('text!components/doc_viewer/doc_viewer.html');
  require('css!components/doc_viewer/doc_viewer.css');

  require('modules').get('kibana')
  .directive('docViewer', function (config, Private) {
    var formats = Private(require('components/index_patterns/_field_formats'));

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
        var defaultFormat = formats.defaultByType.string;

        $scope.mode = 'table';
        $scope.mapping = $scope.indexPattern.fields.byName;

        $scope.flattened = $scope.indexPattern.flattenHit($scope.hit);
        $scope.hit_json = angular.toJson($scope.hit, true);
        $scope.formatted =  _.mapValues($scope.flattened, function (value, name) {
          var mapping = $scope.mapping[name];
          var formatter = (mapping && mapping.format) ? mapping.format : defaultFormat;
          if (_.isArray(value) && typeof value[0] === 'object') {
            value = JSON.stringify(value, null, '  ');
          }
          return formatter.convert(value);
        });
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
