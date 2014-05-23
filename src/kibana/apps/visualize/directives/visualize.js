define(function (require) {
  var k4d3 = require('k4d3');
  var $ = require('jquery');
  var _ = require('lodash');
  var typeDefs = require('../saved_visualizations/_type_defs');


  require('css!../styles/visualization.css');

  var module = require('modules').get('kibana/directive');

  module.directive('visualize', function (createNotifier, SavedVis, indexPatterns) {
    return {
      restrict: 'E',
      scope : {
        vis: '=',
      },
      link: function ($scope, $el) {
        var chart; // set in "vis" watcher

        $scope.$watch('vis', function (vis, prevVis) {
          if (!!vis.error) {
            console.log('yep error');
            $el.html('<div class="visualize-error"><i class="fa fa-exclamation-triangle"></i><br>' + vis.error + '</div>');
            return;
          }

          var typeDefinition = typeDefs.byName[vis.typeName];

          if (prevVis && prevVis.destroy) prevVis.destroy();
          if (chart) {
            chart.off('hover');
            chart.off('click');
            chart.destroy();
          }

          //if (!(vis instanceof SavedVis)) return;

          var notify = createNotifier({
            location: vis.typeName + ' visualization'
          });

          var params = {
            type: vis.typeName,
          };

          _.merge(params, vis.params);
          _.defaults(params, typeDefinition.params);

          chart = new k4d3.Chart($el[0], params);

          // For each type of interaction, assign the the handler if the vis object has it
          // otherwise use the typeDef, otherwise, do nothing.
          _.each({hover: 'onHover', click: 'onClick', brush: 'onBrush'}, function (func, event) {
            var callback = vis[func] || typeDefinition[func];
            if (!!callback) chart.on(event, callback);
          });

          vis.searchSource.onResults(function onResults(resp) {
            var indexPattern = vis.searchSource.get('index');
            var chartData = vis.buildChartDataFromResponse(indexPattern, resp);
            chart.render(chartData);
          }).catch(notify.fatal);

          vis.searchSource.onError(notify.error);

          $scope.$root.$broadcast('ready:vis');
        });

        $scope.$on('resize', function () {
          // chart reference changes over time, don't bind to a specific chart object.
          chart.resize();
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