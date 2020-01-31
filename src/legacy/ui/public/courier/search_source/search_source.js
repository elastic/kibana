/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

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
import { buildEsQuery, getEsQueryConfig, filterMatchesIndex } from '@kbn/es-query';

import { createDefer } from 'ui/promises';
import { NormalizeSortRequestProvider } from './_normalize_sort_request';
import { SearchRequestProvider } from '../fetch/request';

import { searchRequestQueue } from '../search_request_queue';
import { FetchSoonProvider } from '../fetch';
import { FieldWildcardProvider } from '../../field_wildcard';
import { getHighlightRequest } from '../../../../../plugins/data/common/field_formats';
import { filterDocvalueFields } from './filter_docvalue_fields';

const FIELDS = [
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
  'fields',
  'index',
];

function parseInitialFields(initialFields) {
  if (!initialFields) {
    return {};
  }

  return typeof initialFields === 'string' ? JSON.parse(initialFields) : _.cloneDeep(initialFields);
}

function isIndexPattern(val) {
  return Boolean(val && typeof val.getIndex === 'function');
}

export function SearchSourceProvider(Promise, Private, config) {
  const SearchRequest = Private(SearchRequestProvider);
  const normalizeSortRequest = Private(NormalizeSortRequestProvider);
  const fetchSoon = Private(FetchSoonProvider);
  const { fieldWildcardFilter } = Private(FieldWildcardProvider);
  const getConfig = (...args) => config.get(...args);

  const forIp = Symbol('for which index pattern?');

  class SearchSource {
    constructor(initialFields) {
      this._id = _.uniqueId('data_source');

      this._searchStrategyId = undefined;
      this._fields = parseInitialFields(initialFields);
      this._parent = undefined;

      this.history = [];
      this._requestStartHandlers = [];
      this._inheritOptions = {};

      this._filterPredicates = [
        filter => {
          // remove null/undefined filters
          return filter;
        },
        filter => {
          const disabled = _.get(filter, 'meta.disabled');
          return disabled === undefined || disabled === false;
        },
        (filter, data) => {
          const index = data.index || this.getField('index');
          return (
            !config.get('courier:ignoreFilterIfFieldNotInIndex') ||
            filterMatchesIndex(filter, index)
          );
        },
      ];
    }

    /*****
     * PUBLIC API
     *****/

    setPreferredSearchStrategyId(searchStrategyId) {
      this._searchStrategyId = searchStrategyId;
    }

    getPreferredSearchStrategyId() {
      return this._searchStrategyId;
    }

    setFields(newFields) {
      this._fields = newFields;
      return this;
    }

    setField = (field, value) => {
      if (!FIELDS.includes(field)) {
        throw new Error(
          `Can't set field '${field}' on SearchSource. Acceptable fields are: ${FIELDS.join(', ')}.`
        );
      }

      if (field === 'index') {
        const fields = this._fields;

        const hasSource = fields.source;
        const sourceCameFromIp = hasSource && fields.source.hasOwnProperty(forIp);
        const sourceIsForOurIp = sourceCameFromIp && fields.source[forIp] === fields.index;
        if (sourceIsForOurIp) {
          delete fields.source;
        }

        if (value === null || value === undefined) {
          delete fields.index;
          return this;
        }

        if (!isIndexPattern(value)) {
          throw new TypeError('expected indexPattern to be an IndexPattern duck.');
        }

        fields[field] = value;
        if (!fields.source) {
          // imply source filtering based on the index pattern, but allow overriding
          // it by simply setting another field for "source". When index is changed
          fields.source = function() {
            return value.getSourceFiltering();
          };
          fields.source[forIp] = value;
        }

        return this;
      }

      if (value == null) {
        delete this._fields[field];
        return this;
      }

      this._fields[field] = value;
      return this;
    };

    getId() {
      return this._id;
    }

    getFields() {
      return _.clone(this._fields);
    }

    /**
     * Get fields from the fields
     */
    getField = field => {
      if (!FIELDS.includes(field)) {
        throw new Error(
          `Can't get field '${field}' from SearchSource. Acceptable fields are: ${FIELDS.join(
            ', '
          )}.`
        );
      }

      let searchSource = this;

      while (searchSource) {
        const value = searchSource._fields[field];
        if (value !== void 0) {
          return value;
        }

        searchSource = searchSource.getParent();
      }
    };

    /**
     * Get the field from our own fields, don't traverse up the chain
     */
    getOwnField(field) {
      if (!FIELDS.includes(field)) {
        throw new Error(
          `Can't get field '${field}' from SearchSource. Acceptable fields are: ${FIELDS.join(
            ', '
          )}.`
        );
      }

      const value = this._fields[field];
      if (value !== void 0) {
        return value;
      }
    }

    create() {
      return new SearchSource();
    }

    createCopy() {
      const json = angular.toJson(this._fields);
      const newSearchSource = new SearchSource(json);
      // when serializing the internal fields we lose the internal classes used in the index
      // pattern, so we have to set it again to workaround this behavior
      newSearchSource.setField('index', this.getField('index'));
      newSearchSource.setParent(this.getParent());
      return newSearchSource;
    }

    createChild(options = {}) {
      const childSearchSource = new SearchSource();
      childSearchSource.setParent(this, options);
      return childSearchSource;
    }

    /**
     * Set a searchSource that this source should inherit from
     * @param  {SearchSource} searchSource - the parent searchSource
     * @return {this} - chainable
     */
    setParent(parent, options = {}) {
      this._parent = parent;
      this._inheritOptions = options;
      return this;
    }

    /**
     * Get the parent of this SearchSource
     * @return {undefined|searchSource}
     */
    getParent() {
      return this._parent || undefined;
    }

    /**
     * Fetch this source and reject the returned Promise on error
     *
     * @async
     */
    fetch() {
      const self = this;
      let req = _.first(self._myStartableQueued());

      if (!req) {
        const errorHandler = (request, error) => {
          request.defer.reject(error);
          request.abort();
        };
        req = self._createRequest({ errorHandler });
      }

      fetchSoon.fetchSearchRequests([req]);
      return req.getCompletePromise();
    }

    /**
     * Fetch all pending requests for this source ASAP
     * @async
     */
    fetchQueued() {
      return fetchSoon.fetchSearchRequests(this._myStartableQueued());
    }

    /**
     * Cancel all pending requests for this searchSource
     * @return {undefined}
     */
    cancelQueued() {
      searchRequestQueue
        .getAll()
        .filter(req => req.source === this)
        .forEach(req => req.abort());
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

      return Promise.map(handlers, fn => fn(this, request)).then(_.noop);
    }

    /**
     * Put a request in to the courier that this Source should
     * be fetched on the next run of the courier
     * @return {Promise}
     */
    onResults() {
      const self = this;

      return new Promise(function(resolve, reject) {
        const defer = createDefer(Promise);
        defer.promise.then(resolve, reject);

        const errorHandler = (request, error) => {
          reject(error);
          request.abort();
        };
        self._createRequest({ defer, errorHandler });
      });
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
     * Completely destroy the SearchSource.
     * @return {undefined}
     */
    destroy() {
      this.cancelQueued();
      this._requestStartHandlers.length = 0;
    }

    /******
     * PRIVATE APIS
     ******/

    _myStartableQueued() {
      return searchRequestQueue.getStartable().filter(req => req.source === this);
    }

    /**
     * Create a common search request object, which should
     * be put into the pending request queue, for this search
     * source
     *
     * @param {Deferred} defer - the deferred object that should be resolved
     *                         when the request is complete
     * @return {SearchRequest}
     */
    _createRequest({ defer, errorHandler }) {
      return new SearchRequest({ source: this, defer, errorHandler });
    }

    /**
     * Used to merge properties into the data within ._flatten().
     * The data is passed in and modified by the function
     *
     * @param  {object} data - the current merged data
     * @param  {*} val - the value at `key`
     * @param  {*} key - The key of `val`
     * @return {undefined}
     */
    _mergeProp(data, val, key) {
      if (typeof val === 'function') {
        const source = this;
        return Promise.cast(val(this)).then(function(newVal) {
          return source._mergeProp(data, newVal, key);
        });
      }

      if (val == null || !key || !_.isString(key)) return;

      switch (key) {
        case 'filter':
          let filters = Array.isArray(val) ? val : [val];

          filters = filters.filter(filter => {
            return this._filterPredicates.every(predicate => predicate(filter, data));
          });

          data.filters = [...(data.filters || []), ...filters];
          return;
        case 'index':
        case 'type':
        case 'id':
        case 'highlightAll':
          if (key && data[key] == null) {
            data[key] = val;
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
          val = normalizeSortRequest(val, this.getField('index'));
          addToBody();
          break;
        case 'query':
          data.query = (data.query || []).concat(val);
          break;
        case 'fields':
          data[key] = _.uniq([...(data[key] || []), ...val]);
          break;
        default:
          addToBody();
      }

      /**
       * Add the key and val to the body of the request
       */
      function addToBody() {
        data.body = data.body || {};
        // ignore if we already have a value
        if (data.body[key] == null) {
          data.body[key] = val;
        }
      }
    }

    /**
     * Walk the inheritance chain of a source and return it's
     * flat representation (taking into account merging rules)
     * @returns {Promise}
     * @resolved {Object|null} - the flat data of the SearchSource
     */
    _flatten() {
      // the merged data of this dataSource and it's ancestors
      const flatData = {};

      // function used to write each property from each data object in the chain to flat data
      const root = this;

      // start the chain at this source
      let current = this;

      // call the ittr and return it's promise
      return (function ittr() {
        // iterate the _fields object (not array) and
        // pass each key:value pair to source._mergeProp. if _mergeProp
        // returns a promise, then wait for it to complete and call _mergeProp again
        return Promise.all(
          _.map(current._fields, function ittr(value, key) {
            if (Promise.is(value)) {
              return value.then(function(value) {
                return ittr(value, key);
              });
            }

            const prom = root._mergeProp(flatData, value, key);
            return Promise.is(prom) ? prom : null;
          })
        ).then(function() {
          // move to this sources parent
          const parent = current.getParent();
          // keep calling until we reach the top parent
          if (parent) {
            current = parent;
            return ittr();
          }
        });
      })().then(function() {
        // This is down here to prevent the circular dependency
        flatData.body = flatData.body || {};

        const computedFields = flatData.index.getComputedFields();

        flatData.body.stored_fields = computedFields.storedFields;
        flatData.body.script_fields = flatData.body.script_fields || {};
        _.extend(flatData.body.script_fields, computedFields.scriptFields);

        const defaultDocValueFields = computedFields.docvalueFields
          ? computedFields.docvalueFields
          : [];
        flatData.body.docvalue_fields = flatData.body.docvalue_fields || defaultDocValueFields;

        if (flatData.body._source) {
          // exclude source fields for this index pattern specified by the user
          const filter = fieldWildcardFilter(flatData.body._source.excludes);
          flatData.body.docvalue_fields = flatData.body.docvalue_fields.filter(docvalueField =>
            filter(docvalueField.field)
          );
        }

        // if we only want to search for certain fields
        const fields = flatData.fields;
        if (fields) {
          // filter out the docvalue_fields, and script_fields to only include those that we are concerned with
          flatData.body.docvalue_fields = filterDocvalueFields(
            flatData.body.docvalue_fields,
            fields
          );
          flatData.body.script_fields = _.pick(flatData.body.script_fields, fields);

          // request the remaining fields from both stored_fields and _source
          const remainingFields = _.difference(fields, _.keys(flatData.body.script_fields));
          flatData.body.stored_fields = remainingFields;
          _.set(flatData.body, '_source.includes', remainingFields);
        }

        const esQueryConfigs = getEsQueryConfig(config);
        flatData.body.query = buildEsQuery(
          flatData.index,
          flatData.query,
          flatData.filters,
          esQueryConfigs
        );

        if (flatData.highlightAll != null) {
          if (flatData.highlightAll && flatData.body.query) {
            flatData.body.highlight = getHighlightRequest(flatData.body.query, getConfig);
          }
          delete flatData.highlightAll;
        }

        /**
         * Translate a filter into a query to support es 3+
         * @param  {Object} filter - The filter to translate
         * @return {Object} the query version of that filter
         */
        const translateToQuery = function(filter) {
          if (!filter) return;

          if (filter.query) {
            return filter.query;
          }

          return filter;
        };

        // re-write filters within filter aggregations
        (function recurse(aggBranch) {
          if (!aggBranch) return;
          Object.keys(aggBranch).forEach(function(id) {
            const agg = aggBranch[id];

            if (agg.filters) {
              // translate filters aggregations
              const filters = agg.filters.filters;

              Object.keys(filters).forEach(function(filterId) {
                filters[filterId] = translateToQuery(filters[filterId]);
              });
            }

            recurse(agg.aggs || agg.aggregations);
          });
        })(flatData.body.aggs || flatData.body.aggregations);

        return flatData;
      });
    }
  }

  return SearchSource;
}
