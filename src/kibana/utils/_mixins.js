define(function (require) {
  /**
   * THESE ARE AUTOMATICALLY INCLUDED IN LODASH
   *
   * use:
   * var _ = require('lodash');
   *
   * require.js config points the 'lodash' id to
   * this module, which provides a modified version
   * of lodash.
   */
  var _ = require('lodash_src');
  _.mixin(require('lodash-deep'));
  _.mixin({
    inherits: function (Sub, Super) {
      Sub.prototype = _.create(Super.prototype, { 'constructor': Super });
      Sub.Super = Super;
    },
    remove: function (array, index) {
      array.splice(index, 1);
      return array;
    },
    // If variable is value, then return alt. If variable is anything else, return value;
    toggle: function (variable, value, alt) {
      return variable === value ? alt : value;
    },
    toggleInOut: function (array, value) {
      if (_.contains(array, value)) {
        array = _.without(array, value);
      } else {
        array.push(value);
      }
      return array;
    },
    // NOTE: The flatten behavior here works if you don't need to keep a reference to the
    // original value
    flattenWith: function (dot, nestedObj, flattenArrays) {
      var key; // original key
      var stack = []; // track key stack
      var flatObj = {};
      (function flattenObj(obj) {
        _.keys(obj).forEach(function (key) {
          stack.push(key);
          if (!flattenArrays && _.isArray(obj[key])) flatObj[stack.join(dot)] = obj[key];
          else if (_.isObject(obj[key])) flattenObj(obj[key]);
          else flatObj[stack.join(dot)] = obj[key];
          stack.pop();
        });
      }(nestedObj));
      return flatObj;
    },
    // assign the properties of an object's subObject to the parent object.
    // obj = { prop: { a: 1} } ===> obj = { a: 1 }
    unwrapProp: function (obj, prop) {
      var wrapped = obj[prop];
      delete obj[prop];
      _.assign(obj, wrapped);
    },
    optMemoize: function (fn) {
      var memo = _.memoize(fn);
      return function () {
        if (arguments[0] == null) {
          return fn.apply(this, arguments);
        } else {
          return memo.apply(this, arguments);
        }
      };
    },
    isNumeric: function (v) {
      return !_.isNaN(v) && (typeof v === 'number' || (!_.isArray(v) && !_.isNaN(parseInt(v, 10))));
    },
    setValue: function (obj, name, value) {
      var path = name.split('.');
      var current = obj;

      (function recurse() {
        var step = path.shift();

        if (path.length === 0) {
          current[step] = value;
        }

        if (_.isObject(current)) {
          current = current[step];
          recurse();
        }
      }());
    },
    // limit the number of arguments that are passed to the function
    limit: function (context, fn, count) {
      // syntax without context limit(fn, 1)
      if (count == null && _.isNumeric(fn)) {
        count = fn;
        fn = context;
        context = null;
      }

      count = count || 0;

      // shortcuts for common paths
      // !!!! PLEASE don't use more than two arg
      if (count === 0) return function () { return fn.call(context); };
      if (count === 1) return function (a) { return fn.call(context, a); };
      if (count === 2) return function (a, b) { return fn.call(context, a, b); };

      // catch all version
      return function () {
        return fn.apply(context, [].slice.call(arguments, 0, count));
      };
    },
    // call all functions in an array
    callEach: function (arr) {
      _.invoke(arr, 'call');
    },
    onceWithCb: function (fn) {
      var callbacks = [];

      // on initial flush, call the init function, but ensure
      // that it only happens once
      var flush = _.once(function (cntx, args) {
        args.push(function finishedOnce() {
          // override flush to simply schedule an asynchronous clear
          flush = function () {
            setTimeout(function () {
              _.callEach(callbacks.splice(0));
            }, 0);
          };

          flush();
        });

        fn.apply(cntx, args);
      });

      return function runOnceWithCb() {
        var args = [].slice.call(arguments, 0);
        var cb = args[args.length - 1];

        if (typeof cb === 'function') {
          callbacks.push(cb);
          // trim the arg list so the other callback can
          // be pushed if needed
          args = args.slice(0, -1);
        }

        // always call flush, it might not do anything
        flush(this, args);
      };
    },
    chunk: function (arr, count) {
      var size = Math.ceil(arr.length / count);
      var chunks = new Array(count);
      for (var i = 0; i < count; i ++) {
        var start = i * size;
        chunks[i] = arr.slice(start, start + size);
      }
      return chunks;
    },
    repeat: function (string, times) {
      var out = '';
      for (var i = 0; i < times; i++) out += string;
      return out;
    },
    /**
     * move an obj either up or down in the collection by
     * injecting it either before/after the prev/next obj that
     * satisfied the qualifier
     *
     * or, just from one index to another...
     *
     * @param  {array} objs - the list to move the object within
     * @param  {number|any} obj - the object that should be moved, or the index that the object is currently at
     * @param  {number|boolean} below - the index to move the object to, or whether it should be moved up or down
     * @param  {function} qualifier - a lodash-y callback, object = _.where, string = _.pluck
     * @return {array} - the objs argument
     */
    move: function (objs, obj, below, qualifier) {
      var origI = _.isNumber(obj) ? obj : objs.indexOf(obj);
      if (origI === -1) return objs;

      if (_.isNumber(below)) {
        // move to a specific index
        objs.splice(below, 0, objs.splice(origI, 1)[0]);
        return objs;
      }

      below = !!below;
      qualifier = _.createCallback(qualifier, null, 2);

      var above = !below;
      var finder = below ? _.findIndex : _.findLastIndex;

      // find the index of the next/previous obj that meets the qualifications
      var targetI = finder(objs, function (otherAgg, otherI) {
        if (below && otherI <= origI) return;
        if (above && otherI >= origI) return;
        return !!qualifier(otherAgg, otherI);
      });

      if (targetI === -1) return objs;

      // place the obj at it's new index
      objs.splice(targetI, 0, objs.splice(origI, 1)[0]);
    }
  });

  return _;
});
