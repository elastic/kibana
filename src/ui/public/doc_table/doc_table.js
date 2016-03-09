import React, { Component, PropType } from 'react';
import _ from 'lodash';

import uiModules from 'ui/modules';
import 'ui/directives/truncated';
import 'ui/directives/infinite_scroll';

import './doc_table.less';
import getSort from './lib/get_sort';
import './components/doc_table_react_bridge';

uiModules.get('kibana')
.directive('docTable', function (config, Notifier, getAppState, shortDotsFilter) {
  return {
    restrict: 'E',
    template: `
      <react-component
        ng-if="props"
        watch-depth="reference"
        name="DocTableReactBridge"
        props="props">
    `,
    scope: {
      sorting: '=',
      columns: '=',
      hits: '=?', // You really want either hits & indexPattern, OR searchSource
      indexPattern: '=?',
      searchSource: '=?',
      infiniteScroll: '=?',
      filter: '=?',
    },
    link($scope) {
      var notify = new Notifier();

      $scope.limit = 50;
      $scope.shortDotsFilter = shortDotsFilter;
      $scope.persist = {
        sorting: $scope.sorting,
        columns: $scope.columns
      };

      var prereq = (function () {
        var fns = [];

        return function register(fn) {
          fns.push(fn);

          return function () {
            fn.apply(this, arguments);

            if (fns.length) {
              _.pull(fns, fn);
              if (!fns.length) {
                $scope.$root.$broadcast('ready:vis');
              }
            }
          };
        };
      }());

      $scope.$watchMulti([
        'limit',
        '[]columns',
        'indexPattern',
        'searchSource',
        'hits',
        'infiniteScroll',
      ], function () {
        $scope.props = {
          limit: $scope.limit,
          columns: $scope.columns,
          indexPattern: $scope.indexPattern,
          searchSource: $scope.searchSource,
          hits: $scope.hits,
          infiniteScroll: $scope.infiniteScroll,

          // actions, these are wrapped by react-component to trigger $scope.$apply
          moveColLeft: $scope.moveColLeft,
          moveColRight: $scope.moveColRight,
          toggleCol: $scope.toggleCol,
          sortByCol: $scope.sortByCol,

          // helpers, to prevent wrapping in $scope.$apply wrap in an object
          helpers: {
            isColSortable: $scope.isColSortable,
            isColRemovable: $scope.isColRemovable,
            shortDotsFilter: $scope.shortDotsFilter,
          }
        };
      });

      $scope.addRows = function () {
        $scope.limit += 50;
      };

      $scope.moveColLeft = function (column) {
        var index = _.indexOf($scope.columns, column);
        if (index === 0) return;
        _.move($scope.columns, index, --index);
      };

      $scope.moveColRight = function (column) {
        var index = _.indexOf($scope.columns, column);
        if (index === $scope.columns.length - 1) return;

        _.move($scope.columns, index, ++index);
      };

      $scope.toggleCol = function (fieldName) {
        _.toggleInOut($scope.columns, fieldName);
      };

      $scope.isColSortable = function (column) {
        return !!_.get($scope, ['indexPattern', 'fields', 'byName', column, 'sortable']);
      };

      $scope.isColRemovable = function (name) {
        return (name !== '_source' || $scope.columns.length !== 1);
      };

      $scope.sortByCol = function (column) {
        if (!column || !$scope.isColSortable(column)) return;

        var sorting = $scope.sorting = $scope.sorting || [];

        var direction = sorting[1] || 'asc';
        if (sorting[0] !== column) {
          direction = 'asc';
        } else {
          direction = sorting[1] === 'asc' ? 'desc' : 'asc';
        }

        $scope.sorting[0] = column;
        $scope.sorting[1] = direction;
      };

      // This exists to fix the problem of an empty initial column list not playing nice with watchCollection.
      $scope.$watch('columns', function (columns) {
        if (columns.length !== 0) return;

        var $state = getAppState();
        $scope.columns.push('_source');
        if ($state) $state.replace();
      });

      $scope.$watchCollection('columns', function (columns, oldCols) {
        if (oldCols.length === 1 && oldCols[0] === '_source' && $scope.columns.length > 1) {
          _.pull($scope.columns, '_source');
        }

        if ($scope.columns.length === 0) $scope.columns.push('_source');
      });

      $scope.$watch('searchSource', prereq(function (searchSource) {
        if (!$scope.searchSource) return;

        $scope.indexPattern = $scope.searchSource.get('index');

        $scope.searchSource.size(config.get('discover:sampleSize'));
        $scope.searchSource.sort(getSort($scope.sorting, $scope.indexPattern));

        // Set the watcher after initialization
        $scope.$watchCollection('sorting', function (newSort, oldSort) {
          // Don't react if sort values didn't really change
          if (newSort === oldSort) return;
          $scope.searchSource.sort(getSort(newSort, $scope.indexPattern));
          $scope.searchSource.fetchQueued();
        });

        $scope.$on('$destroy', function () {
          if ($scope.searchSource) $scope.searchSource.destroy();
        });

        // TODO: we need to have some way to clean up result requests
        $scope.searchSource.onResults().then(function onResults(resp) {
          // Reset infinite scroll limit
          $scope.limit = 50;

          // Abort if something changed
          if ($scope.searchSource !== $scope.searchSource) return;

          $scope.hits = resp.hits.hits;

          return $scope.searchSource.onResults().then(onResults);
        }).catch(notify.fatal);

        $scope.searchSource.onError(notify.error).catch(notify.fatal);
      }));
    }
  };
});
