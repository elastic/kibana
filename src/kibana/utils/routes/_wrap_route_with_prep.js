define(function (require) {
  var angular = require('angular');
  var _ = require('lodash');

  var errors = require('errors');
  var NoDefaultIndexPattern = errors.NoDefaultIndexPattern;
  var NoDefinedIndexPatterns = errors.NoDefinedIndexPatterns;

  var WorkQueue = require('utils/routes/_work_queue');

  var oneTimeSetup = function ($q, kbnSetup, config) {
    var prom = $q.all([
      kbnSetup(),
      config.init(),
    ]);

    // override setup to only return the promise
    oneTimeSetup = function () { return prom; };

    return prom;
  };

  return function (route) {
    if (!route.resolve && route.redirectTo) {
      return;
    }

    var userWork = new WorkQueue();
    // the point at which we will consider the queue "full"
    userWork.limit = _.keys(route.resolve).length;

    var waitForPrepWorkThen = function (expr) {
      return function ($injector, Promise) {
        var defer = Promise.defer();
        userWork.push(defer);
        return defer.promise.then(function () {
          return $injector[angular.isString(expr) ? 'get': 'invoke'](expr);
        });
      };
    };

    var resolve = {
      __prep__: function (Promise, $injector, config, $route, Notifier, indexPatterns) {
        return $injector.invoke(oneTimeSetup)
        .then(function () {
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
        })
        .then(function () {
          // wait for the queue to fill up, then do all the work
          var defer = Promise.defer();
          userWork.resolveWhenFull(defer);

          defer.promise.then(function () {
            return Promise.all(userWork.doWork());
          });

          return defer.promise;
        })
        .catch(function (err) {
          // discard any remaining user work
          userWork.empty();

          if (err instanceof NoDefaultIndexPattern || err instanceof NoDefinedIndexPatterns) {
            $route.change('/settings/indices');
            (new Notifier()).error(err);
          } else {
            throw err;
          }
        });
      }
    };

    // copy over the userWork to the new resolve object
    _.forOwn(route.resolve || {}, function (userWork, name) {
      resolve[name] = waitForPrepWorkThen(userWork);
    });

    // we're copied everything over so now overwrite
    route.resolve = resolve;
  };
});