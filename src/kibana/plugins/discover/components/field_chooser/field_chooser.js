define(function (require) {
  var app = require('modules').get('apps/discover');

  require('directives/css_truncate');
  require('directives/field_name');
  require('filters/unique');
  require('plugins/discover/components/field_chooser/discover_field');

  app.directive('discFieldChooser', function ($location, globalState, config, $route, Private) {
    var _ = require('lodash');
    var rison = require('utils/rison');
    var fieldCalculator = require('plugins/discover/components/field_chooser/lib/field_calculator');
    var Field = Private(require('components/index_patterns/_field'));

    return {
      restrict: 'E',
      scope: {
        columns: '=',
        data: '=',
        fieldCounts: '=',
        state: '=',
        indexPattern: '=',
        indexPatternList: '=',
        updateFilterInQuery: '=filter'
      },
      template: require('text!plugins/discover/components/field_chooser/field_chooser.html'),
      link: function ($scope) {
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
          isFieldSelected: function (field) {
            return field.display;
          },
          isFieldFiltered: function (field) {
            var matchFilter = (filter.vals.type == null || field.type === filter.vals.type);
            var isAnalyzed = (filter.vals.analyzed == null || field.analyzed === filter.vals.analyzed);
            var isIndexed = (filter.vals.indexed == null || field.indexed === filter.vals.indexed);
            var rowsScritpedOrMissing = (!filter.vals.missing || field.scripted || field.inData);
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

        $scope.$watchCollection('filter.vals', function () {
          filter.active = filter.getActive();
        });

        $scope.toggle = function (fieldName) {
          $scope.increaseFieldCounter(fieldName);
          _.toggleInOut($scope.columns, fieldName);
        };

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

        $scope.$watch('indexPattern', function (indexPattern) {
          $scope.fields = new IndexedArray ({
            index: ['name'],
            initialSet: _($scope.indexPattern.fields)
              .sortBy('name')
              .transform(function (fields, field) {
                // clone the field with Object.create so that its getters
                // and non-enumerable props are preserved
                var clone = Object.create(field);
                clone.display = _.contains($scope.columns, field.name);
                fields.push(clone);
              }, [])
              .value()
          });

        });

        $scope.$watchCollection('columns', function (columns, oldColumns) {
          _.each($scope.fields, function (field) {
            field.display = _.contains(columns, field.name) ? true : false;
          });
        });

        $scope.$watch('data', function () {

          // Get all fields current in data set
          var currentFields = _.chain($scope.data).map(function (d) {
            return _.keys($scope.indexPattern.flattenHit(d));
          }).flatten().unique().sort().value();

          _.each($scope.fields, function (field) {
            field.inData = _.contains(currentFields, field.name) ? true : false;
            if (field.details) {
              $scope.details(field, true);
            }
          });
        });

        $scope.increaseFieldCounter = function (fieldName) {
          $scope.indexPattern.popularizeField(fieldName, 1);
        };

        $scope.runAgg = function (field) {
          var agg = {};
          var isGeoPoint = field.type === 'geo_point';
          var type = isGeoPoint ? 'tile_map' : 'histogram';
          // If we're visualizing a date field, and our index is time based (and thus has a time filter),
          // then run a date histogram
          if (field.type === 'date' && $scope.indexPattern.timeFieldName === field.name) {
            agg = {
              type: 'date_histogram',
              schema: 'segment',
              params: {
                field: field.name,
                interval: 'auto'
              }
            };

          } else if (isGeoPoint) {
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
                size: config.get('discover:aggs:terms:size', 20),
                orderBy: '2'
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
                type: type,
                aggs: [
                  agg,
                  {schema: 'metric', type: 'count', 'id': '2'}
                ]
              }
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
