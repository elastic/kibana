define(function (require) {
  var app = require('modules').get('app/visualize');
  var _ = require('lodash');
  var $ = require('jquery');

  require('filters/field_type');

  app.directive('visConfigEditor', function ($compile, Vis, Aggs) {
    var categoryOptions = {
      metric: {
        template: require('text!../partials/editor/metric.html')
      },
      segment: {
        template: require('text!../partials/editor/dimension.html'),
        setup: setupDimension
      },
      group: {
        template: require('text!../partials/editor/dimension.html'),
        setup: setupDimension
      },
      split: {
        template: require('text!../partials/editor/dimension.html'),
        setup: setupDimension
      }
    };

    var controlTemplates = {
      orderAndSize: require('text!../partials/controls/order_and_size.html'),
      interval: require('text!../partials/controls/interval.html'),
      globalLocal: require('text!../partials/controls/global_local.html')
    };

    // generalized setup for group and segment
    function setupDimension($scope, $el) {
      var $controls = $el.find('.agg-param-controls');

      function getAvailableAggsForField() {
        if (!$scope.config.field || !$scope.fields) return;

        var field = $scope.fields.byName[$scope.config.field];

        // clear the previous choices
        $scope.availableAggs = void 0;
        // get the new choices
        var aggs = Aggs.aggsByFieldType[field.type];

        if (!aggs || aggs.length === 0) {
          // init or invalid field type
          $scope.config.agg = void 0;
          return;
        }

        if (aggs.length === 1) {
          // only once choice, make it for the user
          $scope.config.agg = aggs[0].name;
          return;
        }

        // set the new choices
        $scope.availableAggs = aggs;

        // update the agg only if it is not currently a valid option
        if (!$scope.config.agg || !_.find(aggs, { name: $scope.config.agg })) {
          $scope.config.agg = aggs[0].name;
          return;
        }
      }

      // since this depends on the field and field list, watch both
      $scope.$watch('config.field', getAvailableAggsForField);
      $scope.$watch('fields', getAvailableAggsForField);

      $scope.$watch('config.agg', function (aggName) {
        var agg = Aggs.aggsByName[aggName];
        var controlsHtml = '';

        if (agg) {
          var params = $scope.aggParams = agg.params;

          _.forOwn(params, function (param, name) {
            // if the param doesn't have options, or a default value, skip it
            if (!param.options) return;
            // if there isn't currently a value, or the current value is not one of the options, set it to the default
            if (!$scope.config[name] || !_.find(param.options, { val: $scope.config[name] })) {
              $scope.config[name] = param.default;
            }
          });

          if (params.order && params.size) {
            controlsHtml += ' ' + controlTemplates.orderAndSize;
          }

          if (params.interval) {
            controlsHtml += ' ' + controlTemplates.interval;
            if (!controlsHtml.match(/aggParams\.interval\.options/)) ; //debugger;
          }

          if ($scope.config.categoryName === 'group') {
            controlsHtml += ' ' + controlTemplates.globalLocal;
          }
        }

        $controls.html($compile(controlsHtml)($scope));
      });
    }

    return {
      restrict: 'E',
      scope: {
        config: '=',
        fields: '=',
        vis: '='
      },
      link: function ($scope, $el, attr) {
        var categoryName = $scope.config.categoryName;
        var opts = categoryOptions[categoryName];

        $scope.Aggs = Aggs;
        $scope.Vis = Vis;

        // attach a copy of the template to the scope and render
        $el.html($compile(opts.template)($scope));

        _.defaults($scope.val, opts.defVal || {});
        if (opts.setup) opts.setup($scope, $el);

        // rather than accessing vis.{{categoryName}} everywhere
        $scope[categoryName] = $scope.vis[categoryName];
      }
    };
  });

});