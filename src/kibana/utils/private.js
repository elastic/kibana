define(function (require) {

  var name = function (construct) {
    return construct.name || construct.toString().split('\n').shift();
  };

  /**
   * create private services and factories that can still use angular deps
   * @type {[type]}
   */
  var privPath = [];
  var pathToString = function () {
    return privPath.map(name).join(' -> ');
  };

  var module = require('modules').get('kibana/utils');
  module.service('Private', function ($injector) {
    return function Private(construct) {
      if (typeof construct !== 'function') {
        throw new TypeError('Expected private module "' + construct + '" to be a function');
      }

      var circular = !!(~privPath.indexOf(construct));
      if (circular) throw new Error('Circluar refrence to "' + name(construct) + '" found while resolving private deps: ' + pathToString());

      privPath.push(construct);

      if (!construct.$$instance) {
        var instance = {};
        construct.$$instance = $injector.invoke(construct, instance);
        construct.$$instance = construct.$$instance || instance;
      }

      privPath.pop();
      return construct.$$instance;
    };
  });
});