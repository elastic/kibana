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

      var set = function (obj) {
        var changed = [];
        // all the keys that the object will have at the end
        var newKeys = Object.keys(obj).concat(baseKeys);

        // the keys that got removed
        _.difference(Object.keys(state), newKeys).forEach(function (key) {
          delete state[key];
          changed.push(key);
        });

        newKeys.forEach(function (key) {
          // don't overwrite object methods
          if (typeof state[key] !== 'function') {
            if (!angular.equals(state[key], obj[key])) {
              state[key] = obj[key];
              changed.push(key);
            }
          }
        });

        if (changed.length) {
          updateHandlers.splice(0).forEach(function (handler, i, list) {
            // micro optimizations!
            handler(list.length > 1 ? _.clone(changed) : changed);
          });
        }

        return changed;
      };

      var onPossibleUpdate = function (qs) {
        if (routeRegex.test($location.path())) {
          qs = qs || $location.search();

          if (!qs._r) {
            qs._r = defaultRison;
            $location.search(qs);
          }

          return set(rison.decode(qs._r));
        }
      };

      var unwatch = [];
      unwatch.push($rootScope.$on('$locationChangeSuccess', _.partial(onPossibleUpdate, null)));
      unwatch.push($rootScope.$on('$locationUpdate', _.partial(onPossibleUpdate, null)));

      this.onUpdate = function () {
        var defer = Promise.defer();

        updateHandlers.push = defer.resolve;
        abortHandlers.push = defer.reject;

        return defer.promise;
      };

      /**
       * Commit the state as a history item
       */
      this.commit = function () {
        var qs = $location.search();
        qs._r = rison.encode(this);
        $location.search(qs);
        return onPossibleUpdate(qs) || [];
      };

      this.destroy = function () {
        unwatch.splice(0).concat(abortHandlers.splice(0)).forEach(function (fn) { fn(); });
      };

      // track the "known" keys that state objects have
      var baseKeys = Object.keys(this);

      // set the defaults on state
      onPossibleUpdate();
    }

    return SyncedState;
  });

});