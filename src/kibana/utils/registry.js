define(function (require) {

  var _ = require('lodash');

  var inflectIndex = inflector('by');
  var inflectOrder = inflector('in', 'Order');

  _(Registry).inherits(Array);
  function Registry(config, contents) {
    Registry.Super.call(this);

    config = config || {};

    this.raw = [];

    this._doIndex = indexer(config.index, inflectIndex, _.indexBy);
    this._doGroup = indexer(config.group, inflectIndex, _.groupBy);
    this._doOrder = indexer(config.order, inflectOrder, _.sortBy);

    config.initialSet = config.initialSet || [];
    this.push.apply(this, config.initialSet);

    if (config.immutable) {
      // just a hint, should get the point across
      this.push = this.add = undefined;
    }

    this._reindex();
  }

  Registry.prototype._reindex = function () {
    this._doIndex();
    this._doGroup();
    this._doOrder();
  };

  Registry.prototype.push = reindexingProxy(Array.prototype.push);
  Registry.prototype.splice = reindexingProxy(Array.prototype.splice);

  // convert to a simple array
  Registry.prototype.toJSON = function () {
    return this.slice(0);
  };

  function upFirst(str) {
    return str.charAt(0).toUpperCase() + str.substr(1);
  }

  function inflector(prefix, postfix) {
    return function inflect(key) {
      var inflected = key;

      if (key.indexOf('.') !== -1) {
        inflected = key
          .split('.')
          .map(function (step, i) {
            return (i === 0) ? step : upFirst(step);
          })
          .join('');
      }

      if (prefix && key.indexOf(prefix) !== 0) {
        inflected = prefix + upFirst(inflected);
      }

      if (postfix && key.lastIndexOf(postfix) !== key.length - postfix.length) {
        inflected = inflected + postfix;
      }

      return {
        from: key,
        to: inflected
      };
    };
  }

  function pathGetter(path) {
    path = path.split('.');
    if (path.length === 1) {
      // shortcut for non-path based get
      path = path.pop();
      return function (obj) {
        return obj[path];
      };
    }

    return function (obj) {
      for (var i = 0; obj != null && i < path.length; i++) {
        obj = obj[path[i]];
      }
      return obj;
    };
  }

  function indexer(keys, inflect, method) {
    // shortcut for empty keys
    if (!keys || keys.length === 0) return _.noop;

    var jobs = (keys || []).map(function (key) {
      var inflected = inflect(key);
      return {
        from: pathGetter(inflected.from),
        to: inflected.to
      };
    });

    return function () {
      var self = this;
      jobs.forEach(function (config) {
        self[config.to] = method(self, config.from);
      });
    };
  }

  function reindexingProxy(fn) {
    return function (/* args... */) {
      fn.apply(this, arguments);
      this._reindex();
      return fn.apply(this.raw, arguments);
    };
  }

  return Registry;
});