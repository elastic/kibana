define(function (require) {
  var inherits = require('lodash').inherits;
  var _ = require('lodash');
  var nextTick = require('utils/next_tick');

  return function SourceAbstractFactory(Private, Promise, PromiseEmitter, timefilter) {
    var pendingRequests = Private(require('components/courier/_pending_requests'));
    var errorHandlers = Private(require('components/courier/_error_handlers'));
    var courierFetch = Private(require('components/courier/fetch/fetch'));

    function SourceAbstract(initialState) {
      var self = this;
      self._instanceid = _.uniqueId('data_source');

      self._state = (function () {
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

      // set internal state values
      self._methods.forEach(function (name) {
        self[name] = function (val) {
          if (val == null) {
            delete self._state[name];
          } else {
            self._state[name] = val;
          }

          return self;
        };
      });

      self.history = [];
      self._fetchStrategy = courierFetch.strategies[self._getType()];
    }

    /*****
     * PUBLIC API
     *****/

    /**
     * Get values from the state
     * @param {string} name - The name of the property desired
     * @return {any} - the value found
     */
    SourceAbstract.prototype.get = function (name) {
      var self = this;
      while (self) {
        if (self._state[name] !== void 0) return self._state[name];
        self = self.getParent();
      }
    };

    /**
     * Get the value from our own state, don't traverse up the chain
     * @param {string} name - The name of the property desired
     * @return {any} - the value found
     */
    SourceAbstract.prototype.getOwn = function (name) {
      if (this._state[name] !== void 0) return this._state[name];
    };

    /**
     * Change the entire state of a SourceAbstract
     * @param {object|string} state - The SourceAbstract's new state, or a
     *   string of the state value to set
     */
    SourceAbstract.prototype.set = function (state, val) {
      var self = this;

      if (typeof state === 'string') {
        // the getter and setter methods check for undefined explicitly
        // to identify getters and null to identify deletion
        if (val === undefined) {
          val = null;
        }
        self[state](val);
      } else {
        self._state = state;
      }
      return self;
    };

    /**
     * Create a new dataSource object of the same type
     * as this, which inherits this dataSource's properties
     * @return {SourceAbstract}
     */
    SourceAbstract.prototype.extend = function () {
      return (new this.Class()).inherits(this);
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
     * @return {Promise}
     */
    SourceAbstract.prototype.onResults = function (handler) {
      var self = this;

      return new PromiseEmitter(function (resolve, reject, defer) {
        var req = self._createRequest(defer);
        pendingRequests.push(req);
      }, handler);
    };

    /**
     * Noop
     */
    SourceAbstract.prototype.getParent = function () {
      return this._parent;
    };

    /**
     * similar to onResults, but allows a seperate loopy code path
     * for error handling.
     *
     * @return {Promise}
     */
    SourceAbstract.prototype.onError = function (handler) {
      var self = this;

      return new PromiseEmitter(function (resolve, reject, defer) {
        errorHandlers.push({
          source: self,
          defer: defer
        });
      }, handler);
    };

    /**
     * Fetch just this source ASAP
     * @param {Function} cb - callback
     */
    SourceAbstract.prototype.fetch = function () {
      var self = this;

      var req = self._createRequest();
      pendingRequests.push(req);

      // fetch just the requests for this source
      courierFetch.these(self._getType(), pendingRequests.splice(0).filter(function (req) {
        if (req.source !== self) {
          pendingRequests.push(req);
          return false;
        }

        return true;
      }));

      return req.defer.promise;
    };

    /**
     * Cancel all pending requests for this dataSource
     * @return {undefined}
     */
    SourceAbstract.prototype.cancelPending = function () {
      var pending = _.where(pendingRequests, { source: this});
      _.pull.apply(_, [pendingRequests].concat(pending));
    };

    /**
     * Completely destroy the SearchSource.
     * @return {undefined}
     */
    SourceAbstract.prototype.destroy = function () {
      this.cancelPending();
    };

    /*****
     * PRIVATE API
     *****/

    SourceAbstract.prototype._createRequest = function (defer) {
      var self = this;

      var req = {
        source: self,
        defer: defer || Promise.defer()
      };

      if (self.history) {
        // latest history at the top
        self.history.unshift(req);
        // trim all entries beyond 19/20
        self.history.splice(20);
      }

      return req;
    };

    /**
     * Walk the inheritance chain of a source and return it's
     * flat representaion (taking into account merging rules)
     * @returns {Promise}
     * @resolved {Object|null} - the flat state of the SourceAbstract
     */
    SourceAbstract.prototype._flatten = function () {
      var type = this._getType();

      // the merged state of this dataSource and it's ancestors
      var flatState = {};

      // function used to write each property from each state object in the chain to flat state
      var root = this;

      // start the chain at this source
      var current = this;

      // call the ittr and return it's promise
      return (function ittr(resolve, reject) {
        // itterate the _state object (not array) and
        // pass each key:value pair to source._mergeProp. if _mergeProp
        // returns a promise, then wait for it to complete and call _mergeProp again
        return Promise.all(_.map(current._state, function ittr(value, key) {
          if (Promise.is(value)) {
            return value.then(function (value) {
              return ittr(value, key);
            });
          }

          var prom = root._mergeProp(flatState, value, key);
          return Promise.is(prom) ? prom : null;
        }))
        .then(function () {
          // move to this sources parent
          var parent = current.getParent();
          // keep calling until we reach the top parent
          if (parent) {
            current = parent;
            return ittr();
          }
        });
      }())
      .then(function () {
        if (type === 'search') {
          // defaults for the query
          if (!flatState.body.query) {
            flatState.body.query = {
              'match_all': {}
            };
          }

          var computedFields = flatState.index.getComputedFields();
          flatState.body.fields = computedFields.fields;
          flatState.body.script_fields = flatState.body.script_fields || {};
          flatState.body.fielddata_fields = flatState.body.fielddata_fields || [];

          _.extend(flatState.body.script_fields, computedFields.scriptFields);
          flatState.body.fielddata_fields = _.union(flatState.body.fielddata_fields, computedFields.fielddataFields);


          /**
           * Create a filter that can be reversed for filters with negate set
           * @param {boolean} reverse This will reverse the filter. If true then
           *                          anything where negate is set will come
           *                          through otherwise it will filter out
           * @returns {function}
           */
          var filterNegate = function (reverse) {
            return function (filter) {
              if (_.isUndefined(filter.meta) || _.isUndefined(filter.meta.negate)) return !reverse;
              return filter.meta && filter.meta.negate === reverse;
            };
          };

          /**
           * Clean out any invalid attributes from the filters
           * @param {object} filter The filter to clean
           * @returns {object}
           */
          var cleanFilter = function (filter) {
            return _.omit(filter, ['$$hashKey', 'meta']);
          };

          // switch to filtered query if there are filters
          if (flatState.filters) {
            if (flatState.filters.length) {
              flatState.body.query = {
                filtered: {
                  query: flatState.body.query,
                  filter: {
                    bool: {
                      must: _(flatState.filters).filter(filterNegate(false)).map(cleanFilter).value(),
                      must_not: _(flatState.filters).filter(filterNegate(true)).map(cleanFilter).value()
                    }
                  }
                }
              };
            }
            delete flatState.filters;
          }
        }

        return flatState;
      });
    };

    return SourceAbstract;
  };
});
