define(function (require) {
  var app = require('modules').get('app/visualize');
  var _ = require('lodash');
  var aggs = require('../saved_visualizations/_aggs');

  var templates = {
    orderAndSize: require('text!../partials/controls/order_and_size.html'),
    interval: require('text!../partials/controls/interval.html'),
    globalLocal: require('text!../partials/controls/global_local.html')
  };

  app.directive('visConfigControls', function ($compile, visConfigCategories) {
    return {
      restrict: 'E',
      scope: {
        config: '='
      },
      link: function ($scope, $el, attr) {
        var $controls = $el.find('.agg-param-controls');

        $scope.$watch('config.agg', function (aggName) {
          var agg = aggs.byName[aggName];
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

        $scope.aggs = aggs;
        $scope.visConfigCategories = visConfigCategories;
      }
    };
  });

});