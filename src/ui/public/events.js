/**
 * @name Events
 *
 * @extends SimpleEmitter
 */

import _ from 'lodash';
import { Notifier } from 'ui/notify/notifier';
import { SimpleEmitter } from 'ui/utils/simple_emitter';

export function EventsProvider(Private, Promise) {
  const notify = new Notifier({ location: 'EventEmitter' });

  _.class(Events).inherits(SimpleEmitter);
  function Events() {
    Events.Super.call(this);
    this._listeners = {};
    this._emitChain = Promise.resolve();
  }

  /**
   * Listens for events
   * @param {string} name - The name of the event
   * @param {function} handler - The function to call when the event is triggered
   * @return {Events} - this, for chaining
   */
  Events.prototype.on = function (name, handler) {
    if (!_.isArray(this._listeners[name])) {
      this._listeners[name] = [];
    }

    const listener = {
      handler: handler
    };
    this._listeners[name].push(listener);

    (function rebuildDefer() {
      listener.defer = Promise.defer();
      listener.resolved = listener.defer.promise.then(function (args) {
        rebuildDefer();

        // we ignore the completion of handlers, just watch for unhandled errors
        Promise.resolve(handler.apply(handler, args)).catch(notify.fatal);
      });
    }());

    return this;
  };

  /**
   * Removes an event listener
   * @param {string} [name] - The name of the event
   * @param {function} [handler] - The handler to remove
   * @return {Events} - this, for chaining
   */
  Events.prototype.off = function (name, handler) {
    if (!name && !handler) {
      return this.removeAllListeners();
    }

    // exit early if there is not an event that matches
    if (!this._listeners[name]) return this;

    // If no hander remove all the events
    if (!handler) {
      delete this._listeners[name];
    } else {
      this._listeners[name] = _.filter(this._listeners[name], function (listener) {
        return handler !== listener.handler;
      });
    }

    return this;
  };

  /**
   * Emits the event to all listeners
   *
   * @param {string} name - The name of the event.
   * @param {any} [value] - The value that will be passed to all event handlers.
   * @returns {Promise}
   */
  Events.prototype.emit = function (name) {
    const self = this;
    const args = _.rest(arguments);

    if (!self._listeners[name]) {
      return self._emitChain;
    }

    return Promise.map(self._listeners[name], function (listener) {
      return self._emitChain = self._emitChain.then(function () {
        listener.defer.resolve(args);
        return listener.resolved;
      });
    });
  };

  /**
   * Get a list of the handler functions for a specific event
   *
   * @param  {string} name
   * @return {array[function]}
   */
  Events.prototype.listeners = function (name) {
    return _.pluck(this._listeners[name], 'handler');
  };

  return Events;
}
