define(function (require) {
  var _ = require('lodash');

  return function AppStateProvider(Private) {
    var State = Private(require('components/state_management/state'));

    _.inherits(AppState, State);
    function AppState(defaults) {
      AppState.Super.call(this, '_a', defaults);
    }


    return AppState;
  };

});
