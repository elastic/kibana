define(function (require) {
  var _ = require('lodash');
  var module = require('modules').get('kibana/factories');

  module.factory('AppState', function (Private) {
    var State = Private(require('components/state_management/state'));

    function AppState(defaults) {
      AppState.Super.call(this, '_a', defaults);
    }
    _.inherits(AppState, State);

    return AppState;
  });

});
