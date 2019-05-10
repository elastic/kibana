/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import 'ui/directives/css_truncate';
import { i18n } from '@kbn/i18n';
import 'ui/directives/field_name';
import './discover_field';
import 'ui/angular_ui_select';
import _ from 'lodash';
import $ from 'jquery';
import rison from 'rison-node';
import { fieldCalculator } from './lib/field_calculator';
import { FieldList } from 'ui/index_patterns/_field_list';
import { uiModules } from 'ui/modules';
import fieldChooserTemplate from './field_chooser.html';
const app = uiModules.get('apps/discover');

app.directive('discFieldChooser', function ($location, config, $route) {
  return {
    restrict: 'E',
    scope: {
      columns: '=',
      hits: '=',
      fieldCounts: '=',
      state: '=',
      indexPattern: '=',
      indexPatternList: '=',
      onAddField: '=',
      onAddFilter: '=',
      onRemoveField: '=',
    },
    template: fieldChooserTemplate,
    link: function ($scope) {
      $scope.$parent.$watch('showFilter', () =>{
        $scope.toggleFieldFilterButtonAriaLabel = $scope.$parent.showFilter
          ? i18n.translate('kbn.discover.fieldChooser.toggleFieldFilterButtonHideAriaLabel', {
            defaultMessage: 'Hide field settings',
          })
          : i18n.translate('kbn.discover.fieldChooser.toggleFieldFilterButtonShowAriaLabel', {
            defaultMessage: 'Show field settings',
          });
      });

      $scope.selectedIndexPattern = $scope.indexPatternList.find(
        (pattern) => pattern.id === $scope.indexPattern.id
      );
      $scope.indexPatternList = _.sortBy($scope.indexPatternList, o => o.get('title'));
      $scope.setIndexPattern = function (pattern) {
        $scope.state.index = pattern.id;
        $scope.state.save();
      };

      $scope.$watch('state.index', function (id, previousId) {
        if (previousId == null || previousId === id) return;
        $route.reload();
      });

      const filter = $scope.filter = {
        props: [
          'type',
          'aggregatable',
          'searchable',
          'missing',
          'name'
        ],
        defaults: {
          missing: true,
          type: 'any'
        },
        boolOpts: [
          { label: 'any', value: undefined },
          { label: 'yes', value: true },
          { label: 'no', value: false }
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
          const matchFilter = (filter.vals.type === 'any' || field.type === filter.vals.type);
          const isAggregatable = (filter.vals.aggregatable == null || field.aggregatable === filter.vals.aggregatable);
          const isSearchable = (filter.vals.searchable == null || field.searchable === filter.vals.searchable);
          const scriptedOrMissing = (!filter.vals.missing || field.scripted || field.rowCount > 0);
          const matchName = (!filter.vals.name || field.name.indexOf(filter.vals.name) !== -1);

          return !field.display
            && matchFilter
            && isAggregatable
            && isSearchable
            && scriptedOrMissing
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

      $scope.$watchMulti([
        '[]fieldCounts',
        '[]columns',
        '[]hits'
      ], function (cur, prev) {
        const newHits = cur[2] !== prev[2];
        let fields = $scope.fields;
        const columns = $scope.columns || [];
        const fieldCounts = $scope.fieldCounts;

        if (!fields || newHits) {
          $scope.fields = fields = getFields();
        }

        if (!fields) return;

        // group the fields into popular and up-popular lists
        _.chain(fields)
          .each(function (field) {
            field.displayOrder = _.indexOf(columns, field.name) + 1;
            field.display = !!field.displayOrder;
            field.rowCount = fieldCounts[field.name];
          })
          .sortBy(function (field) {
            return (field.count || 0) * -1;
          })
          .groupBy(function (field) {
            if (field.display) return 'selected';
            return field.count > 0 ? 'popular' : 'unpopular';
          })
          .tap(function (groups) {
            groups.selected = _.sortBy(groups.selected || [], 'displayOrder');

            groups.popular = groups.popular || [];
            groups.unpopular = groups.unpopular || [];

            // move excess popular fields to un-popular list
            const extras = groups.popular.splice(config.get('fields:popularLimit'));
            groups.unpopular = extras.concat(groups.unpopular);
          })
          .each(function (group, name) {
            $scope[name + 'Fields'] = _.sortBy(group, name === 'selected' ? 'display' : 'name');
          })
          .commit();

        // include undefined so the user can clear the filter
        $scope.fieldTypes = _.union(['any'], _.pluck(fields, 'type'));
      });

      $scope.increaseFieldCounter = function (fieldName) {
        $scope.indexPattern.popularizeField(fieldName, 1);
      };

      function getVisualizeUrl(field) {
        if (!$scope.state) {return '';}

        let agg = {};
        const isGeoPoint = field.type === 'geo_point';
        const type = isGeoPoint ? 'tile_map' : 'histogram';
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
              size: parseInt(config.get('discover:aggs:terms:size'), 10),
              orderBy: '2'
            }
          };
        }

        return '#/visualize/create?' + $.param(_.assign(_.clone($location.search()), {
          indexPattern: $scope.state.index,
          type: type,
          _a: rison.encode({
            filters: $scope.state.filters || [],
            query: $scope.state.query || undefined,
            vis: {
              type: type,
              aggs: [
                { schema: 'metric', type: 'count', 'id': '2' },
                agg,
              ]
            }
          })
        }));
      }

      $scope.computeDetails = function (field, recompute) {
        if (_.isUndefined(field.details) || recompute) {
          field.details = {
            visualizeUrl: field.visualizable ? getVisualizeUrl(field) : null,
            ...fieldCalculator.getFieldValueCounts({
              hits: $scope.hits,
              field: field,
              count: 5,
              grouped: false
            }),
          };
          _.each(field.details.buckets, function (bucket) {
            bucket.display = field.format.convert(bucket.value);
          });
          $scope.increaseFieldCounter(field, 1);
        } else {
          delete field.details;
        }
      };

      function getFields() {
        const prevFields = $scope.fields;
        const indexPattern = $scope.indexPattern;
        const hits = $scope.hits;
        const fieldCounts = $scope.fieldCounts;

        if (!indexPattern || !hits || !fieldCounts) return;

        const fieldSpecs = indexPattern.fields.slice(0);
        const fieldNamesInDocs = _.keys(fieldCounts);
        const fieldNamesInIndexPattern = _.keys(indexPattern.fields.byName);

        _.difference(fieldNamesInDocs, fieldNamesInIndexPattern)
          .forEach(function (unknownFieldName) {
            fieldSpecs.push({
              name: unknownFieldName,
              type: 'unknown'
            });
          });

        const fields = new FieldList(indexPattern, fieldSpecs);

        if (prevFields) {
          fields.forEach(function (field) {
            field.details = _.get(prevFields, ['byName', field.name, 'details']);
          });
        }

        return fields;
      }
    }
  };
});
