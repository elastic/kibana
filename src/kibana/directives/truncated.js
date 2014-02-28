define(function (require) {
  var module = require('angular').module('kibana/directives');
  var $ = require('jquery');

  module.directive('kbnTruncated', function ($compile) {
    return {
      restrict: 'E',
      scope: {
        orig: '@',
        length: '@'
      },
      template: function ($element, attrs) {
        var template = '<span>{{text}}</span>';
        if (attrs.length && attrs.orig && attrs.orig.length > attrs.length) {
          template += ' <a ng-click="toggle($event)">{{action}}</a>';
        }
        return template;
      },
      link: function ($scope, $element, attrs) {
        var fullText = $scope.orig;
        var truncated = fullText.substring(0, $scope.length);

        if (fullText === truncated) return;

        truncated += '...';

        $scope.expanded = false;
        $scope.text = truncated;
        $scope.action = 'more';

        $scope.toggle = function ($event) {
          $event.stopPropagation();
          $scope.expanded = !$scope.expanded;
          $scope.text = $scope.expanded ? fullText : truncated;
          $scope.action = $scope.expanded ? 'less' : 'more';
        };
      }
    };
  });
});