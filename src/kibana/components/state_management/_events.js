define(function (require) {
  var _ = require('lodash');

  return function EventsProvider(Private, PromiseEmitter) {
    var BaseObject = Private(require('components/state_management/_base_object'));

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
        self._listeners[name].push(defer);
      }, handler);
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
        _.each(this._listeners[name], function (defer) {
          defer.resolve.apply(defer, args);
        });
      }
    };

    return Events;

  };
});
