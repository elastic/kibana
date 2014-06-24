define(function (require) {
  var app = require('modules').get('apps/discover');
  var html = require('text!apps/discover/partials/field_chooser.html');
  var _ = require('lodash');
  var jsonPath = require('jsonpath');
  var rison = require('utils/rison');
  var qs = require('utils/query_string');

  require('directives/css_truncate');
  require('directives/field_name');
  require('filters/unique');
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
        updateFilterInQuery: '=filter',
        searchSource: '='
      },
      template: html,
      controller: function ($scope) {

        var filter = $scope.filter = {
          props: [
            'type',
            'indexed',
            'analyzed',
            'missing'
          ],
          defaults: {
            missing: true
          },
          boolOpts: [
            {label: 'any', value: undefined },
            {label: 'yes', value: true },
            {label: 'no', value: false }
          ],
          toggleVal: function (name, def) {
            if (filter.vals[name] !== def) filter.vals[name] = def;
            else filter.vals[name] = undefined;
          },
          reset: function () {
            filter.vals = _.clone(filter.defaults);
          },
          isFieldFiltered: function (field) {
            return !field.display
              && (filter.vals.type == null || field.type === filter.vals.type)
              && (filter.vals.analyzed == null || field.analyzed === filter.vals.analyzed)
              && (filter.vals.indexed == null || field.indexed === filter.vals.indexed)
              && (!filter.vals.missing || field.rowCount > 0)
              && (!filter.vals.name || field.name.indexOf(filter.vals.name) !== -1)
            ;
          },
          popularity: function (field) {
            return field.count;
          },
          getActive: function () {
            return _.some(filter.props, function (prop) {
              return filter.vals[prop] !== filter.defaults[prop];
            });
          }
        };

        // set the initial values to the defaults
        filter.reset();

        $scope.$watchCollection('filter.vals', function (newFieldFilters) {
          filter.active = filter.getActive();
        });

        $scope.$watch('fields', function (newFields) {

          // Find the top N most popular fields
          $scope.popularFields = _.sortBy(_.filter(
            _.sortBy(newFields, 'count')
            .reverse()
            .slice(0, config.get('fields:popularLimit')), function (field) {
            return (field.count > 0);
          }), 'name');

          // Find the top N most popular fields
          $scope.unpopularFields = _.sortBy(_.sortBy(newFields, 'count')
            .reverse()
            .slice($scope.popularFields.length), 'name');

          $scope.fieldTypes = _.unique(_.pluck(newFields, 'type'));
          // push undefined so the user can clear the filter
          $scope.fieldTypes.unshift(undefined);
        });

        $scope.$watch('data', function () {
          _.each($scope.fields, function (field) {
            if (field.details) {
              $scope.details(field, true);
            }
          });
        });

        $scope.increaseFieldCounter = function (field) {
          var indexPattern = $scope.searchSource.get('index');
          indexPattern.popularizeField(field.name, 1);
          field.count++;
        };

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

        $scope.details = function (field, recompute) {
          if (_.isUndefined(field.details) || recompute) {
            field.details = getFieldValueCounts({
              data: $scope.data,
              field: field.name,
              count: 5,
              grouped: false
            });
            var indexPattern = $scope.searchSource.get('index');
            indexPattern.popularizeField(field.name, 1);
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
            return {error: 'This is field is present in your elasticsearch mapping,' +
              ' but not in any documents in the search results. You may still be able to visualize or search on it'};
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