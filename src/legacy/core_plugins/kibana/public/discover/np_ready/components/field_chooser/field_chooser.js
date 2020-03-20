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
import { sortBy, map, difference } from 'lodash';
import { fieldCalculator } from './lib/field_calculator';
import fieldChooserTemplate from './field_chooser.html';
import { IndexPatternFieldList } from '../../../../../../../../plugins/data/public';
import { isFieldVisualizable, getVisualizeUrl } from './lib/visualize_url_utils';
import { getServices } from '../../../kibana_services';

export function createFieldChooserDirective($location, config) {
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
    link: function($scope) {
      $scope.indexPatternList = sortBy($scope.indexPatternList, o => o.get('title'));

      const filter = ($scope.filter = {
        props: ['type', 'aggregatable', 'searchable', 'missing', 'name'],
        defaults: {
          missing: true,
          type: 'any',
          name: '',
        },
        boolOpts: [
          { label: 'any', value: undefined },
          { label: 'yes', value: true },
          { label: 'no', value: false },
        ],
        reset: function() {
          filter.vals = { ...filter.defaults };
        },
      });

      $scope.setFilterValue = (name, value) => {
        filter.vals[name] = value;
        $scope.filter = { ...filter };
      };

      // set the initial values to the defaults
      filter.reset();

      $scope.$watchMulti(['[]fieldCounts', '[]columns', '[]hits'], function(cur, prev) {
        const newHits = cur[2] !== prev[2];
        const hits = $scope.hits;

        if (!$scope.fields || newHits) {
          $scope.fields = getFields($scope.indexPattern, hits, $scope.fieldCounts);
        }

        if (!$scope.fields) return;
        $scope.popularLimit = config.get('fields:popularLimit');
      });

      $scope.getDetails = field => {
        const details = {
          visualizeUrl:
            getServices().capabilities.visualize.show && isFieldVisualizable(field)
              ? getVisualizeUrl(
                  field,
                  $scope.indexPattern,
                  $scope.state,
                  $scope.columns,
                  config.get('discover:aggs:terms:size'),
                  $location.search()
                )
              : null,
          ...fieldCalculator.getFieldValueCounts({
            hits: $scope.hits,
            field: field,
            count: 5,
            grouped: false,
          }),
        };
        if (details.buckets) {
          for (const bucket of details.buckets) {
            bucket.display = field.format.convert(bucket.value);
          }
        }
        return details;
      };

      function getFields(indexPattern, hits, fieldCounts) {
        if (!indexPattern || !hits || !fieldCounts) return;

        const fieldSpecs = indexPattern.fields.slice(0);
        const fieldNamesInDocs = Object.keys(fieldCounts);
        const fieldNamesInIndexPattern = map(indexPattern.fields, 'name');

        difference(fieldNamesInDocs, fieldNamesInIndexPattern).forEach(function(unknownFieldName) {
          fieldSpecs.push({
            name: unknownFieldName,
            type: 'unknown',
          });
        });

        return new IndexPatternFieldList(indexPattern, fieldSpecs);
      }
    },
  };
}
