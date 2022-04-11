/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { constant, noop, identity } from 'lodash';
import { i18n } from '@kbn/i18n';

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ISearchSource } from 'src/plugins/data/public';
import { DatatableColumnType } from 'src/plugins/expressions/common';
import type { RequestAdapter } from 'src/plugins/inspector/common';
import type { SerializedFieldFormat } from 'src/plugins/field_formats/common';

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { initParams } from './agg_params';
import { AggConfig } from './agg_config';
import { IAggConfigs } from './agg_configs';
import { BaseParamType } from './param_types/base';
import { AggParamType } from './param_types/agg';

type PostFlightRequestFn<TAggConfig> = (
  resp: estypes.SearchResponse<any>,
  aggConfigs: IAggConfigs,
  aggConfig: TAggConfig,
  searchSource: ISearchSource,
  inspectorRequestAdapter?: RequestAdapter,
  abortSignal?: AbortSignal,
  searchSessionId?: string
) => Promise<estypes.SearchResponse<any>>;

export interface AggTypeConfig<
  TAggConfig extends AggConfig = AggConfig,
  TParam extends AggParamType<TAggConfig> = AggParamType<TAggConfig>
> {
  name: string;
  title: string;
  createFilter?: (aggConfig: TAggConfig, key: any, params?: any) => any;
  type?: string;
  dslName?: string;
  expressionName: string;
  makeLabel?: ((aggConfig: TAggConfig) => string) | (() => string);
  ordered?: any;
  hasNoDsl?: boolean;
  hasNoDslParams?: boolean;
  params?: Array<Partial<TParam>>;
  valueType?: DatatableColumnType;
  getRequestAggs?: ((aggConfig: TAggConfig) => TAggConfig[]) | (() => TAggConfig[] | void);
  getResponseAggs?: ((aggConfig: TAggConfig) => TAggConfig[]) | (() => TAggConfig[] | void);
  customLabels?: boolean;
  json?: boolean;
  decorateAggConfig?: () => any;
  postFlightRequest?: PostFlightRequestFn<TAggConfig>;
  hasPrecisionError?: (aggBucket: Record<string, unknown>) => boolean;
  getSerializedFormat?: (agg: TAggConfig) => SerializedFieldFormat;
  getValue?: (agg: TAggConfig, bucket: any) => any;
  getKey?: (bucket: any, key: any, agg: TAggConfig) => any;
  getValueBucketPath?: (agg: TAggConfig) => string;
  getResponseId?: (agg: TAggConfig) => string;
}

// TODO need to make a more explicit interface for this
export type IAggType = AggType;

export class AggType<
  TAggConfig extends AggConfig = AggConfig,
  TParam extends AggParamType<TAggConfig> = AggParamType<TAggConfig>
> {
  /**
   * the unique, unchanging, name that we have assigned this aggType
   *
   * @property name
   * @type {string}
   */
  name: string;

  type: string;
  subtype?: string;
  /**
   * the name of the elasticsearch aggregation that this aggType represents. Usually just this.name
   *
   * @property name
   * @type {string}
   */
  dslName: string;
  /**
   * the name of the expression function that this aggType represents.
   *
   * @property name
   * @type {string}
   */
  expressionName: string;
  /**
   * the user friendly name that will be shown in the ui for this aggType
   *
   * @property title
   * @type {string}
   */
  title: string;
  /**
   * The type the values produced by this agg will have in the final data table.
   * If not specified, the type of the field is used.
   */
  valueType?: DatatableColumnType;
  /**
   * a function that will be called when this aggType is assigned to
   * an aggConfig, and that aggConfig is being rendered (in a form, chart, etc.).
   *
   * @method makeLabel
   * @param {AggConfig} aggConfig - an agg config of this type
   * @returns {string} - label that can be used in the ui to describe the aggConfig
   */
  makeLabel: ((aggConfig: TAggConfig) => string) | (() => string);
  /**
   * Describes if this aggType creates data that is ordered, and if that ordered data
   * is some sort of time series.
   *
   * If the aggType does not create ordered data, set this to something "falsy".
   *
   * If this does create orderedData, then the value should be an object.
   *
   * If the orderdata is some sort of time series, `this.ordered` should be an object
   * with the property `date: true`
   *
   * @property ordered
   * @type {object|undefined}
   */
  ordered: any;
  /**
   * Flag that prevents this aggregation from being included in the dsl. This is only
   * used by the count aggregation (currently) since it doesn't really exist and it's output
   * is available on every bucket.
   *
   * @type {Boolean}
   */
  hasNoDsl: boolean;
  /**
   * Flag that prevents params from this aggregation from being included in the dsl. Sibling and parent aggs are still written.
   *
   * @type {Boolean}
   */
  hasNoDslParams: boolean;
  /**
   * The method to create a filter representation of the bucket
   * @param {object} aggConfig The instance of the aggConfig
   * @param {mixed} key The key for the bucket
   * @returns {object} The filter
   */
  createFilter: ((aggConfig: TAggConfig, key: any, params?: any) => any) | undefined;
  /**
   * An instance of {{#crossLink "AggParams"}}{{/crossLink}}.
   *
   * @property params
   * @type {AggParams}
   */
  params: TParam[];
  /**
   * Designed for multi-value metric aggs, this method can return a
   * set of AggConfigs that should replace this aggConfig in requests
   *
   * @method getRequestAggs
   * @returns {array[AggConfig]} - an array of aggConfig objects
   *                                         that should replace this one,
   *                                         or undefined
   */
  getRequestAggs: ((aggConfig: TAggConfig) => TAggConfig[]) | (() => TAggConfig[] | void);
  /**
   * Designed for multi-value metric aggs, this method can return a
   * set of AggConfigs that should replace this aggConfig in result sets
   * that walk the AggConfig set.
   *
   * @method getResponseAggs
   * @returns {array[AggConfig]|undefined} - an array of aggConfig objects
   *                                         that should replace this one,
   *                                         or undefined
   */
  getResponseAggs: ((aggConfig: TAggConfig) => TAggConfig[]) | (() => TAggConfig[] | void);
  /**
   * A function that will be called each time an aggConfig of this type
   * is created, giving the agg type a chance to modify the agg config
   */
  decorateAggConfig: () => any;

  hasPrecisionError?: (aggBucket: Record<string, unknown>) => boolean;

  /**
   * A function that needs to be called after the main request has been made
   * and should return an updated response
   * @param aggConfigs - agg config array used to produce main request
   * @param aggConfig - AggConfig that requested the post flight request
   * @param searchSourceAggs - SearchSource aggregation configuration
   * @param resp - Response to the main request
   * @param nestedSearchSource - the new SearchSource that will be used to make post flight request
   * @param abortSignal - `AbortSignal` to abort the request
   * @param searchSessionId - searchSessionId to be used for grouping requests into a single search session
   * @return {Promise}
   */
  postFlightRequest: PostFlightRequestFn<TAggConfig>;
  /**
   * Get the serialized format for the values produced by this agg type,
   * overridden by several metrics that always output a simple number.
   * You can pass this output to fieldFormatters.deserialize to get
   * the formatter instance.
   *
   * @param  {agg} agg - the agg to pick a format for
   * @return {SerializedFieldFormat}
   */
  getSerializedFormat: (agg: TAggConfig) => SerializedFieldFormat;

  getValue: (agg: TAggConfig, bucket: any) => any;

  getKey?: (bucket: any, key: any, agg: TAggConfig) => any;

  paramByName = (name: string) => {
    return this.params.find((p: TParam) => p.name === name);
  };

  getValueBucketPath = (agg: TAggConfig) => {
    return agg.id;
  };

  splitForTimeShift(agg: TAggConfig, aggs: IAggConfigs) {
    return false;
  }

  /**
   * Returns the key of the object containing the results of the agg in the Elasticsearch response object.
   * In most cases this returns the `agg.id` property, but in some cases the response object is structured differently.
   * In the following example of a terms agg, `getResponseId` returns "myAgg":
   * ```
   * {
   *    "aggregations": {
   *      "myAgg": {
   *        "doc_count_error_upper_bound": 0,
   *        "sum_other_doc_count": 0,
   *        "buckets": [
   * ...
   * ```
   *
   * @param  {agg} agg - the agg to return the id in the ES reponse object for
   * @return {string}
   */
  getResponseId: (agg: TAggConfig) => string;

  /**
   * Generic AggType Constructor
   *
   * Used to create the values exposed by the agg_types module.
   *
   * @class AggType
   * @private
   * @param {object} config - used to set the properties of the AggType
   */
  constructor(config: AggTypeConfig<TAggConfig>) {
    this.name = config.name;
    this.type = config.type || 'metrics';
    this.dslName = config.dslName || config.name;
    this.expressionName = config.expressionName;
    this.title = config.title;
    this.valueType = config.valueType;
    this.makeLabel = config.makeLabel || constant(this.name);
    this.ordered = config.ordered;
    this.hasNoDsl = !!config.hasNoDsl;
    this.hasNoDslParams = !!config.hasNoDslParams;

    if (config.createFilter) {
      this.createFilter = config.createFilter;
    }

    if (config.getValueBucketPath) {
      this.getValueBucketPath = config.getValueBucketPath;
    }

    if (config.params && config.params.length && config.params[0] instanceof BaseParamType) {
      this.params = config.params as TParam[];
    } else {
      // always append the raw JSON param unless it is configured to false
      const params: any[] = config.params ? [...config.params] : [];

      if (config.json !== false) {
        params.push({
          name: 'json',
          type: 'json',
          advanced: true,
        });
      }

      // always append custom label

      if (config.customLabels !== false) {
        params.push({
          name: 'customLabel',
          displayName: i18n.translate('data.search.aggs.string.customLabel', {
            defaultMessage: 'Custom label',
          }),
          type: 'string',
          write: noop,
        });
      }

      this.params = initParams(params);
    }

    this.getRequestAggs = config.getRequestAggs || noop;
    this.getResponseAggs = config.getResponseAggs || (() => {});
    this.decorateAggConfig = config.decorateAggConfig || (() => ({}));
    this.postFlightRequest = config.postFlightRequest || identity;
    this.hasPrecisionError = config.hasPrecisionError;

    this.getSerializedFormat =
      config.getSerializedFormat ||
      ((agg: TAggConfig) => {
        return agg.params.field
          ? agg.aggConfigs.indexPattern.getFormatterForField(agg.params.field).toJSON()
          : {};
      });

    this.getValue = config.getValue || ((agg: TAggConfig, bucket: any) => {});

    this.getResponseId = config.getResponseId || ((agg: TAggConfig) => agg.id);
  }
}
