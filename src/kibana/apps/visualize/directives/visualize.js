define(function (require) {
  var vislib = require('components/vislib/index');
  var $ = require('jquery');
  var _ = require('lodash');
  var typeDefs = require('apps/visualize/saved_visualizations/_type_defs');


  require('css!apps/visualize/styles/visualization.css');
  require('apps/visualize/spy/spy');

  var module = require('modules').get('kibana/directive');

  module.directive('visualize', function (createNotifier, SavedVis, indexPatterns, visLib) {
    return {
      restrict: 'E',
      scope : {
        vis: '=',
        esResp: '=?'
      },
      template: require('text!apps/visualize/partials/visualize.html'),
      link: function ($scope, $el, attr) {
        var chart; // set in "vis" watcher
        var notify = createNotifier();

        var $visualize = $el.find('.visualize-chart');
        var $spy = $el.find('visualize-spy');

        $scope.fields = {};
        $scope.spyMode = false;
        $scope.onlyShowSpy = false;

        var applyClassNames = function () {
          // external
          $el.toggleClass('only-visualization', !$scope.spyMode);
          $el.toggleClass('visualization-and-spy', $scope.spyMode && !$scope.onlyShowSpy);
          $el.toggleClass('only-spy', Boolean($scope.onlyShowSpy));

          $spy.toggleClass('only', Boolean($scope.onlyShowSpy));

          // internal
          $visualize.toggleClass('spy-visible', Boolean($scope.spyMode));
          $visualize.toggleClass('spy-only', Boolean($scope.onlyShowSpy));
        };

        var calcResponsiveStuff = function () {
          $scope.onlyShowSpy = $scope.spyMode && $el.height() < 550;
        };

        var render = function () {
          applyClassNames();

          if (chart && $scope.chartData && !$scope.onlyShowSpy) {
            notify.event('call chart render', function () {
              chart.render($scope.chartData);
            });
          }
        };

        // provide a setter to the visualize-spy directive
        $scope.$on('change:spyMode', function (event, newMode) {
          calcResponsiveStuff();
          render();
        });

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

          chart = new visLib.Vis($visualize[0], params);

          // For each type of interaction, assign the the handler if the vis object has it
          // otherwise use the typeDef, otherwise, do nothing.
//          _.each({hover: 'onHover', click: 'onClick', brush: 'onBrush'}, function (func, event) {
//            var callback = vis[func] || typeDefinition[func];
//            if (!!callback) chart.on(event, callback);
//          });


          if (!attr.esResp) {
            // fetch the response ourselves if it's not provided
            vis.searchSource.onResults(function onResults(resp) {
              $scope.esResp = resp;
            }).catch(notify.fatal);
          }


          vis.searchSource.onError(notify.error).catch(notify.fatal);

          $scope.$root.$broadcast('ready:vis');
        });

        $scope.$watch('esResp', function (resp, prevResp) {
          if (!resp) return;

          var vis = $scope.vis;
          var source = vis.searchSource;

          $scope.chartData = vis.buildChartDataFromResponse($scope.vis.searchSource.get('index'), resp);
        });

        $scope.$watch('chartData', render);

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
          // Vis with missing indexpattern will not have destroy
          if ($scope.vis && $scope.vis.destroy) $scope.vis.destroy();
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