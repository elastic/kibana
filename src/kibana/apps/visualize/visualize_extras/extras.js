define(function (require) {
  // require('angular-ui-ace');

  var module = require('modules').get('app/visualize');
  module.directive('visualizeExtras', function (Private, $compile) {

    var $ = require('jquery');
    var _ = require('lodash');
    var contentTemplate = require('text!./_spy.html');
    var link = Private(require('./_spy'));

    return {
      restrict: 'E',
      template: require('text!./_extras.html'),
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