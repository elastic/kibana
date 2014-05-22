define(function (require) {
  var _ = require('lodash');

  return function LocalCacheFactory() {
    function LocalCache(opts) {
      opts = opts || {};
      var _id = opts.id || function (o) { return '' + o; };
      var _cache = {};

      this.get = function (obj) {
        var id = _id(obj);
        return _.isObject(_cache[id]) ? _.cloneDeep(_cache[id]) : _cache[id];
      };

      this.set = function (obj, val) {
        var id = _id(obj);
        var clean = !_cache.hasOwnProperty(id);
        _cache[id] = _.isObject(val) ? _.cloneDeep(val) : val;
        return clean;
      };

      this.clear = function (obj) {
        if (!obj) {
          _cache = {};
          return;
        }

        var id = _id(obj);
        delete _cache[id];
      };
    }

    return LocalCache;
  };

});