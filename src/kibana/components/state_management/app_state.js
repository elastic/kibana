define(function (require) {
  var module = require('modules').get('kibana/factories');
  var angular = require('angular');
  var _ = require('lodash');
  var rison = require('utils/rison');

  require('./global_state');

  module.factory('AppState', function (globalState, $route, $location, Promise) {

    function AppState(defaults) {
      globalState._setApp(this, defaults);

      this.onUpdate = function (handler) {
        return globalState.onAppUpdate(handler);
      };

      this.commit = function () {
        var diff = globalState.commit();
        return diff.app.all;
      };
    }

    return AppState;
  });

});