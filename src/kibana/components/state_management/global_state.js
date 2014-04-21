define(function (require) {
  var _ = require('lodash');
  var angular = require('angular');

  var module = require('modules').get('kibana/global_state');

  module.service('globalState', function ($rootScope, $location, $route, $injector, Promise) {
    var globalState = this;

    // store the current app and it's metadata here
    var app, appMeta;

    // resolve all of these when a global update is detected coming in from the url
    var updateListeners = [];

    // resolve all of these when ANY global update is detected coming in from the url
    var anyUpdateListeners = [];

    globalState._setApp = function (newApp) {
      app = newApp;
      appMeta = {
        name: $route.current.$$route.originalPath,
        listeners: []
      };

      sync.pull();
    };

    var sync = (function () {
      var diffTrans = function (trans) {
        var obj = trans[0];
        var update = trans[1];

        var diff = {};

        // the keys that are currently set on obj, excluding methods
        var objKeys = Object.keys(obj).filter(function (key) {
          return typeof obj[key] !== 'function';
        });

        if (update) {
          // the keys obj should have after applying the update
          var updateKeys = diff.keys = Object.keys(update).filter(function (key) {
            return typeof update[key] !== 'function';
          });

          // the keys that will be removed
          diff.remove = _.difference(objKeys, updateKeys);

          // list of keys that will be added or changed
          diff.change = updateKeys.filter(function (key) {
            return !angular.equals(obj[key], update[key]);
          });
        } else {
          diff.keys = objKeys.slice(0);
          diff.remove = [];
          diff.change = [];
        }

        // single list of all keys that are effected
        diff.all = [].concat(diff.remove, diff.change);

        return diff;
      };

      var notify = function (trans, diff) {
        var listeners = null;

        if (trans[0] === app) {
          listeners = appMeta.listeners;
        } else if (trans[0] === globalState) {
          listeners = updateListeners;
        } else if (trans[1] === globalState) {
          // if the update is coming from the globalState, only onAnyUpdate listeners will be notified
          listeners = anyUpdateListeners;
        }

        listeners && listeners.splice(0).forEach(function (defer) {
          defer.resolve(diff.all.slice(0));
        });
      };

      var applyDiff = function (trans, diff) {
        if (!diff.all.length) return;

        var obj = trans[0];
        var update = trans[1];

        diff.remove.forEach(function (key) {
          delete obj[key];
        });

        diff.change.forEach(function (key) {
          obj[key] = update[key];
        });
      };

      var syncTrans = function (trans, forceNotify) {
        trans[0] = trans[0] || {}; // obj that will be modified by update(trans[1])

        var diff = diffTrans(trans);
        if (forceNotify || diff.all.length) {
          applyDiff(trans, diff);
          notify(trans, diff);
        }
        return diff;
      };

      return {
        // sync by pushing to the url
        push: function (forceNotify) {
          var qs = $location.search();

          var res = _.mapValues({
            app: [
              qs._a ? rison.decode(qs._a) : {},
              app
            ],
            global: [
              qs._g ? rison.decode(qs._g) : {},
              globalState
            ]
          }, function (trans, key) {
            var diff = syncTrans(trans, forceNotify);
            var urlKey = '_' + key.charAt(0);
            if (diff.keys.length === 0) {
              delete qs[urlKey];
            } else {
              qs[urlKey] = rison.encode(trans[0]);
            }
            return diff;
          });

          $location.search(qs);
          return res;
        },
        // sync by pulling from the url
        pull: function (forceNotify) {
          var qs = $location.search();

          var appStash = qs._a && rison.decode(qs._a);
          var globalStash = qs._g && rison.decode(qs._g);

          return _.mapValues({
            app: [app, appStash],
            global: [globalState, globalStash]
          }, function (trans) {
            return syncTrans(trans, forceNotify);
          });
        }
      };
    }());

    var unwatch = [
      //                     force the event arg out of the way \/
      $rootScope.$on('$locationChangeSuccess', sync.pull.bind(null, null)),
      //                     force the event arg out of the way \/
      $rootScope.$on('$locationUpdate', sync.pull.bind(null, null))
    ];

    globalState.onUpdate = function (handler) {
      return new Promise.emitter(function (resolve, reject, defer) {
        updateListeners.push(defer);
      }, handler);
    };

    globalState.onAnyUpdate = function (handler) {
      return new Promise.emitter(function (resolve, reject, defer) {
        anyUpdateListeners.push(defer);
      }, handler);
    };

    globalState.onAppUpdate = function (handler) {
      return new Promise.emitter(function (resolve, reject, defer) {
        appMeta.listeners.push(defer);
      }, handler);
    };

    /**
     * Commit the globalState as a history item
     */
    globalState.commit = function () {
      return sync.push(true);
    };

    // set the on globalState
    sync.pull();
  });

});