define(function (require) {
  var errors = {};
  var _ = require('lodash');
  var inherits = require('lodash').inherits;

  var canStack = (function () {
    var err = new Error();
    return !!err.stack;
  }());

  // abstract error class
  function KibanaError(msg, constructor) {
    this.message = msg;

    Error.call(this, this.message);
    if (!this.stack) {
      if (Error.captureStackTrace) {
        Error.captureStackTrace(this, constructor || KibanaError);
      } else if (canStack) {
        this.stack = (new Error()).stack;
      } else {
        this.stack = '';
      }
    }
  }
  errors.KibanaError = KibanaError;
  inherits(KibanaError, Error);

  /**
   * Map of error text for different error types
   * @type {Object}
   */
  var requireTypeText = {
    timeout: 'a network timeout',
    nodefine: 'an invalid module definition',
    scripterror: 'a generic script error'
  };

  /**
   * ScriptLoadFailure error class for handling requirejs load failures
   * @param {String} [msg] -
   */
  errors.ScriptLoadFailure = function ScriptLoadFailure(err) {
    var explain = requireTypeText[err.requireType] || err.requireType || 'an unknown error';

    this.stack = err.stack;
    var modules = err.requireModules;
    if (_.isArray(modules) && modules.length > 0) {
      modules = modules.map(JSON.stringify);

      if (modules.length > 1) {
        modules = modules.slice(0, -1).join(', ') + ' and ' + modules.slice(-1)[0];
      } else {
        modules = modules[0];
      }

      modules += ' modules';
    }

    if (!modules || !modules.length) {
      modules = 'unknown modules';
    }


    KibanaError.call(this,
      'Unable to load ' + modules + ' because of ' + explain + '.',
      errors.ScriptLoadFailure);
  };
  inherits(errors.ScriptLoadFailure, KibanaError);

  return errors;
});