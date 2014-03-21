define(function (require) {
  var app = require('modules').get('app/visualize');
  var _ = require('lodash');

  var templates = {
    orderAndSize: require('text!../partials/controls/order_and_size.html'),
    interval: require('text!../partials/controls/interval.html'),
    globalLocal: require('text!../partials/controls/global_local.html')
  };

  app.directive('visConfigControls', function ($compile, Vis, Aggs) {
    return {
      restrict: 'E',
      scope: {
        config: '='
      },
      link: function ($scope, $el, attr) {
        var $controls = $el.find('.agg-param-controls');

        $scope.$watch('config.agg', function (aggName) {
          var agg = Aggs.aggsByName[aggName];
          var controlsHtml = '';

          if (agg) {
            var aggParams = $scope.aggParams = agg.params;

            _.forOwn(aggParams, function (param, name) {
              // if the param doesn't have options, or a default value, skip it
              if (!param.options) return;
              // if there isn't currently a value, or the current value is not one of the options, set it to the default
              if (!$scope.config[name] || !_.find(param.options, { val: $scope.config[name] })) {
                $scope.config[name] = param.default;
              }
            });

            if (aggParams.order && aggParams.size) {
              controlsHtml += ' ' + templates.orderAndSize;
            }

            if (aggParams.interval) {
              controlsHtml += ' ' + templates.interval;
            }

            if ($scope.config.categoryName === 'group') {
              controlsHtml += ' ' + templates.globalLocal;
            }
          }

          $controls.html($compile(controlsHtml)($scope));
        });

        $scope.Aggs = Aggs;
        $scope.Vis = Vis;
      }
    };
  });

});