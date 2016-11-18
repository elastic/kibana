import _ from 'lodash';
import AggResponseTabifyTabifyProvider from 'ui/agg_response/tabify/tabify';
import FilterBarFilterBarClickHandlerProvider from 'ui/filter_bar/filter_bar_click_handler';
import AggConfigResult from 'ui/vis/agg_config_result';
import uiModules from 'ui/modules';
// get the kibana/metric_vis module, and make sure that it requires the "kibana" module if it
// didn't already
const module = uiModules.get('kibana/metric_vis', ['kibana']);

module.controller('KbnMetricVisController', function ($scope, $element, Private, getAppState) {
  const tabifyAggResponse = Private(AggResponseTabifyTabifyProvider);
  const filterBarClickHandler = Private(FilterBarFilterBarClickHandlerProvider);

  const $state = getAppState();
  const clickHandler = filterBarClickHandler($state);

  const metrics = $scope.metrics = [];

  function isInvalid(val) {
    return _.isUndefined(val) || _.isNull(val) || _.isNaN(val);
  }

  $scope.processTableGroups = function (tableGroups) {
    tableGroups.tables.forEach(function (table) {
      table.columns.forEach(function (column, i) {
        const value = table.rows[0][i];

        metrics.push({
          label: column.title,
          value: value.toString('html'),
          aggConfig: table.aggConfig(column)
        });
      });
    });
  };

  $scope.clickHandler = function (metric) {
    let aggConfigResult = null;
    if (metric.aggConfig.getField() && metric.aggConfig.getField().filterable) {
      const fieldAggConfig = {
        schema: {
          group: 'buckets'
        },
        fieldFormatter: metric.aggConfig.fieldFormatter,
        createFilter: (key) => {
          return {
            exists: {
              field: metric.aggConfig.getField().name
            },
            meta: {
              index: $scope.vis.indexPattern.id
            }
          };
        }
      };
      aggConfigResult = new AggConfigResult(fieldAggConfig, aggConfigResult, metric.aggConfig.getField(), 'exists');
    }
    if ($scope.vis.getFilters().length > 0) {
      $scope.vis.getFilters().forEach((filter) => {
        const fieldAggConfig = {
          schema: {
            group: 'buckets'
          },
          fieldFormatter: () => {},
          createFilter: (key) => {
            return filter;
          }
        };
        aggConfigResult = new AggConfigResult(fieldAggConfig, aggConfigResult, filter, 'filter');
      });
    }

    if (_.get($scope.vis.getQuery(), 'query_string.query', '*') !== '*') {
      const fieldAggConfig = {
        schema: {
          group: 'buckets'
        },
        fieldFormatter: () => {},
        createFilter: (key) => {
          return {
            query: $scope.vis.getQuery(),
            meta: {
              index: $scope.vis.indexPattern.id
            }
          };
        }
      };
      aggConfigResult = new AggConfigResult(fieldAggConfig, aggConfigResult, $scope.vis.getQuery(), 'query');
    }

    if (aggConfigResult) {
      clickHandler({point: {aggConfigResult}});
    }
  };

  $scope.$watch('esResponse', function (resp) {
    if (resp) {
      const options = {
        asAggConfigResults: true
      };

      metrics.length = 0;
      $scope.processTableGroups(tabifyAggResponse($scope.vis, resp, options));
      $element.trigger('renderComplete');
    }
  });
});
