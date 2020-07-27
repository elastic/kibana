/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

/**
 * @name Events
 *
 * @extends EventEmitter
 */

import _ from 'lodash';
import { EventEmitter } from 'events';
import { fatalError } from './notify';
import { createLegacyClass } from './utils/legacy_class';
import { createDefer } from 'ui/promises';

const location = 'EventEmitter';

export function EventsProvider(Promise) {
  createLegacyClass(Events).inherits(EventEmitter);
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
    if (!Array.isArray(this._listeners[name])) {
      this._listeners[name] = [];
    }

    const listener = {
      handler: handler,
    };
    this._listeners[name].push(listener);

    (function rebuildDefer() {
      listener.defer = createDefer(Promise);
      listener.resolved = listener.defer.promise.then(function (args) {
        rebuildDefer();

        // we ignore the completion of handlers, just watch for unhandled errors
        Promise.resolve(handler.apply(handler, args)).catch((error) => fatalError(error, location));

        // indicate to bluebird not to worry about this promise being a "runaway"
        return null;
      });
    })();

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
      this._listeners = {};
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
    const args = _.tail(arguments);

    if (!self._listeners[name]) {
      return self._emitChain;
    }

    return Promise.map(self._listeners[name], function (listener) {
      return (self._emitChain = self._emitChain.then(function () {
        // Double check that off wasn't called after an emit, but before this is fired.
        if (!self._listeners[name] || self._listeners[name].indexOf(listener) < 0) return;

        listener.defer.resolve(args);
        return listener.resolved;
      }));
    });
  };

  /**
   * Get a list of the handler functions for a specific event
   *
   * @param  {string} name
   * @return {array[function]}
   */
  Events.prototype.listeners = function (name) {
    return _.map(this._listeners[name], 'handler');
  };

  return Events;
}
