define(function (require) {
  var _ = require('lodash');
  var angular = require('angular');
  var qs = require('utils/query_string');
  var rison = require('utils/rison');

  var module = require('modules').get('kibana/global_state');

  module.service('globalState', function (Private, $rootScope, $route, $injector, Promise) {
    var globalState = this;

    var setupSync = Private(require('components/state_management/_state_sync'));

    // store app related stuff in here
    var app = {};

    // resolve all of these when a global update is detected coming in from the url
    var updateListeners = [];

    // resolve all of these when ANY global update is detected coming in from the url
    var anyUpdateListeners = [];

    globalState._setApp = function (newAppState, defaults) {
      app.current = newAppState;
      app.defaults = _.cloneDeep(defaults);
      app.name = $route.current.$$route.originalPath;
      app.listeners = [];

      sync.pull();
    };

    globalState.writeToUrl = function (url) {
      return qs.replaceParamInUrl(url, '_g', rison.encode(globalState));
    };

    // exposes sync.pull and sync.push
    var sync = setupSync(globalState, updateListeners, app);

    $rootScope.$on('$routeUpdate', function () {
      sync.pull();
    });

    globalState.onUpdate = function (handler) {
      return new Promise.emitter(function (resolve, reject, defer) {
        updateListeners.push(defer);
      }, handler);
    };

    globalState.onAppUpdate = function (handler) {
      return new Promise.emitter(function (resolve, reject, defer) {
        app.listeners.push(defer);
      }, handler);
    };

    /**
     * Commit the globalState as a history item
     */
    globalState.commit = function () {
      return sync.push(true);
    };

    // pull in the default globalState
    sync.pull();
  });

});