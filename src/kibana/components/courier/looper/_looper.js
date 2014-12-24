define(function (require) {
  return function LooperFactory($timeout, Notifier, Promise) {
    var _ = require('lodash');
    var notify = new Notifier();

    function Looper(ms, fn) {
      this._fn = fn;
      this._ms = ms === void 0 ? 1500 : ms;
      this._timer;
      this._started = false;

      this._looperOver = _.bind(this._looperOver, this);
    }

    /**
     * Set the number of milliseconds between
     * each loop
     *
     * @param  {integer} ms
     * @chainable
     */
    Looper.prototype.ms = function (ms) {
      this._ms = _.parseInt(ms) || 0;

      if (!this._started) return;

      if (this._ms) {
        this.restart();
      } else {
        this.pause();
      }

      return this;
    };

    /**
     * Cancels the current looper while keeping internal
     * state as started
     *
     * @chainable
     */
    Looper.prototype.pause = function () {
      this._unScheduleLoop();
      return this;
    };

    /**
     * Start the looping madness
     *
     * @chainable
     */
    Looper.prototype.start = function (loopOver) {
      if (loopOver == null) loopOver = true;

      this.stop();
      this._started = true;

      if (loopOver) {
        // start with a run of the loop, which sets the next run
        this._looperOver();
      } else {
        this._scheduleLoop();
      }

      return this;
    };

    /**
     * ...
     *
     * @chainable
     */
    Looper.prototype.stop = function () {
      this._unScheduleLoop();
      this._started = false;
      return this;
    };

    /**
     * Restart the looper only if it is already started.
     * Called automatically when ms is changed
     *
     * @chainable
     */
    Looper.prototype.restart = function () {
      if (this._started) {
        this.start(false);
      }
      return this;
    };

    /**
     * Is the looper currently started/running/scheduled/going to execute
     *
     * @return {boolean}
     */
    Looper.prototype.started = function () {
      return !!this._started;
    };

    /**
     * Returns the current loop interval
     *
     * @return {number}
     */
    Looper.prototype.loopInterval = function () {
      return this._ms;
    };

    /**
     * Called when the loop is executed before the previous
     * run has completed.
     *
     * @override
     * @return {undefined}
     */
    Looper.prototype.onHastyLoop = function () {
      // override this in subclasses
    };

    /**
     * Wraps this._fn so that this._fn can be changed
     * without rescheduling and schedules
     * the next itteration
     *
     * @private
     * @return {undefined}
     */
    Looper.prototype._looperOver = function () {
      var self = this;

      if (self.active) {
        self.onHastyLoop();
        return;
      }

      self._scheduleLoop();

      self.active = Promise
      .try(self._fn)
      .catch(function (err) {
        self.stop();
        notify.fatal(err);
      })
      .finally(function () {
        self.active = null;
      });
    };

    /**
     * Schedule the next itteration of the loop
     *
     * @private
     * @return {number} - the timer promise
     */
    Looper.prototype._scheduleLoop = function () {
      this._timer = this._ms ? $timeout(this._looperOver, this._ms) : null;
      return this._timer;
    };

    /**
     * Cancel the next itteration of the loop
     *
     * @private
     * @return {number} - the timer promise
     */
    Looper.prototype._unScheduleLoop = function () {
      if (this._timer) {
        $timeout.cancel(this._timer);
        this._timer = null;
      }
    };

    /**
     * execute the this._fn, and restart the timer
     */
    Looper.prototype.run = function () {
      this.start();
    };

    return Looper;
  };
});