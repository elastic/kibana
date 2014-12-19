define(function (require) {
  return function LooperFactory($timeout, Notifier, Promise) {
    var _ = require('lodash');
    var notify = new Notifier();

    function Looper(ms, fn) {
      var _ms = ms === void 0 ? 1500 : ms;
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
        if (_ms) {
          looper.restart();
        } else {
          looper.pause();
        }
        return this;
      };

      /**
       * Cancels the current looper while keeping internal
       * state as started
       *
       * @chainable
       */
      looper.pause = function () {
        if (_timerId) _timerId = $timeout.cancel(_timerId);
        return this;
      };

      /**
       * Start the looping madness
       *
       * @chainable
       */
      looper.start = function (loopOver) {
        if (loopOver == null) loopOver = true;

        looper.stop();
        _started = true;

        if (loopOver) {
          // start with a run of the loop, which sets the next run
          looper._looperOver();
        } else {
          looper._scheduleLoop();
        }

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
          looper.start(false);
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
       * Returns the current loop interval
       *
       * @return {number}
       */
      looper.loopInterval = function () {
        return _ms;
      };

      /**
       * Called when the loop is executed before the previous
       * run has completed.
       *
       * @return {undefined}
       */
      looper.onHastyLoop = function () {
        console.log('hasty loop', looper);
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
        if (looper.active) {
          looper.onHastyLoop();
        }

        looper._scheduleLoop();

        looper.active = Promise
        .try(fn)
        .catch(function (err) {
          looper.stop();
          notify.fatal(err);
        })
        .finally(function () {
          looper.active = null;
        });
      };

      /**
       * Schedule the next itteration of the loop
       *
       * @private
       * @return {number} - the timer promise
       */
      looper._scheduleLoop = function () {
        _timerId = _ms ? $timeout(looper._looperOver, _ms) : null;
        return _timerId;
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