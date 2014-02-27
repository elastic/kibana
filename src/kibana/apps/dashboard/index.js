define(function (require) {
  var angular = require('angular');
  var _ = require('lodash');
  var $ = require('jquery');
  var configFile = require('../../../config');


  require('css!./styles/main.css');
  require('css!../../../bower_components/gridster/dist/jquery.gridster.css');
  require('directives/config');
  require('gridster');


  var app = angular.module('app/dashboard', []);

  app.controller('dashboard', function ($scope, courier) {

    // Passed in the grid attr to the directive so we can access the directive's function from
    // the controller and view
    $scope.gridControl = {foo: true};

    $scope.openSave = function () {
      $scope.configTemplate = 'kibana/apps/dashboard/partials/saveDashboard.html';
      $scope.configClose = function () {
        console.log('SAVE close');
      };
    };

    $scope.openLoad = function () {
      $scope.configTemplate = 'kibana/apps/dashboard/partials/loadDashboard.html';
      $scope.configClose = function () {
        console.log('LOAD close');
      };
    };

    $scope.save = function (title) {
      var doc = courier.createSource('doc')
        .index(configFile.kibanaIndex)
        .type('dashboard')
        .id(title);

      doc.doIndex({title: title, panels: $scope.gridControl.serializeGrid()}, function (err) {
        if (_.isUndefined(err)) { return; }
        else { throw new Error(err); }
      });
    };

    $scope.load = function (title) {
      var doc = courier.createSource('doc')
        .index(configFile.kibanaIndex)
        .type('dashboard')
        .id(title);

      doc.on('results', function loadDash(resp) {
        console.log(resp);
        if (resp.found) {
          $scope.dashboard = resp._source;
          $scope.$apply();
        }
        doc.removeListener('results', loadDash);
      });

      courier.fetch();

    };

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

    $scope.configurable = {
      dashboard: $scope.dashboard
    };


  });

  app.directive('dashboardPanel', function () {
    return {
      restrict: 'E',
      scope: {
        params: '@'
      },
      compile: function (elem, attrs) {
        var params = JSON.parse(attrs.params);
        elem.replaceWith(params.type + '<i class="link pull-right fa fa-times remove" />');
      }
    };
  });

  app.directive('dashboardGrid', function ($compile) {
    return {
      restrict: 'A',
      scope : {
        grid: '=',
        control: '='
      },
      link: function ($scope, elem) {
        var width, gridster;

        if (_.isUndefined($scope.control) || _.isUndefined($scope.grid)) {
          return;
        }

        elem.addClass('gridster');

        width = elem.width();

        var init = function () {
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

          elem.on('click', 'li i.remove', function (event) {
            var target = event.target.parentNode;
            gridster.remove_widget(event.target.parentNode);
          });

          $scope.control.unserializeGrid($scope.grid);
        };

        $scope.control.clearGrid = function (cb) {
          gridster.remove_all_widgets(cb);
        };

        $scope.control.unserializeGrid = function (grid) {
          _.each(grid, function (panel) {
            $scope.control.addWidget(panel);
          });
        };

        $scope.control.serializeGrid = function () {
          console.log(gridster.serialize());
          return gridster.serialize();
        };

        $scope.control.addWidget = function (panel) {
          panel = panel || {};
          _.defaults(panel, {
            size_x: 3,
            size_y: 2,
            params: {
              type: 'new'
            }
          });
          var wgd = gridster.add_widget('<li />',
              panel.size_x, panel.size_y, panel.col, panel.row);
          wgd.append('<dashboard-panel params=\'' + JSON.stringify(panel.params) + '\' />');
          wgd.data('params', panel.params);
          $compile(wgd)($scope);
        };

        // Start the directive
        init();
      }
    };
  });
});