define(function (require) {
  require('modules')
  .get('kibana/directive')
  .directive('visualize', function (Notifier, SavedVis, indexPatterns, Private, visLib) {

    require('components/visualize/spy/spy');
    require('css!components/visualize/visualize.css');
    var $ = require('jquery');
    var _ = require('lodash');
    var visTypes = Private(require('components/vis_types/index'));
    var buildChartData = Private(require('components/visualize/_build_chart_data'));

    var notify = new Notifier({
      location: 'Visualize'
    });

    return {
      restrict: 'E',
      scope : {
        vis: '=',
        esResp: '=?',
        searchSource: '=?'
      },
      template: require('text!components/visualize/visualize.html'),
      link: function ($scope, $el, attr) {
        var chart; // set in "vis" watcher
        var $visualize = $el.find('.visualize-chart');
        var $spy = $el.find('visualize-spy');

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
          $scope.onlyShowSpy = $scope.spyMode && ($scope.spyMode.fill || $el.height() < 550);
          applyClassNames();
        };

        // we need to wait for come watchers to fire at least once
        // before we are "ready", this manages that
        var prereq = (function () {
          var fns = [];

          return function register(fn) {
            fns.push(fn);

            return function () {
              fn.apply(this, arguments);

              if (fns.length) {
                _.pull(fns, fn);
                if (!fns.length) {
                  $scope.$root.$broadcast('ready:vis');
                }
              }
            };
          };
        }());

        $scope.$on('change:spyMode', function (event, spyMode) {
          calcResponsiveStuff();
        });

        $scope.$watch('vis', prereq(function (vis, prevVis) {
          if (prevVis && vis !== prevVis && prevVis.destroy) prevVis.destroy();
          if (chart) {
            _.forOwn(prevVis.listeners, function (listener, event) {
              chart.off(event, listener);
            });
            chart.destroy();
          }

          if (!vis) return;

          var vislibParams = _.assign(
            {},
            vis.type.vislibParams,
            { type: vis.type.name },
            vis.vislibParams
          );

          chart = new visLib.Vis($visualize[0], vislibParams);

          _.each(vis.listeners, function (listener, event) {
            chart.on(event, listener);
          });
        }));

        $scope.$watch('searchSource', prereq(function (searchSource) {
          if (!searchSource || attr.esResp) return;

          // TODO: we need to have some way to clean up result requests
          searchSource.onResults().then(function onResults(resp) {
            if ($scope.searchSource !== searchSource) return;

            $scope.esResp = resp;

            return searchSource.onResults().then(onResults);
          }).catch(notify.fatal);

          searchSource.onError(notify.error).catch(notify.fatal);
        }));

        $scope.$watch('esResp', prereq(function (resp, prevResp) {
          if (!resp) return;
          $scope.chartData = buildChartData($scope.vis, resp);
        }));

        $scope.$watch('chartData', function (chartData) {
          applyClassNames();

          if (chart && chartData && !$scope.onlyShowSpy) {
            notify.event('call chart render', function () {
              chart.render(chartData);
            });
          }
        });

        $scope.$on('$destroy', function () {
          if (chart) {
            _.forOwn($scope.vis.listeners, function (listener, event) {
              chart.off(event, listener);
            });
            chart.destroy();
          }
        });
      }
    };
  });
});