define(function (require) {
  var inherits = require('utils/inherits');
  var _ = require('lodash');
  var Mapper = require('courier/mapper');
  var nextTick = require('utils/next_tick');

  var module = require('modules').get('courier/data_sources');

  module.factory('CouriersSourceAbstract', function (couriersFetch, Promise) {

    function SourceAbstract(courier, initialState) {
      this._state = (function () {
        // state can be serialized as JSON, and passed back in to restore
        if (initialState) {
          if (typeof initialState === 'string') {
            return JSON.parse(initialState);
          } else {
            return _.cloneDeep(initialState);
          }
        } else {
          return {};
        }
      }());

      this._dynamicState = this._dynamicState || {};
      this._courier = courier;

      // get/set internal state values
      this._methods.forEach(function (name) {
        this[name] = function (val) {
          if (val == null) {
            delete this._state[name];
          } else {
            this._state[name] = val;
          }

          return this;
        };
      }, this);
    }

    /*****
     * PUBLIC API
     *****/

    /**
     * Get values from the state
     * @param {string} name - The name of the property desired
     */
    SourceAbstract.prototype.get = function (name) {
      var current = this;
      while (current) {
        if (current._state[name] !== void 0) return current._state[name];
        if (current._dynamicState[name] !== void 0) return current._dynamicState[name]();
        current = current._parent;
      }
    };

    /**
     * Change the entire state of a SourceAbstract
     * @param {object|string} state - The SourceAbstract's new state, or a
     *   string of the state value to set
     */
    SourceAbstract.prototype.set = function (state, val) {
      if (typeof state === 'string') {
        return this[state](val);
      }
      this._state = state;
      return this;
    };

    /**
     * Set the courier for this dataSource
     * @chainable
     * @param  {Courier} newCourier
     */
    SourceAbstract.prototype.courier = function (newCourier) {
      this._courier = newCourier;
      return this;
    };

    /**
     * Create a new dataSource object of the same type
     * as this, which inherits this dataSource's properties
     * @return {SourceAbstract}
     */
    SourceAbstract.prototype.extend = function () {
      return this._courier
        .createSource(this._getType())
        .inherits(this);
    };

    /**
     * fetch the field names for this SourceAbstract
     * @param  {Function} cb
     * @callback {Error, Array} - calls cb with a possible error or an array of field names
     */
    SourceAbstract.prototype.getFields = function () {
      return this._courier._mapper.getFields(this);
    };

    /**
     * clear the field list cache
     * @param  {Function} cb
     * @callback {Error, Array} - calls cb with a possible error
     */
    SourceAbstract.prototype.clearFieldCache = function () {
      return this._courier._mapper.clearCache(this);
    };

    /**
     * return a simple, encodable object representing the state of the SourceAbstract
     * @return {[type]} [description]
     */
    SourceAbstract.prototype.toJSON = function () {
      return _.clone(this._state);
    };

    /**
     * Create a string representation of the object
     * @return {[type]} [description]
     */
    SourceAbstract.prototype.toString = function () {
      return JSON.stringify(this.toJSON());
    };

    /**
     * Put a request in to the courier that this Source should
     * be fetched on the next run of the courier
     * @return {[type]} [description]
     */
    SourceAbstract.prototype.onResults = function () {
      var defer = Promise.defer();
      this._courier._pendingRequests.push({
        source: this,
        defer: defer
      });
      return defer.promise;
    };

    /**
     * Fetch just this source ASAP
     * @param {Function} cb - callback
     */
    SourceAbstract.prototype.fetch = function () {
      return couriersFetch[this._getType()](this);
    };

    /**
     * Cancel all pending requests for this dataSource
     * @return {undefined}
     */
    SourceAbstract.prototype.cancelPending = function () {
      var pending = _.where(this._courier._pendingRequests, { source: this});
      _.pull.apply(_, [this._courier._pendingRequests].concat(pending));
    };

    /*****
     * PRIVATE API
     *****/

    /**
     * Walk the inheritance chain of a source and return it's
     * flat representaion (taking into account merging rules)
     * @return {object} - the flat state of the SourceAbstract
     */
    SourceAbstract.prototype._flatten = function () {
      var type = this._getType();
      // the merged state of this dataSource and it's ancestors
      var flatState = {};

      var collectProp = _.partial(this._mergeProp, flatState);

      // walk the chain and merge each property
      var current = this;
      while (current) {
        // stop processing if this or one of it's parents is disabled
        if (current._fetchDisabled) return;
        // merge the properties from the state into the flattened copy
        _.forOwn(current._state, collectProp);
        // move to this sources parent
        current = current._parent;
      }
      current = null;

      if (type === 'search') {
        // defaults for the query
        _.forOwn({
          query: {
            'match_all': {}
          }
        }, collectProp);

        // switch to filtered query if there are filters
        if (flatState.filters) {
          if (flatState.filters.length) {
            flatState.body.query = {
              filtered: {
                query: flatState.body.query,
                filter: {
                  bool: {
                    must: flatState.filters
                  }
                }
              }
            };
          }
          delete flatState.filters;
        }
      }

      return flatState;
    };

    return SourceAbstract;

  });
});