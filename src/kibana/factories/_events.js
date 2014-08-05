define(function (require) {
  var _ = require('lodash');

  return function EventsProvider(Private, PromiseEmitter) {
    var BaseObject = Private(require('factories/_base_object'));

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
      var self = this;

      if (!_.isArray(this._listeners[name])) {
        this._listeners[name] = [];
      }

      return new PromiseEmitter(function (resolve, reject, defer) {
        defer._handler = handler;
        self._listeners[name].push(defer);
      }, handler);
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
        this._listeners[name] = _.filter(this._listeners[name], function (defer) {
          return handler !== defer._handler;
        });
      }
    };

    /**
     * Emits and event using the PromiseEmitter
     * @param {string} name The name of the event
     * @param {mixed} args The args to pass along to the handers
     * @returns {void}
     */
    Events.prototype.emit = function () {
      var args = Array.prototype.slice.call(arguments);
      var name = args.shift();
      if (this._listeners[name]) {
        // We need to empty the array when we resolve the listners. PromiseEmitter
        // will regenerate the listners array with new promises.
        _.each(this._listeners[name].splice(0), function (defer) {
          defer.resolve.apply(defer, args);
        });
      }
    };

    return Events;

  };
});
