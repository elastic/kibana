const app = require('ui/modules').get('kibana');
const jsondiffpatch = require('jsondiffpatch');
const htmlFormat = jsondiffpatch.formatters.html.format;
require('../styles/_output_preview.less');

app.directive('outputPreview', function () {
  return {
    restrict: 'E',
    template: require('../views/output_preview.html'),
    scope: {
      oldObject: '=',
      newObject: '='
    },
    link: function ($scope, $el) {
      const div = $el.find('.visual')[0];

      $scope.diffpatch = jsondiffpatch.create({
        arrays: {
          detectMove: false
        }
      });

      $scope.updateUi = function () {
        const left = $scope.oldObject;
        const right = $scope.newObject;
        let delta = $scope.diffpatch.diff(left, right);
        if (!delta) delta = {};

        div.innerHTML = htmlFormat(delta, left);
      };
    },
    controller: function ($scope, debounce) {
      $scope.collapsed = true;

      function updateOutput() {
        $scope.updateUi();
      }
      updateOutput = debounce(updateOutput, 200);

      $scope.$watch('oldObject', updateOutput);
      $scope.$watch('newObject', updateOutput);
    }
  };
});
