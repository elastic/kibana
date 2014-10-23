define(function (require) {
  var _ = require('lodash');

  var name = function (fn) {
    return fn.name || fn.toString().split('\n').shift();
  };

  /**
   * create private services and factories that can still use angular deps
   * @type {[type]}
   */
  var privPath = [];
  var pathToString = function () {
    return privPath.map(name).join(' -> ');
  };

  // uniq ids for every module, across instances
  var nextId = (function () {
    var i = 0;
    return function () { return 'pm_' + i++; };
  }());

  var module = require('modules').get('kibana');
  module.service('Private', function ($injector) {
    // one cache per instance of the Private service
    var cache = {};

    function identify(fn) {
      if (typeof fn !== 'function') {
        throw new TypeError('Expected private module "' + fn + '" to be a function');
      }

      if (fn.$$id) return fn.$$id;
      else return (fn.$$id = nextId());
    }

    function Private(fn) {
      var id = identify(fn);

      if (cache[id]) return cache[id];
      else if (~privPath.indexOf(fn)) {
        throw new Error(
          'Circluar refrence to "' + name(fn) + '"' +
          ' found while resolving private deps: ' + pathToString()
        );
      }

      privPath.push(fn);
      var context = {};

      var instance = $injector.invoke(fn, context);
      // if the function returned an instance of something, use that. Otherwise use the context
      if (!_.isObject(instance)) instance = context;

      privPath.pop();

      cache[id] = instance;
      return instance;
    }

    Private.stub = function (fn, val) {
      cache[identify(fn)] = val;
      return val;
    };

    return Private;
  });
});
