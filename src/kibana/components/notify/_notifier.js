define(function (require) {
  var _ = require('lodash');
  var $ = require('jquery');
  var createStackTrace = require('stacktrace');

  var notifs = [];
  var setTO = setTimeout;
  var clearTO = clearTimeout;
  var log = (typeof KIBANA_DIST === 'undefined') ? _.bindKey(console, 'log') : _.noop;
  var consoleGroups = ('group' in window.console) && ('groupCollapsed' in window.console) && ('groupEnd' in window.console);

  var fatalToastTemplate = (function lazyTemplate(tmpl) {
    var compiled;
    return function (vars) {
      compiled = compiled || _.template(tmpl);
      return compiled(vars);
    };
  }(require('text!./partials/fatal.html')));

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

    notifs.push(notif);
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

  function formatStack(err) {
    if (!err) return null;

    if (err.stack) return err.stack;

    var isError = (err instanceof Error);
    var stack = createStackTrace({ e: isError ? err : void 0 });
    var msg = isError ? err.message : err;

    return msg + '\n' + stack.map(function (line) { return '  ' + line; }).join('\n');
  }

  /**
   * Functionality to check that
   */
  function Notifier(opts) {
    opts = opts || {};

    // label type thing to say where notifications came from
    this.from = opts.location;

    // attach the global notification list
    this._notifs = notifs;
  }

  Notifier.prototype.log = log;

  // general functionality used by .event() and .lifecycle()
  function createGroupLogger(type, opts) {
    // Track the groups managed by this logger
    var groups = window[type + 'Groups'] = {};

    return function (name, success) {
      var status;
      if (success === void 0) {
        // start
        groups[name] = now();
      } else {
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
    };
  }

  /**
   * Log a sometimes redundant event
   * @param {string} name - The name of the group
   * @param {boolean} success - Simple flag stating whether the event succeeded
   */
  Notifier.prototype.event = createGroupLogger('event', {
    open: false
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
   * Kill the page, and display an error
   * @param  {Error} err - The fatal error that occured
   */
  Notifier.prototype.fatal = function (err) {
    var html = fatalToastTemplate({
      msg: formatMsg(err, this.from),
      stack: formatStack(err)
    });

    var $container = $('#fatal-splash-screen');
    if ($container.size()) {
      $container.append(html);
      return;
    }

    // in case the app has not completed boot
    $(document.body)
      .removeAttr('ng-cloak')
      .html('<div id="fatal-splash-screen" class="container-fuild">' + html + '</div>');

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
      content: formatMsg(msg),
      icon: 'info-circle',
      title: 'Debug',
      lifetime: 5000,
      actions: ['accept']
    }, cb);
  };

  // set the timer functions that all notification managers will use
  Notifier.prototype._setTimerFns = function (set, clear) {
    setTO = set;
    clearTO = clear;
  };

  return Notifier;
});
