var modules = require('ui/modules');
var template = require('plugins/kibana/settings/sections/data/directives/pattern_review_step.html');
var _ = require('lodash');

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
        docs: '=',
        save: '&onSave'
      },
      controller: function ($scope, Private) {
        $scope.docs = testData;
        $scope.columns = [
          {title: 'Field'},
          {title: 'Type'},
          {title: 'Example', sortable: false}
        ];

        $scope.rows = _.map($scope.docs, (value, key) => {
          return [key, 'type', value];
        });
      }
    };
  });

