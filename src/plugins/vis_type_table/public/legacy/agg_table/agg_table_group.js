/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import aggTableGroupTemplate from './agg_table_group.html';

export function KbnAggTableGroup(RecursionHelper) {
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
      percentageCol: '=',
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

            const childLayout = group.direction === 'row' ? 'rows' : 'columns';

            $scope[childLayout] = group.tables;
          });
        },
      });
    },
  };
}
