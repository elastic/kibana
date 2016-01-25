const app = require('ui/modules').get('kibana');
const _ = require('lodash');
const $ = require('jquery');
const jsondiffpatch = require('jsondiffpatch');
const htmlFormat = jsondiffpatch.formatters.html.format;

app.directive('outputPreview', function () {
  return {
    restrict: 'E',
    template: require('../views/output_preview.html'),
    scope: {
      oldObject: '=',
      newObject: '='
    },
    link: function($scope, $el) {
      const div = $el.find('.visual')[0];

      $scope.diffpatch = jsondiffpatch.create({
        arrays: {
          detectMove: false
        }
      });

      $scope.collapsed = true;

      $scope.updateUi = function() {
        const left = $scope.oldObject;
        const right = $scope.newObject;
        const delta = $scope.diffpatch.diff(left, right);

        div.innerHTML = htmlFormat(delta, left);
      }
    },
    controller: function ($scope) {
      function updateOutput() {
        $scope.updateUi();
      }

      $scope.$watch('oldObject', updateOutput);
      $scope.$watch('newObject', updateOutput);
    }
  };
});
