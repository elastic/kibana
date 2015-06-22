  /** Gets a scheduler that schedules work immediately on the current thread. */
  var immediateScheduler = Scheduler.immediate = (function () {

    function scheduleNow(state, action) { return action(this, state); }
    function notSupported() { throw new Error('Not supported'); }

    return new Scheduler(defaultNow, scheduleNow, notSupported, notSupported);
  }());
