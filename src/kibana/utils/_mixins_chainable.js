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

  return {
    /**
     * Setup Class-like inheritance between two constructors.
     * Exposes the Super class at SubClass.Super;
     *
     * @param  {Constructor} Sub - The "Class" that should be extended
     * @param  {Constructor} Super - The parent "Class"
     * @return {Constructor} - the sub argument;
     */
    inherits: function (Sub, Super) {
      Sub.prototype = Object.create(Super.prototype, {
        constructor: {
          value: Sub
        },
        superConstructor: Sub.Super = Super
      });
      return Sub;
    },

    /**
     * Add a behavior to a Class, and track the behavior to enable _.hasBehavior
     *
     * @param  {Constructor} Class - The "Class" that should be extended
     * @param  {object} behavior - The behavior that should be mixed into to the Class
     * @return {Constructor} - Class;
     */
    addBehavior: function (Class, behavior) {
      Class.$$_behaviors = (Class.$$_behaviors || []).concat(behavior);
      _.merge(Class.prototype, behavior);
      return Class;
    },

    /**
     * Patched version of _.remove that supports IndexedArrays
     *
     * @param  {array} array
     * @param  {object|function|str} - a lodash selector/predicate
     * @return {array} the elements that were removed
     */
    remove: function (array, where) {
      var index = -1;
      var length = array ? array.length : 0;
      var result = [];

      var callback = _.createCallback(where, this, 3);
      while (++index < length) {
        var value = array[index];
        if (callback(value, index, array)) {
          result.push(value);
          array.splice(index--, 1);
          length--;
        }
      }

      return result;
    },

    /**
     * Remove or add a value to an array based on it's presense in the
     * array initially.
     *
     * @param  {array} arr
     * @param  {any} value - the value to toggle
     * @return {array} arr
     */
    toggleInOut: function (arr, value) {
      if (_.contains(arr, value)) {
        arr.splice(arr.indexOf(value), 1);
      } else {
        arr.push(value);
      }
      return arr;
    },


    /**
     * Flatten an object into a single-level object.
     * NOTE: The flatten behavior here works if you don't need to keep a reference to the original value
     *
     * set flattenArrays to traverse into arrays and create properties like:
     *  {
     *    'users.0.name': 'username1',
     *    'users.1.name': 'username2',
     *    'users.2.name': 'username3',
     *  }
     *
     * @param  {string} dot - the seperator for keys, '.' is generally preferred
     * @param  {object} nestedObj - the object to flatten
     * @param  {Boolean} flattenArrays - should arrays be travered or left alone?
     * @return {object}
     */
    flattenWith: function (dot, nestedObj, flattenArrays) {
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

    /**
     * assign the properties of an object's subObject to the parent object.
     *
     * var obj = { prop: { a: 1} };
     * _.unwrapProp(obj, 'prop'); // { a: 1 };
     *
     * @param  {[type]} obj  [description]
     * @param  {[type]} prop [description]
     * @return {[type]}      [description]
     */
    unwrapProp: function (obj, prop) {
      var wrapped = obj[prop];
      delete obj[prop];
      _.assign(obj, wrapped);
      return obj;
    },

    /**
     * Memoize a function, but only use the memoized version if
     * a first argument is passed, otherwise execute the original method
     * every time.
     *
     * @param  {Function} fn
     * @return {Function}
     */
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

    /**
     * Alias to _.deepSet
     */
    setValue: function (obj, path, value) {
      _.deepSet(obj, path, value);
      return obj;
    },

    /**
     * Split an array into a series of smaller arrays, containing
     * portions of the previous array.
     *
     * @param  {array} arr - the array to chunk
     * @param  {number} count - the number of chunks to create
     * @return {array[array]} - array of slice of arr
     */
    chunk: function (arr, count) {
      var size = Math.ceil(arr.length / count);
      var chunks = new Array(count);
      for (var i = 0; i < count; i++) {
        var start = i * size;
        chunks[i] = arr.slice(start, start + size);
      }
      return chunks;
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
    },

    /**
     * Like _.groupBy, but allows specifying multiple groups for a
     * single object.
     *
     * _.organizeBy([{ a: [1, 2, 3] }, { b: true, a: [1, 4] }], 'a')
     * // Object {1: Array[2], 2: Array[1], 3: Array[1], 4: Array[1]}
     *
     * _.groupBy([{ a: [1, 2, 3] }, { b: true, a: [1, 4] }], 'a')
     * // Object {'1,2,3': Array[1], '1,4': Array[1]}
     *
     * @param  {array} collection - the list of values to organize
     * @param  {Function} callback - either a property name, or a callback.
     * @return {object}
     */
    organizeBy: function (collection, callback) {
      var buckets = {};
      var prop = typeof callback === 'function' ? false : callback;

      function add(key, obj) {
        if (!buckets[key]) buckets[key] = [];
        buckets[key].push(obj);
      }

      _.each(collection, function (obj) {
        var keys = prop === false ? callback(obj) : obj[prop];

        if (!_.isArray(keys)) {
          add(keys, obj);
          return;
        }

        var length = keys.length;
        while (length-- > 0) {
          add(keys[length], obj);
        }
      });

      return buckets;
    },

    /**
     * Shortcut for the simple version of _.deepGet with support for default
     * values added
     *
     * @param {obj} any - the value to read from
     * @param {string|array} path - the location of the value to return as
     *                           a dot-notated string or array of keys.
     * @param {any} def - when the value is null or undefined return this instead
     * @return {any}
     */
    get: function (obj, path, def) {
      var val = _.deepGet(obj, path);
      return (val == null && def != null) ? def : val;
    },

    /**
     * Parse a comma-seperated list into an array
     * efficiently, or just return if already an array
     *
     * @param {string|array} input  - the comma-seperated list
     * @return {array}
     */
    commaSeperatedList: function (input) {
      if (_.isArray(input)) return input;

      var source = String(input || '').split(',');
      var list = [];
      while (source.length) {
        var item = source.shift().trim();
        if (item) list.push(item);
      }

      return list;
    },

    pushAll: function (source, dest) {
      var start = dest.length;
      var adding = source.length;

      // allocate - http://goo.gl/e2i0S0
      dest.length = start + adding;

      // fill sparse positions
      var i = -1;
      while (++i < adding) dest[start + i] = source[i];

      return dest;
    }
  };
});
