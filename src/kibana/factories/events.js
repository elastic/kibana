define(function (require) {
  var _ = require('lodash');

  return function EventsProvider(Private, Promise, Notifier) {
    var BaseObject = Private(require('factories/base_object'));
    var notify = new Notifier({ location: 'EventEmitter' });

    _(Events).inherits(BaseObject);
    function Events() {
      Events.Super.call(this);
      this._listeners = {};
    }

    /**
     * Listens for events
     * @param {string} name - The name of the event
     * @param {function} handler - The function to call when the event is triggered
     * @returns {undefined}
     */
    Events.prototype.on = function (name, handler) {
      if (!_.isArray(this._listeners[name])) {
        this._listeners[name] = [];
      }

      var listener = { handler: handler };

      // capture the promise that is resolved when listener.defer is "fresh"/new
      // and attach it to the listener
      (function buildDefer(value) {

        // we will execute the handler on each re-build, but not the initial build
        var rebuilding = listener.defer != null;

        listener.defer = Promise.defer();
        listener.deferResolved = false;
        listener.newDeferPromise = listener.defer.promise.then(buildDefer);

        if (!rebuilding) return;

        // we ignore the completion of handlers, just watch for unhandled errors
        Promise.try(handler, [value]).catch(notify.fatal);
      }());

      this._listeners[name].push(listener);
    };

    /**
     * Removes an event listener
     * @param {string} [name] - The name of the event
     * @param {function} [handler] - The handler to remove
     * @return {undefined}
     */
    Events.prototype.off = function (name, handler) {
      if (!name && !handler) {
        return this._listeners = {};
      }

      // exit early if there is not an event that matches
      if (!this._listeners[name]) return;

      // If no hander remove all the events
      if (!handler) {
        delete this._listeners[name];
      } else {
        this._listeners[name] = _.filter(this._listeners[name], function (listener) {
          return handler !== listener.handler;
        });
      }
    };

    /**
     * Emits the event to all listeners
     *
     * @param {string} name - The name of the event.
     * @param {any} [value] - The value that will be passed to all event handlers.
     * @returns {Promise}
     */
    Events.prototype.emit = function (name, value) {
      if (!this._listeners[name]) {
        return Promise.resolve();
      }

      return Promise.map(this._listeners[name], function resolveListener(listener) {
        if (listener.deferResolved) {
          // this listener has already been resolved by another call to events#emit()
          // so we wait for listener.defer to be recreated and try again
          return listener.newDeferPromise.then(function () {
            return resolveListener(listener);
          });
        } else {
          listener.deferResolved = true;
          listener.defer.resolve(value);
        }
      });
    };

    return Events;
  };
});
