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

import _ from 'lodash';
import { uiModules } from '../modules';
import './paginate';
import './kbn_href';
import paginatedSelectableListTemplate from './partials/paginated_selectable_list.html';

const module = uiModules.get('kibana');

function throwError(message) {
  throw new Error(message);
}

module.directive('paginatedSelectableList', function () {

  return {
    restrict: 'E',
    scope: {
      perPage: '=?',
      list: '=',
      listProperty: '@',
      userMakeUrl: '=?',
      userOnSelect: '=?',
      disableAutoFocus: '='
    },
    template: paginatedSelectableListTemplate,
    controller: function ($scope, $filter) {
      function calculateHitsByQuery() {
        $scope.hitsByQuery = $filter('filter')($scope.hits, $scope.query);
      }

      // Should specify either user-make-url or user-on-select
      if (!$scope.userMakeUrl && !$scope.userOnSelect) {
        throwError('paginatedSelectableList directive expects a makeUrl or onSelect function');
      }

      // Should specify either user-make-url or user-on-select, but not both.
      if ($scope.userMakeUrl && $scope.userOnSelect) {
        throwError('paginatedSelectableList directive expects a makeUrl or onSelect attribute but not both');
      }

      $scope.perPage = $scope.perPage || 10;
      $scope.hits = $scope.list = _.sortBy($scope.list, $scope.accessor);
      $scope.$watchGroup(['hits', 'query'], calculateHitsByQuery);
      calculateHitsByQuery();
      $scope.hitCount = $scope.hits.length;

      /**
       * Boolean that keeps track of whether hits are sorted ascending (true)
       * or descending (false)
       * * @type {Boolean}
       */
      $scope.isAscending = true;

      /**
       * Sorts saved object finder hits either ascending or descending
       * @param  {Array} hits Array of saved finder object hits
       * @return {Array} Array sorted either ascending or descending
       */
      $scope.sortHits = function (hits) {
        const sortedList = _.sortBy(hits, $scope.accessor);

        $scope.isAscending = !$scope.isAscending;
        $scope.hits = $scope.isAscending ? sortedList : sortedList.reverse();
      };

      $scope.makeUrl = function (hit) {
        return $scope.userMakeUrl(hit);
      };

      $scope.onSelect = function (hit, $event) {
        return $scope.userOnSelect(hit, $event);
      };

      $scope.accessor = function (val) {
        const prop = $scope.listProperty;
        return prop ? _.get(val, prop) : val;
      };
    }
  };
});
