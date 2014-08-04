define(function (require) {
  return function LooperFactory($timeout, Notifier) {
    var _ = require('lodash');
    var notify = new Notifier();

    function Looper(ms, fn) {
      var _ms = ms === void 0 ? 1500 : ms;
      var _fns = [fn || _.noop];
      var _timerId;
      var _started = false;
      var looper = this;

      /**
       * Set the number of milliseconds between
       * each loop
       *
       * @param  {integer} ms
       * @chainable
       */
      looper.ms = function (ms) {
        _ms = ms;
        looper.restart();
        return this;
      };

      /**
       * Set the function that will be executed at the
       * end of each looper.
       *
       * @param  {function} fn
       * @chainable
       */
      looper.add = function (fn) {
        _fns.push(fn);
        return this;
      };

      /**
       * Set the function that will be executed at the
       * end of each looper.
       *
       * @param  {function} fn
       * @chainable
       */
      looper.remove = function (fn) {
        var i = _fns.indexOf(fn);
        if (i > -1) _fns.splice(i, 1);
        return this;
      };

      /**
       * Start the looping madness
       *
       * @chainable
       */
      looper.start = function () {
        looper.stop();
        _started = true;

        // start with a run of the loop, which sets the next run
        looper._looperOver();

        return this;
      };

      /**
       * ...
       *
       * @chainable
       */
      looper.stop = function () {
        if (_timerId) _timerId = $timeout.cancel(_timerId);
        _started = false;
        return this;
      };

      /**
       * Restart the looper only if it is already started.
       * Called automatically when ms is changed
       *
       * @chainable
       */
      looper.restart = function () {
        if (looper.started()) {
          looper.stop();
          looper.start();
        }
        return this;
      };

      /**
       * Is the looper currently started/running/scheduled/going to execute
       *
       * @return {boolean}
       */
      looper.started = function () {
        return !!_started;
      };

      /**
       * Wraps _fn so that _fn can be changed
       * without rescheduling and schedules
       * the next itteration
       *
       * @private
       * @return {undefined}
       */
      looper._looperOver = function () {
        try {
          _.callEach(_fns);
        } catch (e) {
          looper.stop();
          if (typeof console === 'undefined' || !console.error) {
            throw e;
          } else {
            console.error(e.stack || e.message || e);
          }
        }

        _timerId = _ms ? $timeout(looper._looperOver, _ms) : null;
      };

      /**
       * execute the _fn, and restart the timer
       */
      looper.run = function () {
        looper.start();
      };
    }

    return Looper;
  };
});