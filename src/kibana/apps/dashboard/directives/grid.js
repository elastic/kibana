define(function (require) {
  var _ = require('lodash');
  var $ = require('jquery');

  require('gridster');
  require('css!../../../../bower_components/gridster/dist/jquery.gridster.css');

  var app = require('modules').get('app/dashboard');

  app.directive('dashboardGrid', function ($compile) {
    return {
      restrict: 'A',
      scope : {
        grid: '=',
        control: '='
      },
      link: function ($scope, elem) {
        var width = elem.width();
        var gridster; // defined in init()

        $scope.control = $scope.control || {};

        $scope.$watch('grid', function (grid) {
          if (grid === void 0) return; // wait until we have something

          init();
          $scope.control.unserializeGrid(grid);
        });

        var init = _.once(function () {
          elem.addClass('gridster');

          elem.on('click', 'li i.remove', function (event) {
            var target = event.target.parentNode.parentNode;
            gridster.remove_widget(target);
          });

          gridster = elem.gridster({
            autogenerate_stylesheet: false,
            widget_margins: [5, 5],
            widget_base_dimensions: [((width - 100) / 12), 100],
            min_cols: 12,
            max_cols: 12,
            resize: {
              enabled: true
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
          gridster.generate_stylesheet({namespace: '.gridster'});
        });

        $scope.control.clearGrid = function (cb) {
          gridster.remove_all_widgets();
        };

        $scope.control.unserializeGrid = function (grid) {
          if (typeof grid === 'string') {
            grid = JSON.stringify(grid);
          }
          gridster.remove_all_widgets();
          grid.forEach(function (panel) {
            $scope.control.addWidget(panel);
          });
        };

        $scope.control.serializeGrid = function () {
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

          var template = '<dashboard-panel params=\'' + JSON.stringify(panel.params) + '\'></dashboard-panel>';

          var element = $compile(template)($scope);
          wgd.append(element);
          wgd.data('params', panel.params);

        };
      }
    };
  });

});