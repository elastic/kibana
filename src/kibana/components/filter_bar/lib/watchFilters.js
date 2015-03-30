define(function (require) {
  return function watchFiltersProvider(Promise) {
    var _ = require('lodash');
    var onlyDisabled = require('components/filter_bar/lib/onlyDisabled');

    return function ($scope, handlers) {
      if (!handlers || !handlers.update || !handlers.fetch) {
        throw new TypeError('handlers for update and fetch are required');
      }

      $scope.$watch('state.filters', function (newFilters, oldFilters) {
        if (newFilters === oldFilters) return;

        return Promise.resolve()
        .then(handlers.update)
        .then(function () {
          if (!onlyDisabled(newFilters, oldFilters)) {
            return handlers.fetch();
          }
        });

      });
    };
  };
});
