define(function (require) {
  var module = require('modules').get('apps/visualize');
  module.directive('visualizeExtras', function (Private, $compile) {

    var $ = require('jquery');
    var _ = require('lodash');
    var contentTemplate = require('text!apps/visualize/visualize_extras/_spy.html');
    var link = Private(require('apps/visualize/visualize_extras/_spy'));

    return {
      restrict: 'E',
      template: require('text!apps/visualize/visualize_extras/_extras.html'),
      link: function ($scope, $el) {
        $scope.currentExtra = null;

        $scope.toggleExtra = function () {
          var current = $scope.currentExtra;

          if (current) {
            current.$container.remove();
            current.$scope.$destroy();
            return $scope.renderExtra(null);
          }

          current = {
            $scope: $scope.$new(),
            $container: $('<div class="visualize-extra-container">').appendTo($el)
          };

          current.$container.append($compile(contentTemplate)(current.$scope));
          link(current.$scope, current.$container);
          $scope.renderExtra(current);
        };
      }
    };
  });
});