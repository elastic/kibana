define(function (require) {
  var _ = require('lodash');
  var module = require('modules').get('kibana/factories');

  module.service('appStateFactory', function (Private) {
    var AppState = Private(require('components/state_management/app_state'));

    /**
     * We need to keep reference to the current so we can destroy it. When
     * we create a new one. The needs to happen because we need to reset the
     * listner queue and remove the refercne to the RootScope.
     */
    var currentAppState;

    var appStateFactory = {

      /**
       * Factory method for creating AppStates
       * @param {string} appName The app name
       * @param {object} defaults The the defaults for the AppState
       * @returns {object} AppState
       */
      create: function (defaults) {

        // Check to see if the state already exists. If it does then we need
        // to call the destory method.
        if (!_.isUndefined(currentAppState)) {
          currentAppState.destroy();
        }
        currentAppState = new AppState(defaults);

        return currentAppState;
      }
    };

    return appStateFactory;

  });

});

