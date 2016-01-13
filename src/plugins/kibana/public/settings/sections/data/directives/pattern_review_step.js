var modules = require('ui/modules');
var template = require('plugins/kibana/settings/sections/data/directives/pattern_review_step.html');
var _ = require('lodash');
var editFieldTypeHTML = require('plugins/kibana/settings/sections/data/partials/_edit_field_type.html');

var testData = {
  message: 'src=1.1.1.1 evil=1',
  src: '1.1.1.1',
  evil: '1',
  coordinates: {
    lat: 37.3894,
    lon: 122.0819
  },
  '@timestamp': '2015-11-24T00:00:00.000Z'
};

modules.get('apps/settings')
  .directive('patternReviewStep', function () {
    return {
      template: template,
      scope: {
        sampleDocs: '=',
        indexPattern: '=',
        pipeline: '='
      },
      controller: function ($scope, Private) {
        $scope.sampleDocs = testData;
        if (_.isUndefined($scope.indexPattern)) {
          $scope.indexPattern = {};
        }

        _.defaults($scope.indexPattern, {
          id: 'filebeat-*',
          title: 'filebeat-*',
          timeFieldName: '@timestamp',
          fields: _.map($scope.sampleDocs, (value, key) => {
            return {name: key, type: typeof value};
          })
        });

        $scope.isTimeBased = !!$scope.indexPattern.timeFieldName;

        $scope.$watch('indexPattern.id', function (value) {
          $scope.indexPattern.title = value;
        });

        $scope.columns = [
          {title: 'Field'},
          {title: 'Type'},
          {title: 'Example', sortable: false}
        ];

        $scope.rows = _.map($scope.indexPattern.fields, (field) => {
          return [
            field.name,
            {
              markup: editFieldTypeHTML,
              scope: _.assign($scope.$new(), {field: field})
            },
            $scope.sampleDocs[field.name]
          ];
        });
      }
    };
  });

