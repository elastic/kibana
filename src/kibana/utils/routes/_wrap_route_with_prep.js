define(function (require) {
  var angular = require('angular');
  var _ = require('lodash');

  var WorkQueue = require('utils/routes/_work_queue');


  function wrapRouteWithPrep(route) {
    if (!route.resolve && route.redirectTo) return;

    var userWork = new WorkQueue();
    // the point at which we will consider the queue "full"
    userWork.limit = _.keys(route.resolve).length;

    var resolve = {
      __prep__: function (Promise, $route, $injector, Notifier) {
        return $injector.invoke(wrapRouteWithPrep._oneTimeSetup).then(function () {
          return $injector.invoke(wrapRouteWithPrep._setupComplete);
        })
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

  // broken out so that it can be tested
  wrapRouteWithPrep._oneTimeSetup = function ($q, kbnSetup, config) {
    var prom = $q.all([
      kbnSetup(),
      config.init(),
    ]);

    // override setup to only return the promise
    wrapRouteWithPrep._oneTimeSetup = function () { return prom; };

    return prom;
  };

  // broken out so that it can be tested
  wrapRouteWithPrep._setupComplete = function ($route, indexPatterns, config) {
    if (!$route.current.$$route.originalPath.match(/settings\/indices/)) {
      // always check for existing ids first
      return indexPatterns.getIds()
      .then(function (patterns) {
        if (!patterns || patterns.length === 0) {
          throw new errors.NoDefinedIndexPatterns();
        }

        if (!config.get('defaultIndex')) {
          throw new NoDefaultIndexPattern();
        }
      });
    }
  };

  return wrapRouteWithPrep;
});