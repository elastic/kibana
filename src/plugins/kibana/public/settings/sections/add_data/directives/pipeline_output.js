const app = require('ui/modules').get('kibana');
const _ = require('lodash');
const $ = require('jquery');

app.directive('pipelineOutput', function () {
  return {
    restrict: 'E',
    template: require('../views/pipeline_output.html'),
    scope: {
      pipeline: '='
    },
    controller: function ($scope) {
      $scope.collapsed = true;
    }
  };
});
