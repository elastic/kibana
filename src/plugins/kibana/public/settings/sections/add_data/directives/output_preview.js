const app = require('ui/modules').get('kibana');
const _ = require('lodash');
const $ = require('jquery');
const jsondiffpatch = require('jsondiffpatch');

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

      $scope.jsondiffpatch = jsondiffpatch.create({
        arrays: {
          detectMove: false
        }
      });

      $scope.collapsed = true;


      //diff.diff($scope.oldObject, $scope.newObject);

      //div.innerHTML = diff.formatters.format(delta, left);
      //
      $scope.updateUi = function() {
        const meow = $scope.jsondiffpatch;

        const left = $scope.oldObject;
        const delta = meow.diff($scope.oldObject, $scope.newObject);

        //console.log('delta', delta);
        // console.log('jsondiffpatch', jsondiffpatch);
        // console.log('meow', meow);
        // console.log(jsondiffpatch.formatters.html.format(delta, left));
        div.innerHTML = jsondiffpatch.formatters.html.format(delta, left);
      }
    },
    controller: function ($scope) {

      function updateOutput() {
        //console.log('controller', $scope.oldObject, $scope.newObject);
        $scope.updateUi();
      }

      $scope.$watch('oldObject', updateOutput);
      $scope.$watch('newObject', updateOutput);
    }
  };
});
