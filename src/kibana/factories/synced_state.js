define(function (require) {
  var module = require('modules').get('kibana/factories');
  var angular = require('angular');
  var _ = require('lodash');
  var rison = require('utils/rison');

  module.factory('SyncedState', function ($rootScope, $route, $location, Promise) {
    function SyncedState(defaults) {
      var state = this;

      var updateHandlers = [];
      var abortHandlers = [];

      // serialize the defaults so that they are easily used in onPossibleUpdate
      var defaultRison = rison.encode(defaults);

      // store the route matching regex so we can determine if we match later down the road
      var routeRegex = $route.current.$$route.regexp;
      // this will be used to store the state in local storage
      var routeName = $route.current.$$route.originalPath;

      var diffStates = function (a, b) {
        var changes = {
          update: b,

          set: [],
          remove: []
        };

        // all the keys that the object will have at the end
        var newKeys = Object.keys(b).concat(baseKeys);

        // the keys that got removed
        _.difference(Object.keys(a), newKeys).forEach(function (key) {
          changes.remove.push(key);
        });

        newKeys.forEach(function (key) {
          // don't overwrite object methods
          if (typeof state[key] !== 'function') {
            if (!angular.equals(a[key], b[key])) {
              changes.set.push(key);
            }
          }
        });

        return changes;
      };

      var flattenDiff = function (diff) {
        return [].concat(diff.set, diff.remove);
      };

      var apply = function (diff) {
        diff.remove.forEach(function (key) {
          delete state[key];
        });

        diff.set.forEach(function (key) {
          state[key] = diff.update[key];
        });

        notify(diff);
      };

      var notify = function (diff) {
        if (diff.set.length || diff.remove.length) {
          abortHandlers.splice(0);
          updateHandlers.splice(0).forEach(function (handler, i, list) {
            // micro optimizations!
            handler(flattenDiff(diff));
          });
        }
      };

      var onPossibleUpdate = function () {
        if (routeRegex.test($location.path())) {
          var qs = $location.search();

          if (!qs._r) {
            qs._r = defaultRison;
            $location.search(qs);
          }

          apply(diffStates(state, rison.decode(qs._r)));
        }
      };

      var unwatch = [];
      unwatch.push($rootScope.$on('$locationChangeSuccess', onPossibleUpdate));
      unwatch.push($rootScope.$on('$locationUpdate', onPossibleUpdate));

      state.onUpdate = function (handler) {
        return new Promise.emitter(function (resolve, reject) {
          updateHandlers.push(resolve);
          abortHandlers.push(reject);
        }, handler);
      };

      /**
       * Commit the state as a history item
       */
      state.commit = function () {
        var qs = $location.search();
        var prev = rison.decode(qs._r || '()');
        qs._r = rison.encode(state);
        $location.search(qs);
        var diff = diffStates(prev, state);
        notify(diff);
        return flattenDiff(diff);
      };

      state.destroy = function () {
        updateHandlers.splice(0);
        unwatch.splice(0).concat(abortHandlers.splice(0)).forEach(function (fn) { fn(); });
      };

      // track the "known" keys that state objects have
      var baseKeys = Object.keys(state);

      // set the defaults on state
      onPossibleUpdate();
    }

    return SyncedState;
  });

});