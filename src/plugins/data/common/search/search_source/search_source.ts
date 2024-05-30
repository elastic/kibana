/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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

import { setWith } from '@kbn/safer-lodash-set';
import {
  difference,
  isEqual,
  isFunction,
  isObject,
  keyBy,
  pick,
  uniqueId,
  concat,
  omitBy,
  isNil,
} from 'lodash';
import { catchError, finalize, first, last, map, shareReplay, switchMap, tap } from 'rxjs';
import { defer, EMPTY, from, lastValueFrom, Observable } from 'rxjs';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import {
  buildEsQuery,
  Filter,
  isOfQueryType,
  isPhraseFilter,
  isPhrasesFilter,
} from '@kbn/es-query';
import { fieldWildcardFilter } from '@kbn/kibana-utils-plugin/common';
import { getHighlightRequest } from '@kbn/field-formats-plugin/common';
import type { DataView } from '@kbn/data-views-plugin/common';
import {
  ExpressionAstExpression,
  buildExpression,
  buildExpressionFunction,
} from '@kbn/expressions-plugin/common';
import type { ISearchGeneric, IKibanaSearchResponse, IEsSearchResponse } from '@kbn/search-types';
import { normalizeSortRequest } from './normalize_sort_request';

import { AggConfigSerialized, DataViewField, SerializedSearchSourceFields } from '../..';

import { AggConfigs, EsQuerySortValue } from '../..';
import type {
  ISearchSource,
  SearchFieldValue,
  SearchSourceFields,
  SearchSourceOptions,
  SearchSourceSearchOptions,
} from './types';
import { getSearchParamsFromRequest, RequestFailure } from './fetch';
import type { FetchHandlers, SearchRequest } from './fetch';
import { getRequestInspectorStats, getResponseInspectorStats } from './inspect';

import { getEsQueryConfig, isRunningResponse, UI_SETTINGS } from '../..';
import { AggsStart } from '../aggs';
import { extractReferences } from './extract_references';
import {
  EsdslExpressionFunctionDefinition,
  ExpressionFunctionKibanaContext,
  filtersToAst,
  queryToAst,
} from '../expressions';

/** @internal */
export const searchSourceRequiredUiSettings = [
  'dateFormat:tz',
  UI_SETTINGS.COURIER_CUSTOM_REQUEST_PREFERENCE,
  UI_SETTINGS.COURIER_IGNORE_FILTER_IF_FIELD_NOT_IN_INDEX,
  UI_SETTINGS.COURIER_MAX_CONCURRENT_SHARD_REQUESTS,
  UI_SETTINGS.COURIER_SET_REQUEST_PREFERENCE,
  UI_SETTINGS.DOC_HIGHLIGHT,
  UI_SETTINGS.META_FIELDS,
  UI_SETTINGS.QUERY_ALLOW_LEADING_WILDCARDS,
  UI_SETTINGS.QUERY_STRING_OPTIONS,
  UI_SETTINGS.SEARCH_INCLUDE_FROZEN,
  UI_SETTINGS.SORT_OPTIONS,
];

export interface SearchSourceDependencies extends FetchHandlers {
  aggs: AggsStart;
  search: ISearchGeneric;
  scriptedFieldsEnabled: boolean;
}

interface ExpressionAstOptions {
  /**
   * When truthy, it will include either `esaggs` or `esdsl` function to the expression chain.
   * In this case, the expression will perform a search and return the `datatable` structure.
   * @default true
   */
  asDatatable?: boolean;
}

const omitByIsNil = <T>(object: Record<string, T>) => omitBy<T>(object, isNil);

/** @public **/
export class SearchSource {
  private id: string = uniqueId('data_source');
  private shouldOverwriteDataViewType: boolean = false;
  private overwriteDataViewType?: string;
  private parent?: SearchSource;
  private requestStartHandlers: Array<
    (searchSource: SearchSource, options?: SearchSourceSearchOptions) => Promise<unknown>
  > = [];
  private inheritOptions: SearchSourceOptions = {};
  public history: SearchRequest[] = [];
  private fields: SearchSourceFields;
  private readonly dependencies: SearchSourceDependencies;

  constructor(fields: SearchSourceFields = {}, dependencies: SearchSourceDependencies) {
    const { parent, ...currentFields } = fields;
    this.fields = currentFields;
    this.dependencies = dependencies;

    if (parent) {
      this.setParent(new SearchSource(parent, dependencies));
    }
  }

  /** ***
   * PUBLIC API
   *****/

  /**
   * Used to make the search source overwrite the actual data view type for the
   * specific requests done. This should only be needed very rarely, since it means
   * e.g. we'd be treating a rollup index pattern as a regular one. Be very sure
   * you understand the consequences of using this method before using it.
   *
   * @param overwriteType If `false` is passed in it will disable the overwrite, otherwise
   *    the passed in value will be used as the data view type for this search source.
   */
  setOverwriteDataViewType(overwriteType: string | undefined | false) {
    if (overwriteType === false) {
      this.shouldOverwriteDataViewType = false;
      this.overwriteDataViewType = undefined;
    } else {
      this.shouldOverwriteDataViewType = true;
      this.overwriteDataViewType = overwriteType;
    }
  }

  /**
   * sets value to a single search source field
   * @param field: field name
   * @param value: value for the field
   */
  setField<K extends keyof SearchSourceFields>(field: K, value: SearchSourceFields[K]) {
    if (value == null) {
      return this.removeField(field);
    }
    this.fields[field] = value;
    return this;
  }

  /**
   * remove field
   * @param field: field name
   */
  removeField<K extends keyof SearchSourceFields>(field: K) {
    delete this.fields[field];
    return this;
  }

  /**
   * Internal, do not use. Overrides all search source fields with the new field array.
   *
   * @private
   * @param newFields New field array.
   */
  private setFields(newFields: SearchSourceFields) {
    this.fields = newFields;
    return this;
  }

  /**
   * returns search source id
   */
  getId() {
    return this.id;
  }

  /**
   * returns all search source fields
   */
  getFields(): SearchSourceFields {
    return { ...this.fields };
  }

  /**
   * Gets a single field from the fields
   */
  getField<K extends keyof SearchSourceFields>(field: K, recurse = true): SearchSourceFields[K] {
    if (!recurse || this.fields[field] !== void 0) {
      return this.fields[field];
    }
    const parent = this.getParent();
    return parent && parent.getField(field);
  }

  getActiveIndexFilter() {
    const { filter: originalFilters, query } = this.getFields();
    let filters: Filter[] = [];
    if (originalFilters) {
      filters = this.getFilters(originalFilters);
    }

    const queryString = Array.isArray(query)
      ? query.map((q) => q.query)
      : isOfQueryType(query)
      ? query?.query
      : undefined;

    const indexPatternFromQuery =
      typeof queryString === 'string'
        ? this.parseActiveIndexPatternFromQueryString(queryString)
        : queryString?.reduce((acc: string[], currStr: string) => {
            return acc.concat(this.parseActiveIndexPatternFromQueryString(currStr));
          }, []) ?? [];

    const activeIndexPattern = filters?.reduce((acc, f) => {
      const isPhraseFilterType = isPhraseFilter(f);
      const isPhrasesFilterType = isPhrasesFilter(f);
      const filtersToChange = isPhraseFilterType ? f.meta.params?.query : f.meta.params;
      const filtersArray = Array.isArray(filtersToChange) ? filtersToChange : [filtersToChange];
      if (isPhraseFilterType || isPhrasesFilterType) {
        if (f.meta.key === '_index' && f.meta.disabled === false) {
          if (f.meta.negate === false) {
            return concat(acc, filtersArray);
          } else {
            return difference(acc, filtersArray);
          }
        } else {
          return acc;
        }
      } else {
        return acc;
      }
    }, indexPatternFromQuery);

    const dedupActiveIndexPattern = new Set([...activeIndexPattern]);

    return [...dedupActiveIndexPattern];
  }

  /**
   * Get the field from our own fields, don't traverse up the chain
   */
  getOwnField<K extends keyof SearchSourceFields>(field: K): SearchSourceFields[K] {
    return this.getField(field, false);
  }

  /**
   * @deprecated Don't use.
   */
  create() {
    return new SearchSource({}, this.dependencies);
  }

  /**
   * creates a copy of this search source (without its children)
   */
  createCopy() {
    const newSearchSource = new SearchSource({}, this.dependencies);
    newSearchSource.setFields({ ...this.fields });
    // when serializing the internal fields we lose the internal classes used in the index
    // pattern, so we have to set it again to workaround this behavior
    newSearchSource.setField('index', this.getField('index'));
    newSearchSource.setParent(this.getParent());
    return newSearchSource;
  }

  /**
   * creates a new child search source
   * @param options
   */
  createChild(options = {}) {
    const childSearchSource = new SearchSource({}, this.dependencies);
    childSearchSource.setParent(this, options);
    return childSearchSource;
  }

  /**
   * Set a searchSource that this source should inherit from
   * @param  {SearchSource} parent - the parent searchSource
   * @param  {SearchSourceOptions} options - the inherit options
   */
  setParent(parent?: ISearchSource, options: SearchSourceOptions = {}): this {
    this.parent = parent as SearchSource;
    this.inheritOptions = options;
    return this;
  }

  /**
   * Get the parent of this SearchSource
   */
  getParent(): SearchSource | undefined {
    return this.parent;
  }

  /**
   * Fetch this source from Elasticsearch, returning an observable over the response(s)
   * @param options
   */
  fetch$<T = {}>(
    options: SearchSourceSearchOptions = {}
  ): Observable<IKibanaSearchResponse<estypes.SearchResponse<T>>> {
    const s$ = defer(() => this.requestIsStarting(options)).pipe(
      switchMap(() => {
        const searchRequest = this.flatten();
        this.history = [searchRequest];
        if (searchRequest.index) {
          options.indexPattern = searchRequest.index;
        }

        return this.fetchSearch$(searchRequest, options);
      }),
      tap((response) => {
        // TODO: Remove casting when https://github.com/elastic/elasticsearch-js/issues/1287 is resolved
        if (!response || (response as unknown as { error: string }).error) {
          throw new RequestFailure(null, response);
        }
      }),
      shareReplay()
    );

    return this.inspectSearch(s$, options) as Observable<
      IKibanaSearchResponse<estypes.SearchResponse<T>>
    >;
  }

  /**
   * Fetch this source and reject the returned Promise on error
   * @deprecated Use the `fetch$` method instead
   */
  async fetch(
    options: SearchSourceSearchOptions = {}
  ): Promise<estypes.SearchResponse<unknown, Record<string, estypes.AggregationsAggregate>>> {
    const r = await lastValueFrom(this.fetch$(options));
    return r.rawResponse as estypes.SearchResponse<unknown>;
  }

  /**
   *  Add a handler that will be notified whenever requests start
   *  @param  {Function} handler
   */
  onRequestStart(
    handler: (searchSource: SearchSource, options?: SearchSourceSearchOptions) => Promise<unknown>
  ): void {
    this.requestStartHandlers.push(handler);
  }

  /**
   * Returns body contents of the search request, often referred as query DSL.
   */
  getSearchRequestBody() {
    return this.flatten().body;
  }

  /**
   * Completely destroy the SearchSource.
   */
  destroy(): void {
    this.requestStartHandlers.length = 0;
  }

  /** ****
   * PRIVATE APIS
   ******/

  private inspectSearch(
    s$: Observable<IKibanaSearchResponse<unknown>>,
    options: SearchSourceSearchOptions
  ) {
    const { id, title, description, adapter } = options.inspector || { title: '' };

    const requestResponder = adapter?.start(title, {
      id,
      description,
      searchSessionId: options.sessionId,
    });

    const trackRequestBody = () => {
      try {
        requestResponder?.json(this.getSearchRequestBody());
      } catch (e) {} // eslint-disable-line no-empty
    };

    // Track request stats on first emit, swallow errors
    const first$ = s$
      .pipe(
        first(undefined, null),
        tap(() => {
          requestResponder?.stats(getRequestInspectorStats(this));
          trackRequestBody();
        }),
        catchError(() => {
          trackRequestBody();
          return EMPTY;
        }),
        finalize(() => {
          first$.unsubscribe();
        })
      )
      .subscribe();

    // Track response stats on last emit, as well as errors
    const last$ = s$
      .pipe(
        catchError((e) => {
          requestResponder?.error({
            json: 'attributes' in e ? e.attributes : { message: e.message },
          });
          return EMPTY;
        }),
        last(undefined, null),
        tap((finalResponse) => {
          if (finalResponse) {
            const resp = finalResponse.rawResponse as estypes.SearchResponse<unknown>;
            requestResponder?.stats(getResponseInspectorStats(resp, this));
            requestResponder?.ok({ json: finalResponse });
          }
        }),
        finalize(() => {
          last$.unsubscribe();
        })
      )
      .subscribe();

    return s$;
  }

  private hasPostFlightRequests() {
    const aggs = this.getField('aggs');
    if (aggs instanceof AggConfigs) {
      return aggs.aggs.some(
        (agg) =>
          agg.enabled &&
          typeof agg.type.postFlightRequest === 'function' &&
          (agg.params.otherBucket || agg.params.missingBucket)
      );
    } else {
      return false;
    }
  }

  private postFlightTransform(response: IEsSearchResponse<unknown>) {
    const aggs = this.getField('aggs');
    if (aggs instanceof AggConfigs) {
      return aggs.postFlightTransform(response);
    } else {
      return response;
    }
  }

  private async fetchOthers(
    response: estypes.SearchResponse<unknown>,
    options: SearchSourceSearchOptions
  ) {
    const aggs = this.getField('aggs');
    if (aggs instanceof AggConfigs) {
      for (const agg of aggs.aggs) {
        if (agg.enabled && typeof agg.type.postFlightRequest === 'function') {
          response = await agg.type.postFlightRequest(
            response,
            aggs,
            agg,
            this,
            options.inspector?.adapter,
            options.abortSignal,
            options.sessionId,
            options.disableWarningToasts
          );
        }
      }
    }
    return response;
  }

  /**
   * Run a search using the search service
   */
  private fetchSearch$(
    searchRequest: SearchRequest,
    options: SearchSourceSearchOptions
  ): Observable<IKibanaSearchResponse<unknown>> {
    const { search, getConfig, onResponse } = this.dependencies;

    const params = getSearchParamsFromRequest(searchRequest, {
      getConfig,
    });

    return search({ params, indexType: searchRequest.indexType }, options).pipe(
      switchMap((response) => {
        // For testing timeout messages in UI, uncomment the next line
        // response.rawResponse.timed_out = true;
        return new Observable<IKibanaSearchResponse<unknown>>((obs) => {
          if (isRunningResponse(response)) {
            obs.next(this.postFlightTransform(response));
          } else {
            if (!this.hasPostFlightRequests()) {
              obs.next(this.postFlightTransform(response));
              obs.complete();
            } else {
              // Treat the complete response as partial, then run the postFlightRequests.
              obs.next({
                ...this.postFlightTransform(response),
                isPartial: true,
                isRunning: true,
              });
              const sub = from(this.fetchOthers(response.rawResponse, options)).subscribe({
                next: (responseWithOther) => {
                  obs.next(
                    this.postFlightTransform({
                      ...response,
                      rawResponse: responseWithOther!,
                    })
                  );
                },
                error: (e) => {
                  obs.error(e);
                  sub.unsubscribe();
                },
                complete: () => {
                  obs.complete();
                  sub.unsubscribe();
                },
              });
            }
          }
        });
      }),
      map((response) => {
        if (isRunningResponse(response)) {
          return response;
        }
        return onResponse(searchRequest, response, options);
      })
    );
  }

  /**
   *  Called by requests of this search source when they are started
   *  @param options
   */
  private requestIsStarting(options: SearchSourceSearchOptions = {}): Promise<unknown[]> {
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

    return Promise.all(handlers.map((fn) => fn(this, options)));
  }

  /**
   * Used to merge properties into the data within ._flatten().
   * The data is passed in and modified by the function
   *
   * @param  {object} data - the current merged data
   * @param  {*} val - the value at `key`
   * @param  {*} key - The key of `val`
   */
  private mergeProp<K extends keyof SearchSourceFields>(
    data: SearchRequest,
    val: SearchSourceFields[K],
    key: K
  ): false | void {
    val = typeof val === 'function' ? val(this) : val;
    if (val == null || !key) return;

    const addToRoot = (rootKey: string, value: unknown) => {
      data[rootKey] = value;
    };

    /**
     * Add the key and val to the body of the request
     */
    const addToBody = (bodyKey: string, value: unknown) => {
      // ignore if we already have a value
      if (data.body[bodyKey] == null) {
        data.body[bodyKey] = value;
      }
    };

    const { getConfig } = this.dependencies;

    switch (key) {
      case 'filter':
        return addToRoot('filters', (data.filters || []).concat(val));
      case 'query':
        return addToRoot(key, (data[key] || []).concat(val));
      case 'fields':
        // This will pass the passed in parameters to the new fields API.
        // Also if will only return scripted fields that are part of the specified
        // array of fields. If you specify the wildcard `*` as an array element
        // the fields API will return all fields, and all scripted fields will be returned.
        // NOTE: While the fields API supports wildcards within names, e.g. `user.*`
        //       scripted fields won't be considered for this.
        return addToBody('fields', val);
      case 'fieldsFromSource':
        // preserves legacy behavior
        const fields = [...new Set((data[key] || []).concat(val))];
        return addToRoot(key, fields);
      case 'index':
      case 'type':
      case 'highlightAll':
        return key && data[key] == null && addToRoot(key, val);
      case 'searchAfter':
        return addToBody('search_after', val);
      case 'trackTotalHits':
        return addToBody('track_total_hits', val);
      case 'source':
        return addToBody('_source', val);
      case 'sort':
        const sort = normalizeSortRequest(
          val,
          this.getField('index'),
          getConfig(UI_SETTINGS.SORT_OPTIONS)
        );
        return addToBody(key, sort);
      case 'pit':
        return addToRoot(key, val);
      case 'aggs':
        if ((val as unknown) instanceof AggConfigs) {
          return addToBody('aggs', val.toDsl());
        } else {
          return addToBody('aggs', val);
        }
      default:
        return addToBody(key, val);
    }
  }

  /**
   * Walk the inheritance chain of a source and return its
   * flat representation (taking into account merging rules)
   * @resolved {Object|null} - the flat data of the SearchSource
   */
  private mergeProps(root = this, searchRequest: SearchRequest = { body: {} }): SearchRequest {
    Object.entries(this.fields).forEach(([key, value]) => {
      this.mergeProp(searchRequest, value, key as keyof SearchSourceFields);
    });
    if (this.parent) {
      this.parent.mergeProps(root, searchRequest);
    }
    return searchRequest;
  }

  private getIndexType(index?: DataView) {
    return this.shouldOverwriteDataViewType ? this.overwriteDataViewType : index?.type;
  }

  private readonly getFieldName = (fld: SearchFieldValue): string =>
    typeof fld === 'string' ? fld : (fld.field as string);

  private getFieldsWithoutSourceFilters(
    index: DataView | undefined,
    bodyFields: SearchFieldValue[]
  ): SearchFieldValue[] {
    if (!index) {
      return bodyFields;
    }
    const { fields } = index;
    const sourceFilters = index.getSourceFiltering();
    if (!sourceFilters || sourceFilters.excludes?.length === 0 || bodyFields.length === 0) {
      return bodyFields;
    }
    const sourceFiltersValues = sourceFilters.excludes;
    const wildcardField = bodyFields.find((el) => this.getFieldName(el) === '*');
    const filter = fieldWildcardFilter(
      sourceFiltersValues,
      this.dependencies.getConfig(UI_SETTINGS.META_FIELDS)
    );
    const filterSourceFields = (fieldName: string) => fieldName && filter(fieldName);
    if (!wildcardField) {
      // we already have an explicit list of fields, so we just remove source filters from that list
      return bodyFields.filter((fld: SearchFieldValue) =>
        filterSourceFields(this.getFieldName(fld))
      );
    }
    // we need to get the list of fields from an index pattern
    return fields
      .filter((fld: DataViewField) => filterSourceFields(fld.name))
      .map((fld: DataViewField) => ({ field: fld.name }));
  }

  private getFieldFromDocValueFieldsOrIndexPattern(
    docvaluesIndex: Record<string, SearchFieldValue>,
    fld: SearchFieldValue,
    index?: DataView
  ) {
    if (typeof fld === 'string') {
      return fld;
    }
    const fieldName = this.getFieldName(fld);
    const field = Object.assign({}, docvaluesIndex[fieldName], fld);
    if (!index) {
      return field;
    }
    const { fields } = index;
    const dateFields = fields.getByType('date');
    const dateField = dateFields.find((indexPatternField) => indexPatternField.name === fieldName);
    if (!dateField) {
      return field;
    }
    const { esTypes } = dateField;
    if (esTypes?.includes('date_nanos')) {
      field.format = 'strict_date_optional_time_nanos';
    } else if (esTypes?.includes('date')) {
      field.format = 'strict_date_optional_time';
    }
    return field;
  }

  private flatten() {
    const { getConfig } = this.dependencies;
    const metaFields = getConfig(UI_SETTINGS.META_FIELDS) ?? [];

    const searchRequest = this.mergeProps();
    searchRequest.body = searchRequest.body || {};
    const { body, index } = searchRequest;

    // get some special field types from the index pattern
    const { docvalueFields, scriptFields, runtimeFields } = index
      ? index.getComputedFields()
      : {
          docvalueFields: [],
          scriptFields: {},
          runtimeFields: {},
        };
    const fieldListProvided = !!body.fields;

    // set defaults
    const _source =
      index && !body.hasOwnProperty('_source') ? index.getSourceFiltering() : body._source;

    // get filter if data view specified, otherwise null filter
    const filter = this.getFieldFilter({ bodySourceExcludes: _source?.excludes, metaFields });

    const fieldsFromSource = filter(searchRequest.fieldsFromSource || []);
    // apply source filters from index pattern if specified by the user
    const filteredDocvalueFields = filter(docvalueFields);

    const sourceFieldsProvided = !!fieldsFromSource.length;

    const fields =
      fieldListProvided || sourceFieldsProvided
        ? filter(body.fields || [])
        : filteredDocvalueFields;

    const uniqFieldNames = this.getUniqueFieldNames({ fields, fieldsFromSource });

    const scriptedFields = (() => {
      const flds = this.dependencies.scriptedFieldsEnabled
        ? { ...body.script_fields, ...scriptFields }
        : {};

      // specific fields were provided, so we need to exclude any others
      return fieldListProvided || sourceFieldsProvided
        ? this.filterScriptFields({
            uniqFieldNames,
            scriptFields: flds,
          })
        : flds;
    })();

    // request the remaining fields from stored_fields just in case, since the
    // fields API does not handle stored fields
    const remainingFields = this.getRemainingFields({
      uniqFieldNames,
      scriptFields: scriptedFields,
      runtimeFields,
      _source,
    });

    // For testing shard failure messages in the UI, follow these steps:
    // 1. Add all three sample data sets (flights, ecommerce, logs) to Kibana.
    // 2. Create a data view using the index pattern `kibana*` and don't use a timestamp field.
    // 3. Uncomment the lines below, navigate to Discover,
    //    and switch to the data view created in step 2.
    // body.query.bool.must.push({
    //   error_query: {
    //     indices: [
    //       {
    //         name: 'kibana_sample_data_logs',
    //         shard_ids: [0, 1],
    //         error_type: 'exception',
    //         message: 'Testing shard failures!',
    //       },
    //     ],
    //   },
    // });
    // Alternatively you could also add this query via "Edit as Query DSL", then it needs no code to be changed

    body._source = _source;

    // only include unique values
    if (sourceFieldsProvided && !isEqual(remainingFields, fieldsFromSource)) {
      setWith(body, '_source.includes', remainingFields, (nsValue) => {
        return isObject(nsValue) ? {} : nsValue;
      });
    }

    const builtQuery = this.getBuiltEsQuery({
      index,
      query: searchRequest.query,
      filters: searchRequest.filters,
      getConfig,
      sort: body.sort,
    });

    const bodyToReturn = {
      ...searchRequest.body,
      pit: searchRequest.pit,
      query: builtQuery,
      highlight:
        searchRequest.highlightAll && builtQuery
          ? getHighlightRequest(getConfig(UI_SETTINGS.DOC_HIGHLIGHT))
          : undefined,
      // remove _source, since everything's coming from fields API, scripted, or stored fields
      _source: fieldListProvided && !sourceFieldsProvided ? false : body._source,
      stored_fields:
        fieldListProvided || sourceFieldsProvided ? [...new Set(remainingFields)] : ['*'],
      runtime_mappings: runtimeFields,
      script_fields: scriptedFields,
      fields: this.getFieldsList({
        index,
        fields,
        docvalueFields: body.docvalue_fields,
        fieldsFromSource,
        filteredDocvalueFields,
        metaFields,
        fieldListProvided,
        sourceFieldsProvided,
      }),
    };

    return omitByIsNil({
      ...searchRequest,
      body: omitByIsNil(bodyToReturn),
      indexType: this.getIndexType(index),
      highlightAll:
        searchRequest.highlightAll && builtQuery ? undefined : searchRequest.highlightAll,
    });
  }

  private getFieldFilter({
    bodySourceExcludes,
    metaFields,
  }: {
    bodySourceExcludes: string[];
    metaFields: string[];
  }) {
    const filter = fieldWildcardFilter(bodySourceExcludes, metaFields);
    return (fieldsToFilter: SearchFieldValue[]) =>
      fieldsToFilter.filter((fld) => filter(this.getFieldName(fld)));
  }

  private getUniqueFieldNames({
    fields,
    fieldsFromSource,
  }: {
    fields: SearchFieldValue[];
    fieldsFromSource: SearchFieldValue[];
  }) {
    const bodyFieldNames = fields.map((field) => this.getFieldName(field));
    return [...new Set([...bodyFieldNames, ...fieldsFromSource])];
  }

  private filterScriptFields({
    uniqFieldNames,
    scriptFields,
  }: {
    uniqFieldNames: SearchFieldValue[];
    scriptFields: Record<string, estypes.ScriptField>;
  }) {
    return uniqFieldNames.includes('*')
      ? scriptFields
      : // filter down script_fields to only include items specified
        pick(
          scriptFields,
          Object.keys(scriptFields).filter((f) => uniqFieldNames.includes(f))
        );
  }

  private getBuiltEsQuery({ index, query = [], filters = [], getConfig, sort }: SearchRequest) {
    // If sorting by _score, build queries in the "must" clause instead of "filter" clause to enable scoring
    const filtersInMustClause = (sort ?? []).some((srt: EsQuerySortValue[]) =>
      srt.hasOwnProperty('_score')
    );
    const esQueryConfigs = {
      ...getEsQueryConfig({ get: getConfig }),
      filtersInMustClause,
    };
    return buildEsQuery(index, query, filters, esQueryConfigs);
  }

  private getRemainingFields({
    uniqFieldNames,
    scriptFields,
    runtimeFields,
    _source,
  }: {
    uniqFieldNames: SearchFieldValue[];
    scriptFields: Record<string, estypes.ScriptField>;
    runtimeFields: estypes.MappingRuntimeFields;
    _source: estypes.MappingSourceField;
  }) {
    return difference(uniqFieldNames, [
      ...Object.keys(scriptFields),
      ...Object.keys(runtimeFields),
    ]).filter((remainingField) => {
      if (!remainingField) return false;
      if (!_source || !_source.excludes) return true;
      return !_source.excludes.includes(remainingField as string);
    });
  }

  private getFieldsList({
    index,
    fields,
    docvalueFields,
    fieldsFromSource,
    filteredDocvalueFields,
    metaFields,
    fieldListProvided,
    sourceFieldsProvided,
  }: {
    index?: DataView;
    fields: SearchFieldValue[];
    docvalueFields: Array<{ field: string; format: string }>;
    fieldsFromSource: SearchFieldValue[];
    filteredDocvalueFields: SearchFieldValue[];
    metaFields: string[];
    fieldListProvided: boolean;
    sourceFieldsProvided: boolean;
  }) {
    if (fieldListProvided || sourceFieldsProvided) {
      // if items that are in the docvalueFields are provided, we should
      // make sure those are added to the fields API unless they are
      // already set in docvalue_fields
      if (!sourceFieldsProvided) {
        return this.getUniqueFields({
          index,
          fields,
          metaFields,
          filteredDocvalueFields,
        });
      }
      return [
        ...fields,
        ...filteredDocvalueFields.filter((fld) => {
          const fldName = this.getFieldName(fld);
          return (
            fieldsFromSource.includes(fldName) &&
            !(docvalueFields || []).map((d) => this.getFieldName(d)).includes(fldName)
          );
        }),
      ];
    }

    return fields;
  }

  private getUniqueFields({
    index,
    fields,
    metaFields,
    filteredDocvalueFields,
  }: {
    index?: DataView;
    fields: SearchFieldValue[];
    metaFields: string[];
    filteredDocvalueFields: SearchFieldValue[];
  }) {
    const bodyFields = this.getFieldsWithoutSourceFilters(index, fields);
    // if items that are in the docvalueFields are provided, we should
    // inject the format from the computed fields if one isn't given
    const docvaluesIndex = keyBy(filteredDocvalueFields, 'field');
    const docValuesIndexKeys = new Set(Object.keys(docvaluesIndex));

    const uniqueFieldNames = new Set();
    const uniqueFields = [];
    for (const field of bodyFields.concat(filteredDocvalueFields)) {
      const fieldName = this.getFieldName(field);
      if (metaFields.includes(fieldName) || uniqueFieldNames.has(fieldName)) {
        continue;
      }
      uniqueFieldNames.add(fieldName);
      if (docValuesIndexKeys.has(fieldName)) {
        // either provide the field object from computed docvalues,
        // or merge the user-provided field with the one in docvalues
        uniqueFields.push(
          typeof field === 'string'
            ? docvaluesIndex[field]
            : this.getFieldFromDocValueFieldsOrIndexPattern(docvaluesIndex, field, index)
        );
      } else {
        uniqueFields.push(field);
      }
    }
    return uniqueFields;
  }

  /**
   * serializes search source fields (which can later be passed to {@link ISearchStartSearchSource})
   */
  public getSerializedFields(recurse = false): SerializedSearchSourceFields {
    const {
      filter: originalFilters,
      aggs: searchSourceAggs,
      parent,
      size: omit,
      sort,
      index,
      ...searchSourceFields
    } = this.getFields();

    let serializedSearchSourceFields: SerializedSearchSourceFields = {
      ...searchSourceFields,
    };
    if (index) {
      serializedSearchSourceFields.index = index.isPersisted() ? index.id : index.toMinimalSpec();
    }
    if (sort) {
      serializedSearchSourceFields.sort = !Array.isArray(sort) ? [sort] : sort;
    }
    if (originalFilters) {
      const filters = this.getFilters(originalFilters);
      serializedSearchSourceFields = {
        ...serializedSearchSourceFields,
        filter: filters,
      };
    }
    if (searchSourceAggs) {
      let aggs = searchSourceAggs;
      if (typeof aggs === 'function') {
        aggs = (searchSourceAggs as Function)();
      }
      if (aggs instanceof AggConfigs) {
        serializedSearchSourceFields.aggs = aggs.getAll().map((agg) => agg.serialize());
      } else {
        serializedSearchSourceFields.aggs = aggs as AggConfigSerialized[];
      }
    }
    if (recurse && this.getParent()) {
      serializedSearchSourceFields.parent = this.getParent()!.getSerializedFields(recurse);
    }
    return serializedSearchSourceFields;
  }

  /**
   * Serializes the instance to a JSON string and a set of referenced objects.
   * Use this method to get a representation of the search source which can be stored in a saved object.
   *
   * The references returned by this function can be mixed with other references in the same object,
   * however make sure there are no name-collisions. The references will be named `kibanaSavedObjectMeta.searchSourceJSON.index`
   * and `kibanaSavedObjectMeta.searchSourceJSON.filter[<number>].meta.index`.
   *
   * Using `createSearchSource`, the instance can be re-created.
   * @public */
  public serialize() {
    const [searchSourceFields, references] = extractReferences(this.getSerializedFields());
    return { searchSourceJSON: JSON.stringify(searchSourceFields), references };
  }

  private getFilters(filterField: SearchSourceFields['filter']): Filter[] {
    if (!filterField) {
      return [];
    }

    if (Array.isArray(filterField)) {
      return filterField;
    }

    if (isFunction(filterField)) {
      return this.getFilters(filterField());
    }

    return [filterField];
  }

  /**
   * Generates an expression abstract syntax tree using the fields set in the current search source and its ancestors.
   * The produced expression from the returned AST will return the `datatable` structure.
   * If the `asDatatable` option is truthy or omitted, the generator will use the `esdsl` function to perform the search.
   * When the `aggs` field is present, it will use the `esaggs` function instead.
   */
  toExpressionAst({ asDatatable = true }: ExpressionAstOptions = {}): ExpressionAstExpression {
    const searchRequest = this.mergeProps();
    const { body, index, query } = searchRequest;

    const filters = (
      typeof searchRequest.filters === 'function' ? searchRequest.filters() : searchRequest.filters
    ) as Filter[] | Filter | undefined;

    const ast = buildExpression([
      buildExpressionFunction<ExpressionFunctionKibanaContext>('kibana_context', {
        q: query?.map(queryToAst),
        filters: filters && filtersToAst(filters),
      }),
    ]).toAst();

    if (!asDatatable) {
      return ast;
    }

    const aggsField = this.getField('aggs');
    const aggs = (typeof aggsField === 'function' ? aggsField() : aggsField) as
      | AggConfigs
      | AggConfigSerialized[]
      | undefined;
    const aggConfigs =
      aggs instanceof AggConfigs
        ? aggs
        : index && aggs && this.dependencies.aggs.createAggConfigs(index, aggs);

    if (aggConfigs) {
      ast.chain.push(...aggConfigs.toExpressionAst().chain);
    } else {
      ast.chain.push(
        buildExpressionFunction<EsdslExpressionFunctionDefinition>('esdsl', {
          size: body?.size,
          dsl: JSON.stringify({}),
          index: index?.id,
        }).toAst()
      );
    }

    return ast;
  }

  parseActiveIndexPatternFromQueryString(queryString: string): string[] {
    let m;
    const indexPatternSet: Set<string> = new Set();
    const regex = /\s?(_index)\s?:\s?[\'\"]?(\w+\-?\*?)[\'\"]?\s?(\w+)?/g;

    while ((m = regex.exec(queryString)) !== null) {
      // This is necessary to avoid infinite loops with zero-width matches
      if (m.index === regex.lastIndex) {
        regex.lastIndex++;
      }

      m.forEach((match, groupIndex) => {
        if (groupIndex === 2) {
          indexPatternSet.add(match);
        }
      });
    }

    return [...indexPatternSet];
  }
}
