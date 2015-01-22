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
  var angular = require('angular');

  return {
    /**
     * Check if an object or class implements a behavior
     *
     * @param  {Class|obj} instClass - Class or instance to test
     * @param  {behavior} behavior - behavior to test for
     * @return {Boolean}
     */
    hasBehavior: function (instClass, behavior) {
      if (_.isObject(instClass)) instClass = instClass.constructor;
      if (!_.isFunction(instClass) || !behavior) return;
      return _.contains(instClass.$$_behaviors, behavior);
    },

    /**
     * Create a string by repeating another string n-times
     *
     * @param  {string} str - the string to repeat
     * @param  {number} times - the number of times to repeat the string
     * @return {string}
     */
    repeat: function (str, times) {
      var out = '';
      for (var i = 0; i < times; i++) {
        out += str;
      }
      return out;
    },

    /**
     * If current is value (===), then return alt. If current is anything else, return value
     *
     * @param  {any} current
     * @param  {any} value
     * @param  {any} alt
     * @return {any} alt|value
     */
    toggle: function (current, value, alt) {
      return current === value ? alt : value;
    },

    /**
     * Inverse of _.some(), reads better in some cases,
     *
     * @param  {array} arr
     * @param  {Function} fn
     * @param  {any} cntx
     * @return {Boolean}
     */
    none: function (arr, fn, cntx) {
      return !_.some(arr, fn, cntx);
    },

    /**
     * check if the values in an array are all numbers, unique, and
     * @param  {[type]}  arr [description]
     * @return {Boolean}     [description]
     */
    isOrdinal: function (arr) {
      if (!_.isArray(arr)) return false;

      return _.all(arr, function (num, i, arr) {
        if (!_.isNumber(num)) return false;
        if (i === 0) return true;
        return num > arr[i - 1];
      });
    },

    /**
     * Checks to see if an input value is number-like, this
     * includes strings that parse into valid numbers and objects
     * that don't have a type of number but still parse properly
     * via-some sort of valueOf magic
     *
     * @param  {any} v - the value to check
     * @return {Boolean}
     */
    isNumeric: function (v) {
      return !_.isNaN(v) && (typeof v === 'number' || (!_.isArray(v) && !_.isNaN(parseFloat(v))));
    },

    /**
     * Create a method that wraps another method which expects a callback as it's last
     * argument. The wrapper method will call the wrapped function only once (the first
     * time it is called), but will always call the callbacks passed to it. This has a
     * similar effect to calling a promise-returning function that is wrapped with _.once
     * but can be used outside of angular.
     *
     * @param  {Function} fn - the function that should only be executed once and accepts
     *                       a callback as it's last arg
     * @return {Function} - the wrapper method
     */
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

    /**
     * Create a function that will ignore all but n-number of arguments.
     * This is useful for passing functions like _.parseInt to Array#map.
     * Since _.parseInt accepts a second argument, it will try to use the
     * index of the value passed as the base for that number and weird
     * errors occur.
     *
     * @param  {this} [context] - this value for fn, optional
     * @param  {Function} fn - the function to wrap
     * @param  {number} count - the number of args to accept
     * @return {Function}
     */
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

    /**
     * Call all of the function in an array
     *
     * @param  {array[functions]} arr
     * @return {undefined}
     */
    callEach: function (arr) {
      _.invoke(arr, 'call');
    },

    asString: function (val) {
      if (_.isObject(val)) {
        return angular.toJson(val);
      }
      else if (val == null) {
        return '';
      }
      else {
        return _.escape('' + val);
      }
    }
  };
});
