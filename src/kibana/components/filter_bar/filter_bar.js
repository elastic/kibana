define(function (require) {
  'use strict';
  var _ = require('lodash');
  var module = require('modules').get('kibana');
  var template = require('text!components/filter_bar/filter_bar.html');

  module.directive('filterBar', function (courier) {
    return {
      restrict: 'E',
      template: template,
      scope: {
        state: '='
      },
      link: function ($scope, $el, attrs) {

        /**
         * Map the filter into an object with the key and value exposed so it's
         * easier to work with in the template
         * @param {object} fitler The filter the map
         * @returns {object}
         */
        var mapFilter = function (filter) {
          var key = _.keys(filter.query.match)[0];
          return {
            key: key,
            value: filter.query.match[key].query,
            disabled: !!(filter.disabled),
            negate: !!(filter.negate),
            filter: filter
          };
        };

        $scope.$watch('state.filters', function (filters) {
          // Get the filters from the searchSource
          $scope.filters = _(filters)
            .filter(function (filter) {
              return filter;
            })
            .flatten(true)
            .map(mapFilter)
            .value();

        });

        /**
         * Remap the filter from the intermediary back to it's original.
         * @param {object} filter The original filter
         * @returns {object}
         */
        var remapFilters = function (filter) {
          return filter.filter;
        };

        /**
         * Toggles the filter between enabled/disabled.
         * @param {object} filter The filter to toggle
         * @returns {void}
         */
        $scope.toggleFilter = function (filter) {
          // Toggle the disabled flag
          var disabled = !filter.disabled;
          filter.disabled = disabled;
          filter.filter.disabled = disabled;

          // Save the filters back to the searchSource
          $scope.state.filters = _.map($scope.filters, remapFilters);
        };

        /**
         * Removes the filter from the searchSource
         * @param {object} filter The filter to remove
         * @returns {void}
         */
        $scope.removeFilter = function (invalidFilter) {
          // Remove the filter from the the scope $filters and map it back
          // to the original format to save in searchSource
          $scope.state.filters = _($scope.filters)
            .filter(function (filter) {
              return filter.filter !== invalidFilter.filter;
            })
            .map(remapFilters)
            .value();
        };

      }
    };
  });
});
