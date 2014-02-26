define(function (require) {
  var angular = require('angular');
  var _ = require('lodash');
  var $ = require('jquery');

  require('css!./styles/main.css');
  require('css!../../../bower_components/gridster/dist/jquery.gridster.css');
  require('gridster');


  var app = angular.module('app/dashboard', []);

  app.controller('dashboard', function ($scope) {

    $scope.gridControl = {};

    $scope.dashboard = {
      title: 'Logstash Dashboard',
      panels: [
        {
          col: 1,
          row: 1,
          size_x: 5,
          size_y: 2,
          params: { type: 'line' }
        },
        {
          col: 6,
          row: 1,
          size_x: 4,
          size_y: 2,
          params: { type: 'bar' }
        },
        {
          col: 10,
          row: 1,
          size_x: 3,
          size_y: 1,
          params: { type: 'table' }
        },
        {
          col: 10,
          row: 2,
          size_x: 3,
          size_y: 1,
          params: { type: 'pie' }
        },
        {
          col: 1,
          row: 3,
          size_x: 3,
          size_y: 1,
          params: { type: 'scatter' }
        },
        {
          col: 4,
          row: 3,
          size_x: 3,
          size_y: 1,
          params: { type: 'map' }
        },
        {
          col: 7,
          row: 3,
          size_x: 3,
          size_y: 1,
          params: { type: 'sparkline' }
        },
        {
          col: 10,
          row: 3,
          size_x: 3,
          size_y: 1,
          params: { type: 'heatmap' }
        }
      ]
    };


  });

  app.directive('dashboardPanel', function () {
    return {
      template: '<li />'
    };
  });

  app.directive('dashboardGrid', function () {
    return {
      restrict: 'A',
      scope : {
        grid: '=',
        control: '='
      },
      link: function ($scope, elem) {
        var width, gridster;

        elem.addClass('gridster');

        width = elem.width();

        $scope.control.serializeGrid = function () {
          console.log(gridster.serialize());
          return gridster.serialize();
        };

        $scope.control.addWidget = function () {
          gridster.add_widget('<li><div class="content"></div></li>', 3, 2);
        };

        gridster = elem.gridster({
          widget_margins: [5, 5],
          widget_base_dimensions: [((width - 80) / 12), 100],
          min_cols: 12,
          max_cols: 12,
          resize: {
            enabled: true,
            stop: function (event, ui, widget) {
              console.log(widget.height(), widget.width());
            }
          },
          serialize_params: function (el, wgd) {
            return {
              col: wgd.col,
              row: wgd.row,
              size_x: wgd.size_x,
              size_y: wgd.size_y,
              params: el.data('params')
            };
          }
        }).data('gridster');

        _.each($scope.grid, function (panel) {
          console.log(panel);
          var wgd = gridster.add_widget('<li />',
            panel.size_x, panel.size_y, panel.col, panel.row);
          wgd.html(panel.params.type + ' <i class="link pull-right fa fa-times remove" />');
          wgd.data('params', panel.params);
        });

        elem.on('click', 'li i.remove', function (event) {
          var target = event.target.parentNode;
          gridster.remove_widget(event.target.parentNode);
        });
      }
    };
  });
});