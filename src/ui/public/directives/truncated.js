define(function (require) {
  let module = require('ui/modules').get('kibana');
  let $ = require('jquery');

  module.directive('kbnTruncated', function ($compile) {
    return {
      restrict: 'E',
      scope: {
        orig: '@',
        length: '@'
      },
      template: function ($element, attrs) {
        let template = '<span>{{text}}</span>';
        template += '<span ng-if="orig.length > length"> <a ng-click="toggle()">{{action}}</a></span>';
        return template;
      },
      link: function ($scope, $element, attrs) {

        let fullText = $scope.orig;
        let truncated = fullText.substring(0, $scope.length);

        if (fullText === truncated) {
          $scope.text = fullText;
          return;
        }

        truncated += '...';

        $scope.expanded = false;
        $scope.text = truncated;
        $scope.action = 'more';

        $scope.toggle = function () {
          $scope.expanded = !$scope.expanded;
          $scope.text = $scope.expanded ? fullText : truncated;
          $scope.action = $scope.expanded ? 'less' : 'more';
        };
      }
    };
  });
});
