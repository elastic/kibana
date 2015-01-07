define(function (require) {
  var _ = require('lodash');
  var modules = require('modules');

  function AppStateProvider(Private, $rootScope, getAppState) {
    var State = Private(require('components/state_management/state'));

    _(AppState).inherits(State);
    function AppState(defaults) {
      AppState.Super.call(this, '_a', defaults);
      getAppState._set(this);
    }

    // if the url param is missing, write it back
    AppState.prototype._persistAcrossApps = false;

    AppState.prototype.destroy = function () {
      AppState.Super.prototype.destroy.call(this);
      getAppState._set(null);
    };

    return AppState;
  }

  modules.get('kibana/global_state')
  .factory('AppState', function (Private) {
    return Private(AppStateProvider);
  })
  .service('getAppState', function () {
    var currentAppState;

    function get() {
      return currentAppState;
    }

    get._set = function (current) {
      currentAppState = current;
    };

    return get;
  });

  return AppStateProvider;
});
