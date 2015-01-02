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
     * Remove an element at a specific index from an array
     *
     * @param  {array} arr
     * @param  {number} index
     * @return {array} arr
     */
    remove: function (arr, index) {
      arr.splice(index, 1);
      return arr;
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
        arr = _.without(arr, value);
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
      for (var i = 0; i < count; i ++) {
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
    }
  };
});
