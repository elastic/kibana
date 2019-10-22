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
import { buildEsQuery, getEsQueryConfig } from '@kbn/es-query';

import { npSetup } from 'ui/new_platform';
import { normalizeSortRequest } from './normalize_sort_request';

import { fetchSoon } from '../fetch';
import { fieldWildcardFilter } from '../../field_wildcard';
import { getHighlightRequest } from '../../../../../plugins/data/common/field_formats';
import chrome from '../../chrome';
import { RequestFailure } from '../fetch/errors';
import { filterDocvalueFields } from './filter_docvalue_fields';
import { SearchSourceOptions, SearchSourceFields } from './types';
import { FetchOptions, ApiCaller } from '../fetch/types';

const esShardTimeout = npSetup.core.injectedMetadata.getInjectedVar('esShardTimeout') as number;
const config = npSetup.core.uiSettings;
const forIp = Symbol('for which index pattern?');

export type SearchSourceContract = Pick<SearchSource, keyof SearchSource>;

export class SearchSource {
  private id: string = _.uniqueId('data_source');
  private searchStrategyId?: string;
  private parent?: SearchSource;
  private requestStartHandlers: Array<
    (searchSource: SearchSourceContract, options?: FetchOptions) => Promise<unknown>
  > = [];
  private inheritOptions: SearchSourceOptions = {};
  private fields: SearchSourceFields = {};
  public history: any[] = [];

  constructor() {}

  /** ***
   * PUBLIC API
   *****/

  setPreferredSearchStrategyId(searchStrategyId: string) {
    this.searchStrategyId = searchStrategyId;
  }

  setFields(newFields: SearchSourceFields) {
    this.fields = newFields;
    return this;
  }

  setField<K extends keyof SearchSourceFields>(field: K, value: SearchSourceFields[K]) {
    if (field === 'index') {
      const { fields } = this;
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
      delete this.fields[field];
      return this;
    }

    this.fields[field] = value;
    return this;
  }

  getId() {
    return this.id;
  }

  getFields() {
    return { ...this.fields };
  }

  /**
   * Get fields from the fields
   */
  getField<K extends keyof SearchSourceFields>(field: K, recurse = true): SearchSourceFields[K] {
    if (!recurse || this.fields[field] !== void 0) {
      return this.fields[field];
    }
    const parent = this.getParent();
    return parent && parent.getField(field);
  }

  /**
   * Get the field from our own fields, don't traverse up the chain
   */
  getOwnField<K extends keyof SearchSourceFields>(field: K): SearchSourceFields[K] {
    return this.getField(field, false);
  }

  create() {
    return new SearchSource();
  }

  createCopy() {
    const newSearchSource = new SearchSource();
    newSearchSource.setFields({ ...this.fields });
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
   * @param  {SearchSource} parent - the parent searchSource
   * @param  {SearchSourceOptions} options - the inherit options
   * @return {this} - chainable
   */
  setParent(parent?: SearchSourceContract, options: SearchSourceOptions = {}) {
    this.parent = parent as SearchSource;
    this.inheritOptions = options;
    return this;
  }

  /**
   * Get the parent of this SearchSource
   * @return {undefined|searchSource}
   */
  getParent() {
    return this.parent;
  }

  /**
   * Fetch this source and reject the returned Promise on error
   *
   * @async
   */
  async fetch(options: FetchOptions = {}) {
    const $injector = await chrome.dangerouslyGetActiveInjector();
    const es = $injector.get('es') as ApiCaller;

    await this.requestIsStarting(options);

    const searchRequest = await this.flatten();
    this.history = [searchRequest];

    const response = await fetchSoon(
      searchRequest,
      {
        ...(this.searchStrategyId && { searchStrategyId: this.searchStrategyId }),
        ...options,
      },
      { es, config, esShardTimeout }
    );

    if (response.error) {
      throw new RequestFailure(null, response);
    }

    return response;
  }

  /**
   *  Add a handler that will be notified whenever requests start
   *  @param  {Function} handler
   *  @return {undefined}
   */
  onRequestStart(
    handler: (searchSource: SearchSourceContract, options?: FetchOptions) => Promise<unknown>
  ) {
    this.requestStartHandlers.push(handler);
  }

  async getSearchRequestBody() {
    const searchRequest = await this.flatten();
    return searchRequest.body;
  }

  /**
   * Completely destroy the SearchSource.
   * @return {undefined}
   */
  destroy() {
    this.requestStartHandlers.length = 0;
  }

  /** ****
   * PRIVATE APIS
   ******/

  /**
   *  Called by requests of this search source when they are started
   *  @param  {Courier.Request} request
   *  @param options
   *  @return {Promise<undefined>}
   */
  private requestIsStarting(options: FetchOptions = {}) {
    const handlers = [...this.requestStartHandlers];
    // If callParentStartHandlers has been set to true, we also call all
    // handlers of parent search sources.
    if (this.inheritOptions.callParentStartHandlers) {
      let searchSource = this.getParent();
      while (searchSource) {
        handlers.push(...searchSource.requestStartHandlers);
        searchSource = searchSource.getParent();
      }
    }

    return Promise.all(handlers.map(fn => fn(this, options)));
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
  private mergeProp<K extends keyof SearchSourceFields>(
    data: any,
    val: SearchSourceFields[K],
    key: K
  ) {
    val = typeof val === 'function' ? val(this) : val;

    const addToRoot = (rootKey: string, value: any) => {
      data[rootKey] = value;
    };

    /**
     * Add the key and val to the body of the request
     */
    const addToBody = (bodyKey: string, value: any) => {
      // ignore if we already have a value
      if (data.body[bodyKey] == null) {
        data.body[bodyKey] = value;
      }
    };

    switch (key) {
      case 'filter':
        return addToRoot('filters', (data.filters || []).concat(val));
      case 'query':
        return addToRoot(key, (data[key] || []).concat(val));
      case 'index':
      case 'type':
      case 'highlightAll':
        return key && data[key] == null && addToRoot(key, val);
      case 'searchAfter':
        return addToBody('search_after', val);
      case 'source':
        return addToBody('_source', val);
      case 'sort':
        const sort = normalizeSortRequest(val, this.getField('index'), config.get('sort:options'));
        return addToBody(key, sort);
      case 'fields':
        const fields = _.uniq((data[key] || []).concat(val || []));
        return addToRoot(key, fields);
      default:
        return addToBody(key, val);
    }
  }

  /**
   * Walk the inheritance chain of a source and return its
   * flat representation (taking into account merging rules)
   * @returns {Promise}
   * @resolved {Object|null} - the flat data of the SearchSource
   */
  private mergeProps(root = this, searchRequest: any = { body: {} }) {
    Object.entries(this.fields).forEach(([key, value]) => {
      this.mergeProp(searchRequest, value, key as keyof SearchSourceFields);
    });
    if (this.parent) {
      this.parent.mergeProps(root, searchRequest);
    }
    return searchRequest;
  }

  private flatten() {
    const searchRequest = this.mergeProps();

    const computedFields = searchRequest.index.getComputedFields();

    searchRequest.body.stored_fields = computedFields.storedFields;
    searchRequest.body.script_fields = searchRequest.body.script_fields || {};
    _.extend(searchRequest.body.script_fields, computedFields.scriptFields);

    searchRequest.body.docvalue_fields =
      searchRequest.body.docvalue_fields || computedFields.docvalueFields || [];

    if (searchRequest.body._source) {
      // exclude source fields for this index pattern specified by the user
      const filter = fieldWildcardFilter(
        searchRequest.body._source.excludes,
        config.get('metaFields')
      );
      searchRequest.body.docvalue_fields = searchRequest.body.docvalue_fields.filter(
        (docvalueField: any) => filter(docvalueField.field)
      );
    }

    // if we only want to search for certain fields
    const fields = searchRequest.fields;
    if (fields) {
      // filter out the docvalue_fields, and script_fields to only include those that we are concerned with
      searchRequest.body.docvalue_fields = filterDocvalueFields(
        searchRequest.body.docvalue_fields,
        fields
      );
      searchRequest.body.script_fields = _.pick(searchRequest.body.script_fields, fields);

      // request the remaining fields from both stored_fields and _source
      const remainingFields = _.difference(fields, _.keys(searchRequest.body.script_fields));
      searchRequest.body.stored_fields = remainingFields;
      _.set(searchRequest.body, '_source.includes', remainingFields);
    }

    const esQueryConfigs = getEsQueryConfig(config);
    searchRequest.body.query = buildEsQuery(
      searchRequest.index,
      searchRequest.query,
      searchRequest.filters,
      esQueryConfigs
    );

    if (searchRequest.highlightAll != null) {
      if (searchRequest.highlightAll && searchRequest.body.query) {
        searchRequest.body.highlight = getHighlightRequest(
          searchRequest.body.query,
          config.get('doc_table:highlight')
        );
      }
      delete searchRequest.highlightAll;
    }

    // re-write filters within filter aggregations
    (function recurse(aggBranch) {
      if (!aggBranch) return;
      Object.keys(aggBranch).forEach(function(id) {
        const agg = aggBranch[id];

        if (agg.filters) {
          // translate filters aggregations
          const filters = agg.filters.filters;

          Object.keys(filters).forEach(function(filterId) {
            filters[filterId] = buildEsQuery(
              searchRequest.index,
              [],
              [filters[filterId]],
              esQueryConfigs
            );
          });
        }

        recurse(agg.aggs || agg.aggregations);
      });
    })(searchRequest.body.aggs || searchRequest.body.aggregations);

    return searchRequest;
  }
}
