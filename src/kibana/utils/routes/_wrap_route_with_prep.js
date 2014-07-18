define(function (require) {
  var angular = require('angular');
  var _ = require('lodash');

  var WorkQueue = require('utils/routes/_work_queue');
  var errors = require('errors');

  function wrapRouteWithPrep(route) {
    if (!route.resolve && route.redirectTo) return;

    var userWork = new WorkQueue();
    // the point at which we will consider the queue "full"
    userWork.limit = _.keys(route.resolve).length;

    var resolve = {
      __prep__: function (Private, Promise, $route, $injector, Notifier) {
        var setup = Private(require('utils/routes/_setup'));

        return setup.routeSetupWork()
        .then(function () {
          // wait for the queue to fill up, then do all the work
          var defer = Promise.defer();
          userWork.resolveWhenFull(defer);

          return defer.promise.then(function () {
            return Promise.all(userWork.doWork());
          });
        })
        .catch(function (err) {
          // discard any remaining user work
          userWork.empty();
          return setup.handleKnownError(err);
        });
      }
    };

    // send each user resolve to the userWork queue, which will prevent it from running before the
    // prep is complete
    _.forOwn(route.resolve || {}, function (expr, name) {
      resolve[name] = function ($injector, Promise) {
        var defer = Promise.defer();
        userWork.push(defer);
        return defer.promise.then(function () {
          return $injector[angular.isString(expr) ? 'get': 'invoke'](expr);
        });
      };
    });

    // we're copied everything over so now overwrite
    route.resolve = resolve;
  }

  return wrapRouteWithPrep;
});