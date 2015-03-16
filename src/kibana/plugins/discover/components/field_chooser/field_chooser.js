define(function (require) {
  var app = require('modules').get('apps/discover');
  var html = require('text!plugins/discover/components/field_chooser/field_chooser.html');
  var _ = require('lodash');
  var rison = require('utils/rison');
  var qs = require('utils/query_string');
  var fieldCalculator = require('plugins/discover/components/field_chooser/lib/field_calculator');


  require('directives/css_truncate');
  require('directives/field_name');
  require('filters/unique');
  require('plugins/discover/components/field_chooser/discover_field');

  app.directive('discFieldChooser', function ($location, globalState, config) {
    return {
      restrict: 'E',
      scope: {
        fields: '=',
        toggle: '=',
        data: '=',
        state: '=',
        indexPattern: '=',
        indexPatternList: '=',
        updateFilterInQuery: '=filter'
      },
      template: html,
      controller: function ($scope, $route) {
        $scope.setIndexPattern = function (indexPattern) {
          $scope.state.index = indexPattern;
          $scope.state.save();
          $route.reload();
        };

        var filter = $scope.filter = {
          props: [
            'type',
            'indexed',
            'analyzed',
            'missing',
            'name'
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
            var matchFilter = (filter.vals.type == null || field.type === filter.vals.type);
            var isAnalyzed = (filter.vals.analyzed == null || field.analyzed === filter.vals.analyzed);
            var isIndexed = (filter.vals.indexed == null || field.indexed === filter.vals.indexed);
            var rowsScritpedOrMissing = (!filter.vals.missing || field.scripted || field.rowCount > 0);
            var matchName = (!filter.vals.name || field.name.indexOf(filter.vals.name) !== -1);

            return !field.display
              && matchFilter
              && isAnalyzed
              && isIndexed
              && rowsScritpedOrMissing
              && matchName
            ;
          },
          popularity: function (field) {
            return field.count > 0;
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

        var calculateFields = function (newFields) {
          // Find the top N most popular fields
          $scope.popularFields = _(newFields)
          .where(function (field) {
            return field.count > 0;
          })
          .sortBy('count')
          .reverse()
          .slice(0, config.get('fields:popularLimit'))
          .sortBy('name')
          .value();

          // Find the top N most popular fields
          $scope.unpopularFields = _.sortBy(_.sortBy(newFields, 'count')
            .reverse()
            .slice($scope.popularFields.length), 'name');

          $scope.fieldTypes = _.unique(_.pluck(newFields, 'type'));
          // push undefined so the user can clear the filter
          $scope.fieldTypes.unshift(undefined);
        };

        $scope.$watch('fields', calculateFields);
        $scope.$watch('data', function () {
          _.each($scope.fields, function (field) {
            if (field.details) {
              $scope.details(field, true);
            }
          });
        });

        $scope.increaseFieldCounter = function (field) {
          $scope.indexPattern.popularizeField(field.name, 1);
        };

        $scope.runAgg = function (field) {
          var agg = {};
          var type = 'histogram';
          // If we're visualizing a date field, and our index is time based (and thus has a time filter),
          // then run a date histogram
          if (field.type === 'date' && $scope.indexPattern.timeFieldName) {
            agg = {
              type: 'date_histogram',
              schema: 'segment',
              params: {
                field: field.name,
                interval: 'auto'
              }
            };

          } else if (field.type === 'geo_point') {
            type = 'tile_map';
            agg = {
              type: 'geohash_grid',
              schema: 'segment',
              params: {
                field: field.name,
                precision: 3
              }
            };
          } else {
            agg = {
              type: 'terms',
              schema: 'segment',
              params: {
                field: field.name,
                size: config.get('discover:aggs:terms:size', 20)
              }
            };
          }

          $location.path('/visualize/create').search({
            indexPattern: $scope.state.index,
            type: type,
            _a: rison.encode({
              filters: $scope.state.filters || [],
              query: $scope.state.query || undefined,
              vis: {
                aggs: [
                  agg,
                  {schema: 'metric', type: 'count'}
                ]
              },
              metric: [{
                agg: 'count',
              }],
              segment: [agg],
              group: [],
              split: [],
            })
          });
        };

        $scope.details = function (field, recompute) {
          if (_.isUndefined(field.details) || recompute) {
            field.details = fieldCalculator.getFieldValueCounts({
              data: $scope.data,
              field: field,
              count: 5,
              grouped: false
            });
            _.each(field.details.buckets, function (bucket) {
              bucket.display = field.format.convert(bucket.value);
            });
            $scope.increaseFieldCounter(field, 1);
          } else {
            delete field.details;
          }
        };

      }
    };
  });
});
