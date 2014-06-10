define(function (require) {
  // require('angular-ui-ace');

  var module = require('modules').get('app/visualize', ['ui.ace']);
  module.directive('visualizeExtras', function (Private, $compile) {

    var $ = require('jquery');
    var _ = require('lodash');

    var extras = [
      {
        name: 'table',
        desc: 'tabular visualization data',
        link: Private(require('./_table')),
        template: require('text!./_table.html'),
        icon: 'fa-table'
      },
      {
        name: 'spy',
        desc: 'visualization request history',
        link: Private(require('./_spy')),
        template: require('text!./_spy.html'),
        icon: 'fa-search'
      }
    ];
    extras.byName = _.indexBy(extras, 'name');

    return {
      restrict: 'E',
      template: require('text!./_extras.html'),
      link: function ($scope, $el) {
        $scope.currentExtra = null;
        $scope.extras = extras;


        $scope.toggleExtra = function (name) {
          var current = $scope.currentExtra;

          if (current) {
            current.$container.remove();
            current.$scope.$destroy();
          }

          if (current && current.name === name) {
            // toggle out the current extra, don't proceed any further
            return $scope.setCurrentExtra(null);
          }

          var newExtra = extras.byName[name];
          current = {
            name: name,
            $scope: $scope.$new(),
            $container: $('<div class="visualize-extra-container">').appendTo($el)
          };

          current.$container.append($compile(newExtra.template)(current.$scope));
          newExtra.link(current.$scope, current.$container);
          $scope.setCurrentExtra(current);
        };
      }
    };
  });
});