define(function (require) {
  var _ = require('lodash');
  var rison = require('utils/rison');

  return function ModelProvider() {
    function Model(attributes) {
      // Set the attributes or default to an empty object
      this._listners = {};
      _.assign(this, attributes);
    }

    /**
     * Returns the attirbutes for the model
     * @returns {object}
     */
    Model.prototype.toObject = function () {
      // return just the data.
      return _.omit(this, function (value, key) {
        return key.charAt(0) === '_' || _.isFunction(value);
      });
    };

    /**
     * Serialize the model to RISON
     * @returns {string}
     */
    Model.prototype.toRISON = function () {
      return rison.encode(this.toObject());
    };

    /**
     * Serialize the model to JSON
     * @returns {object}
     */
    Model.prototype.toJSON = function () {
      return this.toObject();
    };

    /**
     * Adds a listner
     * @param {string} name The name of the event
     * @returns {void}
     */
    Model.prototype.on = function (name, listner) {
      if (!_.isArray(this._listners[name])) {
        this._listners[name] = [];
      }
      this._listners[name].push(listner);
    };

    /**
     * Removes listener... if listner is empty then it removes all the events
     * @param {string} name The name of the event
     * @param {function} [listner]
     * @returns {void}
     */
    Model.prototype.off = function (name, listner) {
      if (!listner) return delete this._listners[name];
      this._listners = _.filter(this._listners[name], function (fn) {
        return fn !== listner;
      });
    };

    /**
     * Emits and event
     * @param {string} name The name of the event
     * @param {mixed} [args...] Arguments pass to the listners
     * @returns {void}
     */
    Model.prototype.emit = function () {
      var args = Array.prototype.slice.call(arguments);
      var name = args.shift();
      if (this._listners[name]) {
        _.each(this._listners[name], function (fn) {
          fn.apply(null, args);
        });
      }
    };

    return Model;


  };
});
