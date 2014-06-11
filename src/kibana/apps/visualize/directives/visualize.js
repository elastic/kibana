define(function (require) {
  var k4d3 = require('k4d3');
  var $ = require('jquery');
  var _ = require('lodash');
  var typeDefs = require('../saved_visualizations/_type_defs');


  require('css!../styles/visualization.css');
  require('../visualize_extras/extras');

  var module = require('modules').get('kibana/directive');

  module.directive('visualize', function (createNotifier, SavedVis, indexPatterns) {
    return {
      restrict: 'E',
      scope : {
        vis: '=',
      },
      template: require('text!../partials/visualize.html'),
      link: function ($scope, $el) {
        var chart; // set in "vis" watcher
        var notify = createNotifier();

        var $visualize = $el.find('.visualize-chart');
        var $extras = $el.find('visualize-extras');

        $scope.fields = {};
        $scope.currentExtra = false;
        $scope.onlyShowExtra = false;

        var applyClassNames = function () {
          // external
          $el.toggleClass('only-visualization', !$scope.currentExtra);
          $el.toggleClass('visualization-and-extra', $scope.currentExtra && !$scope.onlyShowExtra);
          $el.toggleClass('only-extra', Boolean($scope.onlyShowExtra));

          $extras.toggleClass('only', Boolean($scope.onlyShowExtra));

          // internal
          $visualize.toggleClass('extra-visible', Boolean($scope.currentExtra));
          $visualize.toggleClass('extra-only', Boolean($scope.onlyShowExtra));
        };

        var calcResponsiveStuff = function () {
          if ($scope.currentExtra && $scope.currentExtra.name === 'spy') {
            $scope.onlyShowExtra = true;
          } else {
            $scope.onlyShowExtra = $scope.currentExtra && $el.height() < 550;
          }
        };

        var render = function () {
          applyClassNames();
          if (chart && $scope.chartData && !$scope.onlyShowExtra) {
            notify.event('call chart render', function () {
              chart.render($scope.chartData);
            });
          }
        };

        // provide a setter to the visualize-extras directive
        $scope.renderExtra = function (extra) {
          $scope.currentExtra = extra || false;
          calcResponsiveStuff();
          render();
        };

        $scope.$watch('vis', function (vis, prevVis) {
          if (prevVis && vis !== prevVis && prevVis.destroy) prevVis.destroy();
          if (chart) {
            chart.off('hover');
            chart.off('click');
            chart.destroy();
          }

          if (!vis) return;

          if (vis.error) {
            $el.html('<div class="visualize-error"><i class="fa fa-exclamation-triangle"></i><br>' + vis.error + '</div>');
            return;
          }

          var typeDefinition = typeDefs.byName[vis.typeName];
          var params = {
            type: vis.typeName,
          };

          $scope.fields = vis.searchSource.get('index').fieldsByName;

          _.merge(params, vis.params);
          _.defaults(params, typeDefinition.params);

          chart = new k4d3.Chart($visualize[0], params);

          // For each type of interaction, assign the the handler if the vis object has it
          // otherwise use the typeDef, otherwise, do nothing.
          _.each({hover: 'onHover', click: 'onClick', brush: 'onBrush'}, function (func, event) {
            var callback = vis[func] || typeDefinition[func];
            if (!!callback) chart.on(event, callback);
          });



          vis.searchSource.onResults(function onResults(resp) {
            $scope.chartData = vis.buildChartDataFromResponse(vis.searchSource.get('index'), resp);
            render();
          }).catch(notify.fatal);

          vis.searchSource.onError(notify.error);

          $scope.$root.$broadcast('ready:vis');
        });

        $scope.$on('resize', function () {
          var old;
          (function waitForAnim() {
            var cur = $el.width() + ':' + $el.height();
            if (cur !== old) {
              old = cur;
              // resize can sometimes be called before animations on the element are complete.
              // check each 50ms if the animations are complete and then render when they are
              return setTimeout(waitForAnim, 200);
            }

            calcResponsiveStuff();
            applyClassNames();

            // chart reference changes over time, don't bind to a specific chart object.
            if (chart) chart.resize();
          }());
        });

        $scope.$on('$destroy', function () {
          if ($scope.vis) $scope.vis.destroy();
          if (chart) {
            chart.off('hover');
            chart.off('click');
            chart.destroy();
          }
        });
      }
    };
  });
});