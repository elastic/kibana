define(function (require) {
  /**
   * Private module loader, used to merge angular and require js dependency styles
   * by allowing a require.js module to export a single provider function that will
   * create a value used within an angular application. This provider can declare
   * angular dependencies by listing them as arguments, and can be require additional
   * Private modules.
   *
   * ## Examples
   *
   * Define a private module provider:
   * ```js
   * define(function (require) {
   *   return function PingProvider($http) {
   *
   *     this.ping = function () {
   *       return $http.head('/health-check');
   *     };
   *
   *   };
   * });
   * ```
   *
   * Require a private module:
   * ```js
   * define(function (require) {
   *   return function ServerHealthProvider(Private, Promise) {
   *     var ping = Private(require('components/ping'));
   *
   *     return {
   *       check: Promise.method(function () {
   *         var attempts = 0;
   *         return (function attempt() {
   *           attempts += 1;
   *           return ping.ping()
   *           .catch(function (err) {
   *             if (attempts < 3) return attempt();
   *           })
   *         }())
   *         .then(function () {
   *           return true;
   *         })
   *         .catch(function () {
   *           return false;
   *         });
   *       })
   *     }
   *   };
   * });
   * ```
   *
   * @param {[type]} prov [description]
   */


  var _ = require('lodash');
  var nextId = _.partial(_.uniqueId, 'privateProvider#');

  function name(fn) {
    return fn.name || fn.toString().split('\n').shift();
  }

  require('modules').get('kibana')
  .provider('Private', function () {
    var provider = this;

    // one cache/swaps per Provider
    var cache = {};
    var swaps = {};

    // return the uniq id for this function
    function identify(fn) {
      if (typeof fn !== 'function') {
        throw new TypeError('Expected private module "' + fn + '" to be a function');
      }

      if (fn.$$id) return fn.$$id;
      else return (fn.$$id = nextId());
    }

    provider.stub = function (fn, instance) {
      cache[identify(fn)] = instance;
      return instance;
    };

    provider.swap = function (fn, constructor) {
      var id = identify(fn);
      swaps[id] = constructor;
      delete cache[id];
    };

    provider.$get = ['$injector', function PrivateFactory($injector) {

      // prevent circular deps by tracking where we came from
      var privPath = [];
      var pathToString = function () {
        return privPath.map(name).join(' -> ');
      };

      // call a private provider and return the instance it creates
      function instantiate(prov, locals) {
        if (~privPath.indexOf(prov)) {
          throw new Error(
            'Circluar refrence to "' + name(prov) + '"' +
            ' found while resolving private deps: ' + pathToString()
          );
        }

        privPath.push(prov);

        var context = {};
        var instance = $injector.invoke(prov, context, locals);
        // if the function returned an instance of something, use that. Otherwise use the context
        if (!_.isObject(instance)) instance = context;

        privPath.pop();
        return instance;
      }

      function Private(prov) {
        var id = identify(prov);
        if (cache[id]) return cache[id];

        var instance;
        if (swaps[id]) {
          instance = instantiate(swaps[id], {
            $decorate: _.partial(instantiate, prov)
          });
        } else {
          instance = instantiate(prov);
        }

        return (cache[id] = instance);
      }

      Private.stub = provider.stub;
      Private.swap = provider.swap;

      return Private;
    }];
  });
});
