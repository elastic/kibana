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

import 'angular';
import 'angular-recursion';
import './';
import { uiModules } from 'ui/modules';
import aggTableGroupTemplate from './agg_table_group.html';

uiModules
  .get('kibana', ['RecursionHelper'])
  .directive('kbnAggTableGroup', function (RecursionHelper) {
    return {
      restrict: 'E',
      template: aggTableGroupTemplate,
      scope: {
        group: '=',
        dimensions: '=',
        perPage: '=?',
        sort: '=?',
        exportTitle: '=?',
        showTotal: '=',
        totalFunc: '=',
        filter: '=',
      },
      compile: function ($el) {
      // Use the compile function from the RecursionHelper,
      // And return the linking function(s) which it returns
        return RecursionHelper.compile($el, {
          post: function ($scope) {
            $scope.$watch('group', function (group) {
            // clear the previous "state"
              $scope.rows = $scope.columns = false;

              if (!group || !group.tables.length) return;

              const childLayout = (group.direction === 'row') ? 'rows' : 'columns';

              $scope[childLayout] = group.tables;
            });
          }
        });
      }
    };
  });
