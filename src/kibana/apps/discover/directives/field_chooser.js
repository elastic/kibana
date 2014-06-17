define(function (require) {
  var app = require('modules').get('apps/discover');
  var html = require('text!apps/discover/partials/field_chooser.html');
  var _ = require('lodash');
  var jsonPath = require('jsonpath');
  var rison = require('utils/rison');
  var qs = require('utils/query_string');

  require('directives/css_truncate');
  require('directives/field_name');
  require('apps/discover/directives/discover_field');



  app.directive('discFieldChooser', function ($location, globalState, config) {
    return {
      restrict: 'E',
      scope: {
        fields: '=',
        toggle: '=',
        refresh: '=',
        data: '=',
        state: '=',
        filterFunc: '=filter'
      },
      template: html,
      controller: function ($scope) {

        $scope.$watch('data', function () {
          _.each($scope.fields, function (field) {
            if (field.details) {
              $scope.details(field, true);
            }
          });
        });

        $scope.termsAgg = function (field) {
          $location.path('/visualize/create').search({
            indexPattern: $scope.state.index,
            type: 'histogram',
            _a: rison.encode({
              query: $scope.state.query || undefined,
              metric: [{
                agg: 'count',
              }],
              segment: [{
                agg: 'terms',
                field: field.name,
                size: config.get('discover:aggs:terms:size', 20),
              }],
              group: [],
              split: [],
            }),
            _g: rison.encode(globalState)
          });
        };

        $scope.filter = function (fieldName, value, operation) {
          $scope.filterFunc(fieldName, value, operation);
        };

        $scope.details = function (field, recompute) {
          if (_.isUndefined(field.details) || recompute) {
            field.details = getFieldValueCounts({
              data: $scope.data,
              field: field.name,
              count: 5,
              grouped: false
            });
          } else {
            delete field.details;
          }
        };

        var getFieldValues = function (data, field) {
          return _.map(data, function (row) {
            var val;
            val = _.isUndefined(row._source[field]) ? row[field] : row._source[field];
            if (val === null) val = row[field];
            if (val === null) val = '';
            return val;
          });
        };

        var getFieldValueCounts = function (params) {
          params = _.defaults(params, {
            count: 5,
            grouped: false
          });

          var allValues = getFieldValues(params.data, params.field),
            groups = {},
            hasArrays = false,
            exists = 0,
            missing = 0,
            counts;

          var value, k;
          for (var i = 0; i < allValues.length; ++i) {

            value = allValues[i];
            if (_.isUndefined(value)) {
              missing++;
            }

            if (_.isArray(value)) {
              hasArrays =  true;
            } else if (_.isObject(value)) {
              return {error: 'Analysis is not available for object fields'};
            }

            if (_.isArray(value) && !params.grouped) {
              k = value;
            } else {
              k = _.isUndefined(value) ? '' : [value.toString()];
            }

            /* jshint -W083 */
            _.each(k, function (key) {
              if (_.has(groups, key)) {
                groups[key].count++;
              } else {
                groups[key] = {
                  value: (params.grouped ? value : key),
                  count: 1
                };
              }
            });
          }

          counts = _.map(
            _.sortBy(groups, 'count').reverse().slice(0, params.count),
            function (bucket) {
              return {
                value: bucket.value,
                count: bucket.count,
                percent: (bucket.count / (params.data.length - missing) * 100).toFixed(1)
              };
            });

          if (params.data.length - missing === 0) {
            return {error: 'Field missing in record list. This field may still be indexed in Elasticsearch.'};
          }

          return {
            total: params.data.length,
            exists: params.data.length - missing,
            missing: missing,
            buckets: counts,
            hasArrays : hasArrays,
          };
        };


      }
    };
  });
});