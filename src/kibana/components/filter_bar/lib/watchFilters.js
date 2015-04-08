define(function (require) {
  return function watchFiltersProvider(Private, Promise, Notifier) {
    var _ = require('lodash');
    var onlyDisabled = require('components/filter_bar/lib/onlyDisabled');
    var EventEmitter = Private(require('factories/events'));
    var notify = new Notifier({ location: 'Fitler Bar' });

    return function ($scope, handlers) {
      var emitter = new EventEmitter();

      $scope.$watch('state.filters', function (newFilters, oldFilters) {
        if (newFilters === oldFilters) return;

        return emitter.emit('update')
        .then(function () {
          if (onlyDisabled(newFilters, oldFilters)) return;
          return emitter.emit('fetch');
        });
      });

      return emitter;
    };
  };
});
