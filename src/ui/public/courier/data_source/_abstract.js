define(function (require) {
  let _ = require('lodash');
  let angular = require('angular');

  return function SourceAbstractFactory(Private, Promise, PromiseEmitter) {
    let requestQueue = Private(require('ui/courier/_request_queue'));
    let errorHandlers = Private(require('ui/courier/_error_handlers'));
    let courierFetch = Private(require('ui/courier/fetch/fetch'));

    function SourceAbstract(initialState, strategy) {
      let self = this;
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
      self._fetchStrategy = strategy;
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
      let self = this;
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
      let self = this;

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
      return angular.toJson(this.toJSON());
    };

    /**
     * Put a request in to the courier that this Source should
     * be fetched on the next run of the courier
     * @return {Promise}
     */
    SourceAbstract.prototype.onResults = function (handler) {
      let self = this;

      return new PromiseEmitter(function (resolve, reject) {
        const defer = Promise.defer();
        defer.promise.then(resolve, reject);

        self._createRequest(defer);
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
      let self = this;

      return new PromiseEmitter(function (resolve, reject) {
        const defer = Promise.defer();
        defer.promise.then(resolve, reject);

        errorHandlers.push({
          source: self,
          defer: defer
        });
      }, handler);
    };

    /**
     * Fetch just this source ASAP
     *
     * ONLY USE IF YOU WILL BE USING THE RESULTS
     * provided by the returned promise, otherwise
     * call #fetchQueued()
     *
     * @async
     */
    SourceAbstract.prototype.fetch = function () {
      let self = this;
      let req = _.first(self._myStartableQueued());

      if (!req) {
        req = self._createRequest();
      }

      courierFetch.these([req]);

      return req.defer.promise;
    };

    /**
     * Fetch all pending requests for this source ASAP
     * @async
     */
    SourceAbstract.prototype.fetchQueued = function () {
      return courierFetch.these(this._myStartableQueued());
    };

    /**
     * Cancel all pending requests for this dataSource
     * @return {undefined}
     */
    SourceAbstract.prototype.cancelQueued = function () {
      requestQueue
      .get(this._fetchStrategy)
      .filter(req => req.source === this)
      .forEach(req => req.abort());
    };

    /**
     * Completely destroy the SearchSource.
     * @return {undefined}
     */
    SourceAbstract.prototype.destroy = function () {
      this.cancelQueued();
    };

    /*****
     * PRIVATE API
     *****/

    SourceAbstract.prototype._myStartableQueued = function () {
      return requestQueue
      .getStartable(this._fetchStrategy)
      .filter(req => req.source === this);
    };

    SourceAbstract.prototype._createRequest = function () {
      throw new Error('_createRequest must be implemented by subclass');
    };

    /**
     * Walk the inheritance chain of a source and return it's
     * flat representaion (taking into account merging rules)
     * @returns {Promise}
     * @resolved {Object|null} - the flat state of the SourceAbstract
     */
    SourceAbstract.prototype._flatten = function () {
      let type = this._getType();

      // the merged state of this dataSource and it's ancestors
      let flatState = {};

      // function used to write each property from each state object in the chain to flat state
      let root = this;

      // start the chain at this source
      let current = this;

      // call the ittr and return it's promise
      return (function ittr() {
        // itterate the _state object (not array) and
        // pass each key:value pair to source._mergeProp. if _mergeProp
        // returns a promise, then wait for it to complete and call _mergeProp again
        return Promise.all(_.map(current._state, function ittr(value, key) {
          if (Promise.is(value)) {
            return value.then(function (value) {
              return ittr(value, key);
            });
          }

          let prom = root._mergeProp(flatState, value, key);
          return Promise.is(prom) ? prom : null;
        }))
        .then(function () {
          // move to this sources parent
          let parent = current.getParent();
          // keep calling until we reach the top parent
          if (parent) {
            current = parent;
            return ittr();
          }
        });
      }())
      .then(function () {
        if (type === 'search') {
          // This is down here to prevent the circular dependency
          let decorateQuery = Private(require('ui/courier/data_source/_decorate_query'));

          flatState.body = flatState.body || {};

          // defaults for the query
          if (!flatState.body.query) {
            flatState.body.query = {
              'match_all': {}
            };
          }

          if (flatState.body.size === 0) {
            flatState.search_type = 'count';
          } else {
            let computedFields = flatState.index.getComputedFields();
            flatState.body.fields = computedFields.fields;
            flatState.body.script_fields = flatState.body.script_fields || {};
            flatState.body.fielddata_fields = flatState.body.fielddata_fields || [];

            _.extend(flatState.body.script_fields, computedFields.scriptFields);
            flatState.body.fielddata_fields = _.union(flatState.body.fielddata_fields, computedFields.fielddataFields);
          }

          decorateQuery(flatState.body.query);

          /**
           * Create a filter that can be reversed for filters with negate set
           * @param {boolean} reverse This will reverse the filter. If true then
           *                          anything where negate is set will come
           *                          through otherwise it will filter out
           * @returns {function}
           */
          let filterNegate = function (reverse) {
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
          let cleanFilter = function (filter) {
            return _.omit(filter, ['meta']);
          };

          // switch to filtered query if there are filters
          if (flatState.filters) {
            if (flatState.filters.length) {
              _.each(flatState.filters, function (filter) {
                if (filter.query) {
                  decorateQuery(filter.query);
                }
              });

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
