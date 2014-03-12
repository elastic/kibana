define(function (require) {
  var _ = require('lodash');
  var $ = require('jquery');

  var fatalToastTemplate = (function lazyTemplate(tmpl) {
    var compiled;
    return function (vars) {
      compiled = compiled || _.template(tmpl);
      return compiled(vars);
    };
  }(require('text!./partials/fatal.html')));

  /**
   * Functionality to check that
   */
  function NotifyManager() {

    var applicationBooted;
    var notifs = this._notifs = [];
    var setTO = setTimeout;
    var clearTO = clearTimeout;

    function now() {
      if (window.performance && window.performance.now) {
        return window.performance.now();
      }
      return Date.now();
    }

    var log = (typeof KIBANA_DIST === 'undefined') ? _.bindKey(console, 'log') : _.noop;

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

    this._setTimerFns = function (set, clear) {
      setTO = set;
      clearTO = clear;
    };

    /**
     * Notify the serivce of app lifecycle events
     * @type {[type]}
     */
    var lifecycleEvents = window.kibanaLifecycleEvents = {};
    this.lifecycle = function (name, success) {
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
    this.fatal = function (err) {
      var html = fatalToastTemplate({
        msg: err instanceof Error ? err.message : err,
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
    };

    /**
     * Alert the user of an error that occured
     * @param  {Error|String} err
     */
    this.error = function (err, cb) {
      add({
        type: 'danger',
        content: err instanceof Error ? err.message : err,
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
    this.warning = function (msg, cb) {
      add({
        type: 'warning',
        content: msg,
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
    this.info = function (msg, cb) {
      add({
        type: 'info',
        content: msg,
        icon: 'info-circle',
        title: 'Debug',
        lifetime: 7000,
        actions: ['accept']
      }, cb);
    };
  }

  return NotifyManager;

});