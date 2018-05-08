/**
 * @name SearchSource
 *
 * @description A promise-based stream of search results that can inherit from other search sources.
 *
 * Because filters/queries in Kibana have different levels of persistence and come from different
 * places, it is important to keep track of where filters come from for when they are saved back to
 * the savedObject store in the Kibana index. To do this, we create trees of searchSource objects
 * that can have associated query parameters (index, query, filter, etc) which can also inherit from
 * other searchSource objects.
 *
 * At query time, all of the searchSource objects that have subscribers are "flattened", at which
 * point the query params from the searchSource are collected while traversing up the inheritance
 * chain. At each link in the chain a decision about how to merge the query params is made until a
 * single set of query parameters is created for each active searchSource (a searchSource with
 * subscribers).
 *
 * That set of query parameters is then sent to elasticsearch. This is how the filter hierarchy
 * works in Kibana.
 *
 * Visualize, starting from a new search:
 *
 *  - the `savedVis.searchSource` is set as the `appSearchSource`.
 *  - The `savedVis.searchSource` would normally inherit from the `appSearchSource`, but now it is
 *    upgraded to inherit from the `rootSearchSource`.
 *  - Any interaction with the visualization will still apply filters to the `appSearchSource`, so
 *    they will be stored directly on the `savedVis.searchSource`.
 *  - Any interaction with the time filter will be written to the `rootSearchSource`, so those
 *    filters will not be saved by the `savedVis`.
 *  - When the `savedVis` is saved to elasticsearch, it takes with it all the filters that are
 *    defined on it directly, but none of the ones that it inherits from other places.
 *
 * Visualize, starting from an existing search:
 *
 *  - The `savedVis` loads the `savedSearch` on which it is built.
 *  - The `savedVis.searchSource` is set to inherit from the `saveSearch.searchSource` and set as
 *    the `appSearchSource`.
 *  - The `savedSearch.searchSource`, is set to inherit from the `rootSearchSource`.
 *  - Then the `savedVis` is written to elasticsearch it will be flattened and only include the
 *    filters created in the visualize application and will reconnect the filters from the
 *    `savedSearch` at runtime to prevent losing the relationship
 *
 * Dashboard search sources:
 *
 *  - Each panel in a dashboard has a search source.
 *  - The `savedDashboard` also has a searchsource, and it is set as the `appSearchSource`.
 *  - Each panel's search source inherits from the `appSearchSource`, meaning that they inherit from
 *    the dashboard search source.
 *  - When a filter is added to the search box, or via a visualization, it is written to the
 *    `appSearchSource`.
 */

import _ from 'lodash';
import angular from 'angular';

import '../../promises';

import { NormalizeSortRequestProvider } from './_normalize_sort_request';
import { RootSearchSourceProvider } from './_root_search_source';
import { SearchRequestProvider } from '../fetch/request';
import { SegmentedRequestProvider } from '../fetch/request/segmented';

import { requestQueue } from '../_request_queue';
import { FetchSoonProvider } from '../fetch';
import { FieldWildcardProvider } from '../../field_wildcard';
import { getHighlightRequest } from '../../../../core_plugins/kibana/common/highlight';
import { BuildESQueryProvider } from './build_query';

function parseInitialState(initialState) {
  if (!initialState) {
    return {};
  }

  return typeof initialState === 'string' ?
    JSON.parse(initialState)
    : _.cloneDeep(initialState);
}

function isIndexPattern(val) {
  return Boolean(val && typeof val.toIndexList === 'function');
}

export function SearchSourceProvider(Promise, PromiseEmitter, Private, config) {
  const SearchRequest = Private(SearchRequestProvider);
  const SegmentedRequest = Private(SegmentedRequestProvider);
  const normalizeSortRequest = Private(NormalizeSortRequestProvider);
  const fetchSoon = Private(FetchSoonProvider);
  const buildESQuery = Private(BuildESQueryProvider);
  const { fieldWildcardFilter } = Private(FieldWildcardProvider);
  const getConfig = (...args) => config.get(...args);

  const forIp = Symbol('for which index pattern?');

  class SearchSource {
    constructor(initialState) {
      this._instanceid = _.uniqueId('data_source');

      this._state = parseInitialState(initialState);

      /**
       * List of the editable state properties that turn into a
       * chainable API
       *
       * @type {Array}
       */
      this._methods = [
        'type',
        'query',
        'filter',
        'sort',
        'highlight',
        'highlightAll',
        'aggs',
        'from',
        'searchAfter',
        'size',
        'source',
        'version',
        'fields'
      ];

      // set internal state values
      this._methods.forEach(name => {
        this[name] = val => {
          if (val == null) {
            delete this._state[name];
          } else {
            this._state[name] = val;
          }

          return this;
        };
      });

      this.history = [];
      this._requestStartHandlers = [];
      this._inheritOptions = {};

      this._filterPredicates = [
        (filter) => {
          // remove null/undefined filters
          return filter;
        },
        (filter) => {
          const disabled = _.get(filter, 'meta.disabled');
          return disabled === undefined || disabled === false;
        },
        (filter, state) => {
          if (!config.get('courier:ignoreFilterIfFieldNotInIndex')) {
            return true;
          }

          if ('meta' in filter && 'index' in state) {
            const field = state.index.fields.byName[filter.meta.key];
            if (!field) return false;
          }
          return true;
        }
      ];
    }

    /*****
     * PUBLIC API
     *****/


    index(indexPattern) {
      const state = this._state;

      const hasSource = state.source;
      const sourceCameFromIp = hasSource && state.source.hasOwnProperty(forIp);
      const sourceIsForOurIp = sourceCameFromIp && state.source[forIp] === state.index;
      if (sourceIsForOurIp) {
        delete state.source;
      }

      if (indexPattern === undefined) return state.index;
      if (indexPattern === null) return delete state.index;
      if (!isIndexPattern(indexPattern)) {
        throw new TypeError('expected indexPattern to be an IndexPattern duck.');
      }

      state.index = indexPattern;
      if (!state.source) {
        // imply source filtering based on the index pattern, but allow overriding
        // it by simply setting another value for "source". When index is changed
        state.source = function () {
          return indexPattern.getSourceFiltering();
        };
        state.source[forIp] = indexPattern;
      }

      return this;
    }

    /**
     * Set a searchSource that this source should inherit from
     * @param  {SearchSource} searchSource - the parent searchSource
     * @return {this} - chainable
     */
    inherits(parent, options = {}) {
      this._parent = parent;
      this._inheritOptions = options;
      return this;
    }

    /**
     * Get the parent of this SearchSource
     * @return {undefined|searchSource}
     */
    getParent(onlyHardLinked) {
      const self = this;
      if (self._parent === false) return;
      if (self._parent) return self._parent;
      return onlyHardLinked ? undefined : Private(RootSearchSourceProvider).get();
    }

    /**
     * Temporarily prevent this Search from being fetched... not a fan but it's easy
     */
    disable() {
      this._fetchDisabled = true;
    }

    /**
     * Reverse of SearchSource#disable(), only need to call this if source was previously disabled
     */
    enable() {
      this._fetchDisabled = false;
    }

    onBeginSegmentedFetch(initFunction) {
      const self = this;
      return new Promise((resolve, reject) => {
        function addRequest() {
          const defer = Promise.defer();
          const req = new SegmentedRequest(self, defer, initFunction);

          req.setErrorHandler((request, error) => {
            reject(error);
            request.abort();
          });

          // Return promises created by the completion handler so that
          // errors will bubble properly
          return req.getCompletePromise().then(addRequest);
        }

        addRequest();
      });
    }

    addFilterPredicate(predicate) {
      this._filterPredicates.push(predicate);
    }

    clone() {
      const clone = new SearchSource(this.toString());
      // when serializing the internal state with .toString() we lose the internal classes used in the index
      // pattern, so we have to set it again to workaround this behavior
      clone.set('index', this.get('index'));
      clone.inherits(this.getParent());
      return clone;
    }

    async getSearchRequestBody() {
      const searchRequest = await this._flatten();
      return searchRequest.body;
    }

    /**
     *  Called by requests of this search source when they are done
     *  @param  {Courier.Request} request
     *  @return {undefined}
     */
    requestIsStopped() {
      this.activeFetchCount -= 1;
    }

    /**
     * Get values from the state
     * @param {string} name - The name of the property desired
     * @return {any} - the value found
     */
    get(name) {
      let self = this;
      while (self) {
        if (self._state[name] !== void 0) return self._state[name];
        self = self.getParent();
      }
    }

    /**
     * Get the value from our own state, don't traverse up the chain
     * @param {string} name - The name of the property desired
     * @return {any} - the value found
     */
    getOwn(name) {
      if (this._state[name] !== void 0) return this._state[name];
    }

    /**
     * Change the entire state of a SearchSource
     * @param {object|string} state - The SearchSource's new state, or a
     *   string of the state value to set
     */
    set(state, val) {
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
    }

    /**
     * Create a new dataSource object of the same type
     * as this, which inherits this dataSource's properties
     * @return {SearchSource}
     */
    extend() {
      return new SearchSource().inherits(this);
    }

    /**
     * return a simple, encodable object representing the state of the SearchSource
     * @return {[type]} [description]
     */
    toJSON = function () {
      return _.clone(this._state);
    };

    /**
     * Create a string representation of the object
     * @return {[type]} [description]
     */
    toString() {
      return angular.toJson(this.toJSON());
    }

    /**
     * Put a request in to the courier that this Source should
     * be fetched on the next run of the courier
     * @return {Promise}
     */
    onResults(handler) {
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
    }

    /**
     * Fetch just this source ASAP
     *
     * ONLY USE IF YOU WILL BE USING THE RESULTS
     * provided by the returned promise, otherwise
     * call #fetchQueued()
     *
     * @async
     */
    fetch() {
      const self = this;
      let req = _.first(self._myStartableQueued());

      if (!req) {
        req = self._createRequest();
      }

      fetchSoon.these([req]);

      return req.getCompletePromise();
    }

    /**
     * Fetch this source and reject the returned Promise on error
     *
     * Otherwise behaves like #fetch()
     *
     * @async
     */
    fetchAsRejectablePromise() {
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
    }


    /**
     * Fetch all pending requests for this source ASAP
     * @async
     */
    fetchQueued() {
      return fetchSoon.these(this._myStartableQueued());
    }

    /**
     * Cancel all pending requests for this dataSource
     * @return {undefined}
     */
    cancelQueued() {
      requestQueue
        .filter(req => req.source === this)
        .forEach(req => req.abort());
    }

    /**
     * Completely destroy the SearchSource.
     * @return {undefined}
     */
    destroy() {
      this.cancelQueued();
      this._requestStartHandlers.length = 0;
    }

    /**
     *  Add a handler that will be notified whenever requests start
     *  @param  {Function} handler
     *  @return {undefined}
     */
    onRequestStart(handler) {
      this._requestStartHandlers.push(handler);
    }

    /**
     *  Called by requests of this search source when they are started
     *  @param  {Courier.Request} request
     *  @return {Promise<undefined>}
     */
    requestIsStarting(request) {
      this.activeFetchCount = (this.activeFetchCount || 0) + 1;
      this.history = [request];

      const handlers = [...this._requestStartHandlers];
      // If callparentStartHandlers has been set to true, we also call all
      // handlers of parent search sources.
      if (this._inheritOptions.callParentStartHandlers) {
        let searchSource = this.getParent();
        while (searchSource) {
          handlers.push(...searchSource._requestStartHandlers);
          searchSource = searchSource.getParent();
        }
      }

      return Promise
        .map(handlers, fn => fn(this, request))
        .then(_.noop);
    }


    /******
     * PRIVATE APIS
     ******/

    _myStartableQueued() {
      return requestQueue
        .getStartable()
        .filter(req => req.source === this);
    }

    /**
     * Gets the type of the DataSource
     * @return {string}
     */
    _getType() {
      return 'search';
    }

    /**
     * Create a common search request object, which should
     * be put into the pending request queye, for this search
     * source
     *
     * @param {Deferred} defer - the deferred object that should be resolved
     *                         when the request is complete
     * @return {SearchRequest}
     */
    _createRequest(defer) {
      return new SearchRequest(this, defer);
    }

    /**
     * Used to merge properties into the state within ._flatten().
     * The state is passed in and modified by the function
     *
     * @param  {object} state - the current merged state
     * @param  {*} val - the value at `key`
     * @param  {*} key - The key of `val`
     * @return {undefined}
     */
    _mergeProp(state, val, key) {
      if (typeof val === 'function') {
        const source = this;
        return Promise.cast(val(this))
          .then(function (newVal) {
            return source._mergeProp(state, newVal, key);
          });
      }

      if (val == null || !key || !_.isString(key)) return;

      switch (key) {
        case 'filter':
          let filters = Array.isArray(val) ? val : [val];

          filters = filters.filter(filter => {
            return this._filterPredicates.every(predicate => predicate(filter, state));
          });

          state.filters = [...(state.filters || []), ...filters];
          return;
        case 'index':
        case 'type':
        case 'id':
        case 'highlightAll':
          if (key && state[key] == null) {
            state[key] = val;
          }
          return;
        case 'searchAfter':
          key = 'search_after';
          addToBody();
          break;
        case 'source':
          key = '_source';
          addToBody();
          break;
        case 'sort':
          val = normalizeSortRequest(val, this.get('index'));
          addToBody();
          break;
        case 'query':
          state.query = (state.query || []).concat(val);
          break;
        case 'fields':
          state[key] = _.uniq([...(state[key] || []), ...val]);
          break;
        default:
          addToBody();
      }

      /**
       * Add the key and val to the body of the request
       */
      function addToBody() {
        state.body = state.body || {};
        // ignore if we already have a value
        if (state.body[key] == null) {
          state.body[key] = val;
        }
      }
    }

    /**
     * Walk the inheritance chain of a source and return it's
     * flat representaion (taking into account merging rules)
     * @returns {Promise}
     * @resolved {Object|null} - the flat state of the SearchSource
     */
    _flatten() {
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
    }
  }

  return SearchSource;
}
