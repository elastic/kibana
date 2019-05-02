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
import { buildEsQuery, getEsQueryConfig, translateToQuery } from '@kbn/es-query';

import { normalizeSortRequest } from './_normalize_sort_request';
import { SearchRequest } from '../fetch/request';

import { FetchSoonProvider } from '../fetch';
import { fieldWildcardFilter } from '../../field_wildcard';
import { getHighlightRequest } from '../../../../core_plugins/kibana/common/highlight';

const FIELDS = [
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

function parseInitialFields(initialFields = {}) {
  return typeof initialFields === 'string' ?
    JSON.parse(initialFields)
    : _.cloneDeep(initialFields);
}

export function SearchSourceProvider(Private, config) {
  const fetchSoon = Private(FetchSoonProvider);

  class SearchSource {
    constructor(initialFields) {
      this._searchStrategyId = undefined;
      this._fields = parseInitialFields(initialFields);
      this._parent = undefined;

      this.history = [];
      this._requestStartHandlers = [];
      this._inheritOptions = {};
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
        throw new Error(`Can't set field '${field}' on SearchSource. Acceptable fields are: ${FIELDS.join(', ')}.`);
      }

      if (value == null) {
        delete this._fields[field];
        return this;
      }

      this._fields[field] = value;
      return this;
    };

    getFields() {
      return _.clone(this._fields);
    }

    /**
     * Get fields from the fields
     */
    getField = (field, recurse = true) => {
      if (!FIELDS.includes(field)) {
        throw new Error(`Can't get field '${field}' from SearchSource. Acceptable fields are: ${FIELDS.join(', ')}.`);
      }
      const value = this._fields[field];
      const parent = this.getParent();
      if (value !== void 0 || !recurse || !parent) {
        return value;
      }
      return parent.getField(field, recurse);
    };

    /**
     * Get the field from our own fields, don't traverse up the chain
     */
    getOwnField(field) {
      return this.getField(field, false);
    }

    create() {
      return new SearchSource();
    }

    createCopy() {
      const json = angular.toJson(this._fields);
      const newSearchSource = new SearchSource(json);
      // when serializing the internal fields we lose the internal classes used in the index
      // pattern, so we have to set it again to workaround this behavior
      newSearchSource.setPreferredSearchStrategyId(this._searchStrategyId);
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
      return this._parent;
    }

    /**
     * Fetch this source and reject the returned Promise on error
     *
     * @async
     */
    fetch() {
      const request = this._createRequest();
      this.requestIsStarting(request);
      return fetchSoon(request);
    }

    /**
     * Cancel all pending requests for this searchSource
     * @return {undefined}
     */
    cancelQueued() {
      // It's safe to call abort on all the requests, since the request itself is smart enough not
      // to abort if it has already completed
      this.history.forEach(request => request.abort());
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
     *  @param  {SearchRequest} request
     *  @return {Promise<undefined>}
     */
    requestIsStarting(request) {
      this.history.push(request);

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

      const promises = handlers.map(fn => fn(this, request));
      return Promise.all(promises).then(_.noop);
    }

    async getSearchRequestBody() {
      const searchRequest = await this._flatten();
      return searchRequest.body;
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

    /**
     * Create a common search request object, which should
     * be put into the pending request queue, for this search
     * source
     *
     * @param {Deferred} defer - the deferred object that should be resolved
     *                         when the request is complete
     * @return {SearchRequest}
     */
    _createRequest() {
      return new SearchRequest({ source: this });
    }

    /**
     * Used to merge properties into the data within ._flatten().
     * The data is passed in and modified by the function
     *
     * @param  {object} data - the current merged data
     * @param  {*} val - the value at `key`
     * @param  {*} key - The key of `val`
     */
    _mergeProp(data, val, key) {
      if (typeof val === 'function') {
        val = val(this);
      }

      if (val == null || !key || !_.isString(key)) return;

      switch (key) {
        case 'filter':
          return (data.filters = (data.filters || []).concat(val));
        case 'index':
        case 'id':
          return data[key] == null && (data[key] = val);
        case 'highlightAll':
          if (!val || !config.get('doc_table:highlight')) return;
          return addToBody('highlight', getHighlightRequest());
        case 'searchAfter':
          return addToBody('search_after', val);
        case 'source':
          return addToBody('_source', val);
        case 'sort':
          return addToBody(key, normalizeSortRequest(val, this.getField('index'), config.get('sort:options')));
        case 'query':
          return (data[key] = (data[key] || []).concat(val));
        case 'fields':
          return (data[key] = _.uniq((data[key] || []).concat(val)));
        default:
          return addToBody(key, val);
      }

      /**
       * Add the key and val to the body of the request
       */
      function addToBody(key, val) {
        data.body = data.body || {};
        // ignore if we already have a value
        if (data.body[key] == null) {
          data.body[key] = val;
        }
      }
    }

    /**
     * Walk the inheritance chain of a source and return its
     * flat representation (taking into account merging rules)
     * @returns {Promise}
     * @resolved {Object|null} - the flat data of the SearchSource
     */
    _flatten() {
      // the merged data of this dataSource and its ancestors
      const flatData = {};

      // function used to write each property from each data object in the chain to flat data
      const root = this;

      // start the chain at this source
      let current = this;

      // iterate through ancestry until no more parents are found, merging props as you go
      while (current) {
        _.forEach(current._fields, function ittr(value, key) {
          root._mergeProp(flatData, value, key);
        });
        current = current.getParent();
      }

      flatData.body = flatData.body || {};

      const { storedFields, scriptFields, docvalueFields } = flatData.index.getComputedFields();
      flatData.body.stored_fields = storedFields;
      flatData.body.script_fields = _.extend(flatData.body.script_fields || {}, scriptFields);
      flatData.body.docvalue_fields = _.union(flatData.body.docvalue_fields || [], docvalueFields);

      if (!flatData.body._source && flatData.index) {
        // If _source hasn't explicitly been specified, use the value from the index pattern
        flatData.body._source = flatData.index.getSourceFiltering();
      }

      if (flatData.body._source) {
        // exclude source fields for this index pattern specified by the user
        const filter = fieldWildcardFilter(config.get('metaFields'), flatData.body._source.excludes);
        flatData.body.docvalue_fields = flatData.body.docvalue_fields.filter(
          docvalueField => filter(docvalueField.field)
        );
      }

      // if we only want to search for certain fields
      const fields = flatData.fields;
      if (fields) {
        // filter out the docvalue_fields, and script_fields to only include those that we are concerned with
        flatData.body.docvalue_fields = _.intersection(flatData.body.docvalue_fields, fields);
        flatData.body.script_fields = _.pick(flatData.body.script_fields, fields);

        // request the remaining fields from both stored_fields and _source
        const remainingFields = _.difference(fields, _.keys(flatData.body.script_fields));
        flatData.body.stored_fields = remainingFields;
        _.set(flatData.body, '_source.includes', remainingFields);
      }

      const esQueryConfigs = getEsQueryConfig(config);
      flatData.body.query = buildEsQuery(flatData.index, flatData.query, flatData.filters, esQueryConfigs);

      // re-write filters within filter aggregations
      Object.values(flatData.body.aggs || flatData.body.aggregations || {}).forEach(function translate(agg) {
        if (agg && agg.filters) {
          const filters = agg.filters.filters;
          Object.keys(filters).forEach(function (filterId) {
            filters[filterId] = translateToQuery(filters[filterId]);
          });
          translate(agg.aggs || agg.aggregations);
        }
      });

      return flatData;
    }
  }

  return SearchSource;
}
