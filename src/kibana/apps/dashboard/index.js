define(function (require) {
  var angular = require('angular');
  var _ = require('lodash');
  var $ = require('jquery');

  require('css!./styles/main.css');
  require('css!../../../bower_components/gridster/dist/jquery.gridster.css');
  require('gridster');


  var app = angular.module('app/dashboard', []);

  app.controller('dashboard', function ($scope) {
    $scope.gridSettings = {

    };

    $scope.panels = [
      {
        col: 1,
        row: 1,
        size_x: 5,
        size_y: 2
      },
      {
        col: 6,
        row: 1,
        size_x: 4,
        size_y: 2
      },
      {
        col: 10,
        row: 1,
        size_x: 3,
        size_y: 1
      },
      {
        col: 10,
        row: 2,
        size_x: 3,
        size_y: 1
      },
      {
        col: 1,
        row: 3,
        size_x: 3,
        size_y: 1
      },
      {
        col: 4,
        row: 3,
        size_x: 3,
        size_y: 1
      },
      {
        col: 7,
        row: 3,
        size_x: 3,
        size_y: 1
      },
      {
        col: 10,
        row: 3,
        size_x: 3,
        size_y: 1
      }
    ];

    $scope.serializeGrid = function () {
      console.log($scope.gridster.serialize());
    };
  });

  app.directive('dashboardGrid', function () {
    return {
      restrict: 'A',
      link: function ($scope, elem) {
        var width;

        elem.addClass('gridster');

        width = elem.width();

        $scope.gridster = elem.gridster({
          widget_margins: [5, 5],
          widget_base_dimensions: [((width - 80) / 12), 100],
          min_cols: 12,
          max_cols: 12,
          resize: {
            enabled: true,
            stop: function (event, ui, widget) {
              console.log(widget.height());
              widget.children('.content').text('height: ' + widget.height() + ' / width: ' + widget.width());
            }
          }
        }).data('gridster');

        _.each($scope.panels, function (panel, i) {
          $scope.gridster.add_widget('<li><div class="content"><h1><center>' +
            i +
            '</center></h1></div></li>', panel.size_x, panel.size_y, panel.col, panel.row);
        });
      }
    };
  });
});