define(function (require) {
  var _ = require('lodash');
  var $ = require('jquery');

  var notifs = [];
  var setTO = setTimeout;
  var clearTO = clearTimeout;
  var log = (typeof KIBANA_DIST === 'undefined') ? _.bindKey(console, 'log') : _.noop;

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

  /**
   * Track application lifecycle events
   * @type {[type]}
   */
  var lifecycleEvents = window.kibanaLifecycleEvents = {};

  var applicationBooted;

  /**
   * Functionality to check that
   */
  function NotifyManager(opts) {
    opts = opts || {};

    // label type thing to say where notifications came from
    this.from = opts.location;

    // attach the global notification list
    this._notifs = notifs;
  }

  NotifyManager.prototype.lifecycle = function (name, success) {
    var status;
    if (name === 'bootstrap' && success === true) applicationBooted = true;

    if (success === void 0) {
      // start
      lifecycleEvents[name] = now();
    } else {
      // end
      if (success) {
        lifecycleEvents[name] = now() - (lifecycleEvents[name] || 0);
        status = lifecycleEvents[name].toFixed(2) + ' ms';
      } else {
        lifecycleEvents[name] = false;
        status = 'failure';
      }
    }

    log('KBN: ' + name + (status ? ' - ' + status : ''));
  };

  /**
   * Kill the page, and display an error
   * @param  {Error} err - The fatal error that occured
   */
  NotifyManager.prototype.fatal = function (err) {
    var html = fatalToastTemplate({
      msg: formatMsg(err, this.from),
      stack: err.stack
    });

    var $container = $('#fatal-splash-screen');
    if ($container.size()) {
      $container.append(html);
      return;
    }

    $container = $();

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
  NotifyManager.prototype.error = function (err, cb) {
    add({
      type: 'danger',
      content: formatMsg(err, this.from),
      icon: 'warning',
      title: 'Error',
      lifetime: Infinity,
      actions: ['report', 'accept']
    }, cb);
  };

  /**
   * Warn the user abort something
   * @param  {[type]} msg [description]
   * @return {[type]}     [description]
   */
  NotifyManager.prototype.warning = function (msg, cb) {
    add({
      type: 'warning',
      content: formatMsg(msg, this.from),
      icon: 'warning',
      title: 'Warning',
      lifetime: 7000,
      actions: ['accept']
    }, cb);
  };

  /**
   * Display a debug message
   * @param  {String} msg [description]
   * @return {[type]}     [description]
   */
  NotifyManager.prototype.info = function (msg, cb) {
    add({
      type: 'info',
      content: formatMsg(msg),
      icon: 'info-circle',
      title: 'Debug',
      lifetime: 7000,
      actions: ['accept']
    }, cb);
  };

  // set the timer functions that all notification managers will use
  NotifyManager.prototype._setTimerFns = function (set, clear) {
    setTO = set;
    clearTO = clear;
  };

  return NotifyManager;
});
