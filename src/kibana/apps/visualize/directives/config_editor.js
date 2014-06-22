define(function (require) {
  var app = require('modules').get('apps/visualize');
  var _ = require('lodash');
  var $ = require('jquery');

  require('filters/field_type');

  var visConfigCategories = require('apps/visualize/saved_visualizations/_config_categories');

  var headerHtml = require('text!apps/visualize/partials/editor/header.html');

  var controlHtml = {
    ranges: require('text!apps/visualize/partials/controls/ranges.html'),
    orderAndSize: require('text!apps/visualize/partials/controls/order_and_size.html'),
    minDocCount: require('text!apps/visualize/partials/controls/min_doc_count.html'),
    extendedBounds: require('text!apps/visualize/partials/controls/extended_bounds.html'),
    interval: require('text!apps/visualize/partials/controls/interval.html'),
    globalLocal: require('text!apps/visualize/partials/controls/global_local.html')
  };

  app.directive('visConfigEditor', function ($compile, Private) {
    var aggs = Private(require('apps/visualize/saved_visualizations/_aggs'));

    var categoryOptions = {
      metric: {
        template: require('text!apps/visualize/partials/editor/metric.html')
      },
      segment: {
        template: require('text!apps/visualize/partials/editor/dimension.html'),
        setup: setupDimension
      },
      group: {
        template: require('text!apps/visualize/partials/editor/dimension.html'),
        setup: setupDimension
      },
      split: {
        template: require('text!apps/visualize/partials/editor/dimension.html'),
        setup: setupDimension
      }
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
        var options = aggs.byFieldType[field.type];

        if (!options || options.length === 0) {
          // init or invalid field type
          $scope.config.agg = void 0;
          return;
        }

        if (options.length === 1) {
          // only once choice, make it for the user
          $scope.config.agg = options[0].name;
          return;
        }

        // set the new choices
        $scope.availableAggs = options;

        // update the agg only if it is not currently a valid option
        if (!$scope.config.agg || !_.find(options, { name: $scope.config.agg })) {
          $scope.config.agg = options[0].name;
          return;
        }
      }

      // since this depends on the field and field list, watch both
      // this doesn't trigger when we switch the metric agg field?
      $scope.$watch('config.field', function (field) {
        getAvailableAggsForField(field);
        if ($scope.vis && $scope.vis.searchSource) {
          $scope.vis.searchSource.get('index').popularizeField(field, 1);
        }
      });

      $scope.$watch('fields', getAvailableAggsForField);

      $scope.$watch('config.agg', function (aggName) {
        var agg = aggs.byName[aggName];
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

          if (params.order && params.size && !params.order.hide) {
            controlsHtml += ' ' + controlHtml.orderAndSize;
          }

          if (params.interval && !params.interval.hide) {
            controlsHtml += ' ' + controlHtml.interval;
            if (!controlsHtml.match(/aggParams\.interval\.options/)) ; //debugger;
          }

          if (params.ranges) {
            controlsHtml += ' ' + controlHtml.ranges;
          }

          if (params.min_doc_count && !params.min_doc_count.hide) {
            controlsHtml += ' ' + controlHtml.minDocCount;
          }

          if (params.extended_bounds && !params.extended_bounds.hide) {
            controlsHtml += ' ' + controlHtml.extendedBounds;
          }

          if ($scope.category.name === 'group') {
            controlsHtml += ' ' + controlHtml.globalLocal;
          }
        }

        $controls.html($compile(controlsHtml)($scope));
      });
    }

    return {
      restrict: 'E',
      scope: {
        config: '=',
        category: '=',
        fields: '=',
        vis: '=',
        move: '='
      },
      link: function ($scope, $el, attr) {
        $scope.aggs = aggs;
        $scope.visConfigCategories = visConfigCategories;

        $scope.$watch('category', function (category, prevCategory) {
          // clear out the previous state if necessary
          if (prevCategory && !category) {
            delete $scope[category.name];
            $el.html('');
            return;
          }
          // no work to be done yet
          if (!category) return;

          var opts = categoryOptions[category.name];

          // attach a copy of the template to the scope and render
          $el.html($compile(headerHtml + '\n' + opts.template)($scope));

          _.defaults($scope.val, opts.defVal || {});
          if (opts.setup) opts.setup($scope, $el);

          // rather than accessing vis.{{categoryName}} everywhere
          $scope[category.name] = $scope.vis[category.name];
        });
      }
    };
  });

});