define(function (require) {
  var _ = require('lodash');
  var IndexedArray = require('utils/indexed_array/index');

  return function createRegistry(name, indexedArrayOpts) {
    var modules = [];
    indexedArrayOpts = indexedArrayOpts || { index: ['name'] };

    var registry = function (Private) {
      var opts = _.cloneDeep(indexedArrayOpts);
      opts.initialSet = modules.map(Private);
      return new IndexedArray(opts);
    };

    registry.name = name + 'Registry';
    registry.register = function (privateModule) {
      modules.push(privateModule);
      return registry;
    };

    return registry;
  };

});