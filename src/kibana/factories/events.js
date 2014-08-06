define(function (require) {
  var _ = require('lodash');

  return function EventsProvider(Private, Promise, Notifier) {
    var BaseObject = Private(require('factories/base_object'));
    var notify = new Notifier({ location: 'EventEmitter' });

    _.inherits(Events, BaseObject);
    function Events() {
      Events.Super.call(this);
      this._listeners = {};
    }

    /**
     * Listens for events
     * @param {string} name The name of the event
     * @param {function} handler The handler for the event
     * @returns {PromiseEmitter}
     */
    Events.prototype.on = function (name, handler) {
      if (!_.isArray(this._listeners[name])) {
        this._listeners[name] = [];
      }

      var listener = {
        defer: Promise.defer(),
        handler: handler
      };

      // capture then's promise, attach it to the listener
      listener.newDeferPromise = listener.defer.promise.then(function recurse(value) {
        listener.defer = Promise.defer();
        listener.newDeferPromise = listener.defer.promise.then(recurse);
        Promise.try(handler, [value]).catch(notify.fatal);
      });

      this._listeners[name].push(listener);
    };

    /**
     * Removes a event listner
     * @param {string} name The name of the event
     * @param {function} [handler] The handler to remove
     * @return {void}
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
     * Emits and event using the PromiseEmitter
     * @param {string} name The name of the event
     * @param {mixed} args The args to pass along to the handers
     * @returns {void}
     */
    Events.prototype.emit = function (name, value) {
      // var args = Array.prototype.slice.call(arguments);
      // var name = args.shift();
      if (this._listeners[name]) {
        // We need to empty the array when we resolve the listners. PromiseEmitter
        // will regenerate the listners array with new promises.
        _.each(this._listeners[name], function resolveListener(listener) {
          if (listener.defer.resolved) {
            // wait for listener.defer to be re-written
            listener.newDeferPromise.then(function () {
              resolveListener(listener);
            });
          } else {
            listener.defer.resolve(value);
            listener.defer.resolved = true;
          }
        });
      }
    };

    return Events;

  };
});
