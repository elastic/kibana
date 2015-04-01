
define(function (require) {
  var _ = require('lodash');
  var $ = require('jquery');

  var notifs = [];
  var setTO = setTimeout;
  var clearTO = clearTimeout;
  var consoleGroups = ('group' in window.console) && ('groupCollapsed' in window.console) && ('groupEnd' in window.console);

  var fatalSplashScreen = require('text!components/notify/partials/fatal_splash_screen.html');

  var log = _.noop;
  if (typeof KIBANA_DIST === 'undefined') {
    log = function () {
      console.log.apply(console, arguments);
    };
  }

  // used to identify the first call to fatal, set to false there
  var firstFatal = true;

  var fatalToastTemplate = (function lazyTemplate(tmpl) {
    var compiled;
    return function (vars) {
      return (compiled || (compiled = _.template(tmpl)))(vars);
    };
  }(require('text!components/notify/partials/fatal.html')));

  function now() {
    if (window.performance && window.performance.now) {
      return window.performance.now();
    }
    return Date.now();
  }

  function closeNotif(cb, key) {
    return function () {
      // this === notif
      var i = notifs.indexOf(this);
      if (i !== -1) notifs.splice(i, 1);
      if (this.timerId) this.timerId = clearTO(this.timerId);
      if (typeof cb === 'function') cb(key);
    };
  }

  function add(notif, cb) {
    if (notif.lifetime !== Infinity) {
      notif.timerId = setTO(function () {
        closeNotif(cb, 'ignore').call(notif);
      }, notif.lifetime);
    }

    if (notif.actions) {
      notif.actions.forEach(function (action) {
        notif[action] = closeNotif(cb, action);
      });
    }

    notif.count = (notif.count || 0) + 1;

    var dup = _.find(notifs, function (item) {
      return item.content === notif.content && item.lifetime === notif.lifetime;
    });

    if (dup) {
      dup.count += 1;
      dup.stacks = _.union(dup.stacks, [notif.stack]);
    } else {
      notif.stacks = [notif.stack];
      notifs.push(notif);
    }
  }

  function formatMsg(msg, from) {
    var rtn = '';
    if (from) {
      rtn += from + ': ';
    }

    if (typeof msg === 'string') {
      rtn += msg;
    } else if (msg instanceof Error) {
      rtn += msg.message;
    }

    return rtn;
  }

  // browsers format Error.stack differently; always include message
  function formatStack(err) {
    if (err.stack && !~err.stack.indexOf(err.message)) {
      return 'Error: ' + err.message + '\n' + err.stack;
    }
    return err.stack;
  }

  /**
   * Functionality to check that
   */
  function Notifier(opts) {
    var self = this;
    opts = opts || {};

    // label type thing to say where notifications came from
    self.from = opts.location;

    'event lifecycle timed fatal error warning info'.split(' ').forEach(function (m) {
      self[m] = _.bind(self[m], self);
    });
  }

  // to be notified when the first fatal error occurs, push a function into this array.
  Notifier.fatalCallbacks = [];

  // set the timer functions that all notification managers will use
  Notifier.setTimerFns = function (set, clear) {
    setTO = set;
    clearTO = clear;
  };

  // simply a pointer to the global notif list
  Notifier.prototype._notifs = notifs;

  /**
   * Log a sometimes redundant event
   * @param {string} name - The name of the group
   * @param {boolean} success - Simple flag stating whether the event succeeded
   */
  Notifier.prototype.event = createGroupLogger('event', {
    open: true
  });

  /**
   * Log a major, important, event in the lifecycle of the application
   * @param {string} name - The name of the lifecycle event
   * @param {boolean} success - Simple flag stating whether the lifecycle event succeeded
   */
  Notifier.prototype.lifecycle = createGroupLogger('lifecycle', {
    open: true
  });

  /**
   * Wrap a function so that it's execution time gets logged.
   *
   * @param {function} fn - the function to wrap, it's .name property is
   *                      read so make sure to set it
   * @return {function} - the wrapped function
   */
  Notifier.prototype.timed = function (name, fn) {
    var self = this;

    if (typeof name === 'function') {
      fn = name;
      name = fn.name;
    }

    return function WrappedNotifierFunction() {
      var cntx = this;
      var args = arguments;

      return self.event(name, function () {
        return fn.apply(cntx, args);
      });
    };
  };

  /**
   * Kill the page, display an error, then throw the error.
   * Used as a last-resort error back in many promise chains
   * so it rethrows the error that's displayed on the page.
   *
   * @param  {Error} err - The error that occured
   */
  Notifier.prototype.fatal = function (err) {
    this._showFatal(err);
    throw err;
  };

  /**
   * Display an error that destroys the entire app. Broken out so that
   * global error handlers can display fatal errors without throwing another
   * error like in #fatal()
   *
   * @param  {Error} err - The fatal error that occured
   */
  Notifier.prototype._showFatal = function (err) {
    if (firstFatal) {
      _.callEach(Notifier.fatalCallbacks);
      firstFatal = false;
      window.addEventListener('hashchange', function () {
        window.location.reload();
      });
    }

    var html = fatalToastTemplate({
      msg: formatMsg(err, this.from),
      stack: formatStack(err)
    });

    var $container = $('#fatal-splash-screen');

    if (!$container.size()) {
      $(document.body)
        // in case the app has not completed boot
      .removeAttr('ng-cloak')
      .html(fatalSplashScreen);

      $container = $('#fatal-splash-screen');
    }

    $container.append(html);
    console.error(err.stack);
  };

  /**
   * Alert the user of an error that occured
   * @param  {Error|String} err
   */
  Notifier.prototype.error = function (err, cb) {
    add({
      type: 'danger',
      content: formatMsg(err, this.from),
      icon: 'warning',
      title: 'Error',
      lifetime: Infinity,
      actions: ['report', 'accept'],
      stack: formatStack(err)
    }, cb);
  };

  /**
   * Warn the user abort something
   * @param  {[type]} msg [description]
   * @return {[type]}     [description]
   */
  Notifier.prototype.warning = function (msg, cb) {
    add({
      type: 'warning',
      content: formatMsg(msg, this.from),
      icon: 'warning',
      title: 'Warning',
      lifetime: 10000,
      actions: ['accept']
    }, cb);
  };

  /**
   * Display a debug message
   * @param  {String} msg [description]
   * @return {[type]}     [description]
   */
  Notifier.prototype.info = function (msg, cb) {
    add({
      type: 'info',
      content: formatMsg(msg, this.from),
      icon: 'info-circle',
      title: 'Debug',
      lifetime: 5000,
      actions: ['accept']
    }, cb);
  };

  if (log === _.noop) {
    Notifier.prototype.log = _.noop;
  } else {
    Notifier.prototype.log = function () {
      var args = [].slice.apply(arguments);
      if (this.from) args.unshift(this.from + ':');
      log.apply(null, args);
    };
  }

  // general functionality used by .event() and .lifecycle()
  function createGroupLogger(type, opts) {
    // Track the groups managed by this logger
    var groups = window[type + 'Groups'] = {};

    return function logger(name, success) {
      var status; // status of the timer
      var exec; // function to execute and wrap
      var ret; // return value

      var complete = function (val) { logger(name, true); return val; };
      var failure = function (err) { logger(name, false); throw err; };

      if (typeof success === 'function' || success === void 0) {
        // start
        groups[name] = now();
        if (success) {
          // success === the function to time
          exec = success;
        } else {
          // function that can report on the success or failure of an op, and pass their value along
          ret = complete;
          ret.failure = failure;
        }
      }
      else {
        groups[name] = now() - (groups[name] || 0);
        var time = ' in ' + groups[name].toFixed(2) + 'ms';

        // end
        if (success) {
          status = 'complete' + time;
        } else {
          groups[name] = false;
          status = 'failure' + time;
        }
      }

      if (consoleGroups) {
        if (status) {
          console.log(status);
          console.groupEnd();
        } else {
          if (opts.open) {
            console.group(name);
          } else {
            console.groupCollapsed(name);
          }
        }
      } else {
        log('KBN: ' + name + (status ? ' - ' + status : ''));
      }

      if (exec) {
        try {
          ret = exec();
        } catch (e) {
          return failure(e);
        }

        if (ret && typeof ret.then === 'function') {
          // return a new promise that proxies the value
          // and logs about the promise outcome
          return ret.then(function (val) {
            complete();
            return val;
          }, function (err) {
            failure(err);
            throw err;
          });
        }

        // the function executed fine, and didn't return a promise, move along
        complete();
      }

      return ret;
    };
  }

  return Notifier;
});
