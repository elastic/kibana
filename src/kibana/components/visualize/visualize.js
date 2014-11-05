define(function (require) {
  require('modules')
  .get('kibana/directive')
  .directive('visualize', function (Notifier, SavedVis, indexPatterns, Private) {

    require('components/visualize/spy/spy');
    require('css!components/visualize/visualize.css');
    var $ = require('jquery');
    var _ = require('lodash');
    var visTypes = Private(require('registry/vis_types'));

    var notify = new Notifier({
      location: 'Visualize'
    });

    return {
      restrict: 'E',
      scope : {
        vis: '=',
        editableVis: '=?',
        esResp: '=?',
        searchSource: '=?'
      },
      template: require('text!components/visualize/visualize.html'),
      link: function ($scope, $el, attr) {
        var chart; // set in "vis" watcher
        var $visEl = $el.find('.visualize-chart');
        var $spyEl = $el.find('visualize-spy');
        var minVisChartHeight = 180;

        $scope.spyMode = false;
        $scope.fullScreenSpy = false;

        var applyClassNames = function () {
          var fullSpy = ($scope.spyMode && ($scope.spyMode.fill || $scope.fullScreenSpy));

          // external
          $el.toggleClass('only-visualization', !$scope.spyMode);
          $el.toggleClass('visualization-and-spy', $scope.spyMode && !fullSpy);
          $el.toggleClass('only-spy', Boolean(fullSpy));
          $spyEl.toggleClass('only', Boolean(fullSpy));

          // internal
          $visEl.toggleClass('spy-visible', Boolean($scope.spyMode));
          $visEl.toggleClass('spy-only', Boolean(fullSpy));
        };

        // we need to wait for some watchers to fire at least once
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

        $scope.$watch('fullScreenSpy', applyClassNames);
        $scope.$watchCollection('spyMode', function (spyMode, oldSpyMode) {
          // if the spy has been opened, check chart height
          if (spyMode && !oldSpyMode) {
            $scope.fullScreenSpy = $visEl.height() < minVisChartHeight;
          }
          applyClassNames();
        });

        $scope.$watch('vis', prereq(function (vis, oldVis) {
          if (!attr.editableVis) {
            $scope.editableVis = vis;
          }

          if (oldVis) $scope.renderbot = null;
          if (vis) $scope.renderbot = vis.type.createRenderbot(vis, $visEl);
        }));

        $scope.$watchCollection('vis.params', prereq(function () {
          if ($scope.renderbot) $scope.renderbot.updateParams();
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
          $scope.renderbot.render(resp);
        }));

        $scope.$watch('renderbot', function (newRenderbot, oldRenderbot) {
          if (oldRenderbot && newRenderbot !== oldRenderbot) {
            oldRenderbot.destroy();
          }
        });

        $scope.$on('$destroy', function () {
          if ($scope.renderbot) {
            $scope.renderbot.destroy();
          }
        });
      }
    };
  });
});
