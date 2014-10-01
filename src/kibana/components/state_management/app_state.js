define(function (require) {
  var _ = require('lodash');

  return function AppStateProvider(Private, $rootScope) {
    var State = Private(require('components/state_management/state'));

    _(AppState).inherits(State);
    function AppState(defaults) {
      AppState.Super.call(this, '_a', defaults);

      // When we have a route change, destroy the app state
      $rootScope.$on('$routeChangeStart', _.bindKey(this, 'destroy'));
    }

    return AppState;
  };

});
