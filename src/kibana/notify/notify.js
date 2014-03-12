define(function (require) {
  var _ = require('lodash');
  var nextTick = require('utils/next_tick');
  var $ = require('jquery');
  var modules = require('modules');
  var module = modules.get('notify');
  var errors = require('./errors');
  var NotifyManager = require('./manager');
  var manager = new NotifyManager();

  require('./directives');

  module.service('notify', function () {
    var service = this;
    // modify the service to have bound proxies to the manager
    _.forOwn(manager, function (val, key) {
      service[key] = typeof val === 'function' ? _.bindKey(manager, key) : val;
    });
  });

  /**
   * Global Angular uncaught exception handler
   */
  modules
    .get('exceptionOverride')
    .factory('$exceptionHandler', function () {
      return function (exception, cause) {
        manager.fatal(exception, cause);
      };
    });

  /**
   * Global Require.js exception handler
   */
  window.requirejs.onError = function (err) {
    manager.fatal(new errors.ScriptLoadFailure(err));
  };

  window.onerror = function (err, url, line) {
    manager.fatal(new Error(err + ' (' + url + ':' + line + ')'));
    return true;
  };

  // function onTabFocus(onChange) {
  //   var current = true;
  //   // bind each individually
  //   var elem = window;
  //   var focus = 'focus';
  //   var blur = 'blur';

  //   if (/*@cc_on!@*/false) { // check for Internet Explorer
  //     elem = document;
  //     focus = 'focusin';
  //     blur = 'focusout';
  //   }

  //   function handler(event) {
  //     var state;

  //     if (event.type === focus) {
  //       state = true;
  //     } else if (event.type === blur) {
  //       state = false;
  //     } else {
  //       return;
  //     }

  //     if (current !== state) {
  //       current = state;
  //       onChange(current);
  //     }
  //   }

  //   elem.addEventListener(focus, handler);
  //   elem.addEventListener(blur, handler);

  //   // call the handler ASAP with the current status
  //   nextTick(handler, current);

  //   // function that the user can call to unbind this handler
  //   return function unBind() {
  //     elem.removeEventListener(focus, handler);
  //     elem.removeEventListener(blur, handler);
  //   };
  // }

  // onTabFocus(function (focused) {
  //   // log(focused ? 'welcome back' : 'good bye');
  // });

  return manager;

});