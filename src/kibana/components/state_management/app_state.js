define(function (require) {
  var _ = require('lodash');
  var modules = require('modules');

  function AppStateProvider(Private, $rootScope) {
    var State = Private(require('components/state_management/state'));

    _(AppState).inherits(State);
    function AppState(defaults) {
      AppState.Super.call(this, '_a', defaults);
    }

    // if the url param is missing, write it back
    AppState.prototype._persistAcrossApps = false;

    // expose this as a factory as well

    return AppState;
  }

  modules.get('kibana/global_state')
  .factory('AppState', function (Private) {
    return Private(AppStateProvider);
  });

  return AppStateProvider;
});
