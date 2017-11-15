import _ from 'lodash';
import angular from 'angular';

import 'ui/promises';

import { requestQueue } from '../_request_queue';
import { FetchSoonProvider } from '../fetch';
import { FieldWildcardProvider } from '../../field_wildcard';
import { getHighlightRequest } from '../../../../core_plugins/kibana/common/highlight';
import { BuildESQueryProvider } from './build_query';

export function AbstractDataSourceProvider(Private, Promise, PromiseEmitter, config) {
  const fetchSoon = Private(FetchSoonProvider);
  const buildESQuery = Private(BuildESQueryProvider);
  const { fieldWildcardFilter } = Private(FieldWildcardProvider);
  const getConfig = (...args) => config.get(...args);

  function SourceAbstract(initialState) {
    const self = this;
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
    self._requestStartHandlers = [];
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
    const self = this;

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
    const self = this;

    return new PromiseEmitter(function (resolve, reject) {
      const defer = Promise.defer();
      defer.promise.then(resolve, reject);

      const request = self._createRequest(defer);

      request.setErrorHandler((request, error) => {
        reject(error);
        request.abort();
      });

    }, handler);
  };

  /**
   * Noop
   */
  SourceAbstract.prototype.getParent = function () {
    return this._parent;
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
    const self = this;
    let req = _.first(self._myStartableQueued());

    if (!req) {
      req = self._createRequest();
    }

    fetchSoon.these([req]);

    return req.getCompletePromise();
  };

  /**
   * Fetch this source and reject the returned Promise on error
   *
   * Otherwise behaves like #fetch()
   *
   * @async
   */
  SourceAbstract.prototype.fetchAsRejectablePromise = function () {
    const self = this;
    let req = _.first(self._myStartableQueued());

    if (!req) {
      req = self._createRequest();
    }

    req.setErrorHandler((request, error) => {
      request.defer.reject(error);
      request.abort();
    });

    fetchSoon.these([req]);

    return req.getCompletePromise();
  };

  /**
   * Fetch all pending requests for this source ASAP
   * @async
   */
  SourceAbstract.prototype.fetchQueued = function () {
    return fetchSoon.these(this._myStartableQueued());
  };

  /**
   * Cancel all pending requests for this dataSource
   * @return {undefined}
   */
  SourceAbstract.prototype.cancelQueued = function () {
    requestQueue
      .filter(req => req.source === this)
      .forEach(req => req.abort());
  };

  /**
   * Completely destroy the SearchSource.
   * @return {undefined}
   */
  SourceAbstract.prototype.destroy = function () {
    this.cancelQueued();
    this._requestStartHandlers.length = 0;
  };

  /**
   *  Add a handler that will be notified whenever requests start
   *  @param  {Function} handler
   *  @return {undefined}
   */
  SourceAbstract.prototype.onRequestStart = function (handler) {
    this._requestStartHandlers.push(handler);
  };

  /**
   *  Called by requests of this search source when they are started
   *  @param  {Courier.Request} request
   *  @return {Promise<undefined>}
   */
  SourceAbstract.prototype.requestIsStarting = function (request) {
    this.activeFetchCount = (this.activeFetchCount || 0) + 1;
    this.history = [request];

    return Promise
      .map(this._requestStartHandlers, fn => fn(this, request))
      .then(_.noop);
  };

  /**
   *  Called by requests of this search source when they are done
   *  @param  {Courier.Request} request
   *  @return {undefined}
   */
  SourceAbstract.prototype.requestIsStopped = function (/* request */) {
    this.activeFetchCount -= 1;
  };

  /*****
   * PRIVATE API
   *****/

  SourceAbstract.prototype._myStartableQueued = function () {
    return requestQueue
      .getStartable()
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
    const type = this._getType();

    // the merged state of this dataSource and it's ancestors
    const flatState = {};

    // function used to write each property from each state object in the chain to flat state
    const root = this;

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

        const prom = root._mergeProp(flatState, value, key);
        return Promise.is(prom) ? prom : null;
      }))
        .then(function () {
        // move to this sources parent
          const parent = current.getParent();
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
          flatState.body = flatState.body || {};

          const computedFields = flatState.index.getComputedFields();
          flatState.body.stored_fields = computedFields.storedFields;
          flatState.body.script_fields = flatState.body.script_fields || {};
          flatState.body.docvalue_fields = flatState.body.docvalue_fields || [];

          _.extend(flatState.body.script_fields, computedFields.scriptFields);
          flatState.body.docvalue_fields = _.union(flatState.body.docvalue_fields, computedFields.docvalueFields);

          if (flatState.body._source) {
          // exclude source fields for this index pattern specified by the user
            const filter = fieldWildcardFilter(flatState.body._source.excludes);
            flatState.body.docvalue_fields = flatState.body.docvalue_fields.filter(filter);
          }

          // if we only want to search for certain fields
          const fields = flatState.fields;
          if (fields) {
          // filter out the docvalue_fields, and script_fields to only include those that we are concerned with
            flatState.body.docvalue_fields = _.intersection(flatState.body.docvalue_fields, fields);
            flatState.body.script_fields = _.pick(flatState.body.script_fields, fields);

            // request the remaining fields from both stored_fields and _source
            const remainingFields = _.difference(fields, _.keys(flatState.body.script_fields));
            flatState.body.stored_fields = remainingFields;
            _.set(flatState.body, '_source.includes', remainingFields);
          }

          flatState.body.query = buildESQuery(flatState.index, flatState.query, flatState.filters);

          if (flatState.highlightAll != null) {
            if (flatState.highlightAll && flatState.body.query) {
              flatState.body.highlight = getHighlightRequest(flatState.body.query, getConfig);
            }
            delete flatState.highlightAll;
          }

          /**
         * Translate a filter into a query to support es 3+
         * @param  {Object} filter - The filter to translate
         * @return {Object} the query version of that filter
         */
          const translateToQuery = function (filter) {
            if (!filter) return;

            if (filter.query) {
              return filter.query;
            }

            return filter;
          };

          // re-write filters within filter aggregations
          (function recurse(aggBranch) {
            if (!aggBranch) return;
            Object.keys(aggBranch).forEach(function (id) {
              const agg = aggBranch[id];

              if (agg.filters) {
              // translate filters aggregations
                const filters = agg.filters.filters;

                Object.keys(filters).forEach(function (filterId) {
                  filters[filterId] = translateToQuery(filters[filterId]);
                });
              }

              recurse(agg.aggs || agg.aggregations);
            });
          }(flatState.body.aggs || flatState.body.aggregations));
        }

        return flatState;
      });
  };

  return SourceAbstract;
}
