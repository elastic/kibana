define(function (require) {
  var _ = require('lodash');

  /**
   * Simple event emitter class used in the vislib. Calls
   * handlers synchronously and implements a chainable api
   *
   * @class
   */
  function SimpleEmitter() {
    this._listeners = {};
  }

  /**
   * Add an event handler
   *
   * @param  {string} event
   * @param  {function} handler
   * @return {SimpleEmitter} - this, for chaining
   */
  SimpleEmitter.prototype.on = function (event, handler) {
    var handlers = this._listeners[event];
    if (!handlers) handlers = this._listeners[event] = [];

    if (!_.contains(handlers, handler)) {
      handlers.push(handler);
    }

    return this;
  };

  /**
   * Remove an event handler
   *
   * @param  {string} event
   * @param  {function} [handler] - optional handler to remove, if no handler is
   *                              passed then all are removed
   * @return {SimpleEmitter} - this, for chaining
   */
  SimpleEmitter.prototype.off = function (event, handler) {
    if (!this._listeners[event]) {
      return this;
    }

    // remove a specific handler
    if (handler) _.pull(this._listeners[event], handler);
    // or remove all listeners
    else this._listeners[event] = null;

    return this;
  };

  /**
   * Emit an event and all arguments to all listeners for an event name
   *
   * @param  {string} event
   * @param  {*} [arg...] - any number of arguments that will be applied to each handler
   * @return {SimpleEmitter} - this, for chaining
   */
  SimpleEmitter.prototype.emit = function (event, arg) {
    if (!this._listeners[event]) return this;

    var args = _.rest(arguments);
    var handlers = this._listeners[event].slice(0);
    var i = -1;

    while (++i < handlers.length) {
      handlers[i].apply(this, args);
    }

    return this;
  };

  /**
   * Get the count of handlers for a specific event
   *
   * @param  {string} [event] - optional event name to filter by
   * @return {number}
   */
  SimpleEmitter.prototype.listenerCount = function (event) {
    if (event) {
      return _.size(this._listeners[event]);
    }

    return _.reduce(this._listeners, function (count, handlers) {
      return count + _.size(handlers);
    }, 0);
  };

  /**
   * Remove all event listeners bound to this emitter.
   *
   * @return {SimpleEmitter} - this, for chaining
   */
  SimpleEmitter.prototype.removeAllListeners = function () {
    this._listeners = {};
    return this;
  };

  return SimpleEmitter;
});
