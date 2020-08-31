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

import { constant, noop, identity } from 'lodash';
import { i18n } from '@kbn/i18n';

import { ISearchSource } from 'src/plugins/data/public';
import { SerializedFieldFormat } from 'src/plugins/expressions/common';
import type { RequestAdapter } from 'src/plugins/inspector/common';

import { initParams } from './agg_params';
import { AggConfig } from './agg_config';
import { IAggConfigs } from './agg_configs';
import { BaseParamType } from './param_types/base';
import { AggParamType } from './param_types/agg';

export interface AggTypeConfig<
  TAggConfig extends AggConfig = AggConfig,
  TParam extends AggParamType<TAggConfig> = AggParamType<TAggConfig>
> {
  name: string;
  title: string;
  createFilter?: (aggConfig: TAggConfig, key: any, params?: any) => any;
  type?: string;
  dslName?: string;
  expressionName?: string;
  makeLabel?: ((aggConfig: TAggConfig) => string) | (() => string);
  ordered?: any;
  hasNoDsl?: boolean;
  params?: Array<Partial<TParam>>;
  getRequestAggs?: ((aggConfig: TAggConfig) => TAggConfig[]) | (() => TAggConfig[] | void);
  getResponseAggs?: ((aggConfig: TAggConfig) => TAggConfig[]) | (() => TAggConfig[] | void);
  customLabels?: boolean;
  json?: boolean;
  decorateAggConfig?: () => any;
  postFlightRequest?: (
    resp: any,
    aggConfigs: IAggConfigs,
    aggConfig: TAggConfig,
    searchSource: ISearchSource,
    inspectorRequestAdapter: RequestAdapter,
    abortSignal?: AbortSignal
  ) => Promise<any>;
  getSerializedFormat?: (agg: TAggConfig) => SerializedFieldFormat;
  getValue?: (agg: TAggConfig, bucket: any) => any;
  getKey?: (bucket: any, key: any, agg: TAggConfig) => any;
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
   * TODO: this should probably be a required field.
   *
   * @property name
   * @type {string}
   */
  expressionName?: string;
  /**
   * the user friendly name that will be shown in the ui for this aggType
   *
   * @property title
   * @type {string}
   */
  title: string;
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
  /**
   * A function that needs to be called after the main request has been made
   * and should return an updated response
   * @param aggConfigs - agg config array used to produce main request
   * @param aggConfig - AggConfig that requested the post flight request
   * @param searchSourceAggs - SearchSource aggregation configuration
   * @param resp - Response to the main request
   * @param nestedSearchSource - the new SearchSource that will be used to make post flight request
   * @return {Promise}
   */
  postFlightRequest: (
    resp: any,
    aggConfigs: IAggConfigs,
    aggConfig: TAggConfig,
    searchSource: ISearchSource,
    inspectorRequestAdapter: RequestAdapter,
    abortSignal?: AbortSignal
  ) => Promise<any>;
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
    this.makeLabel = config.makeLabel || constant(this.name);
    this.ordered = config.ordered;
    this.hasNoDsl = !!config.hasNoDsl;

    if (config.createFilter) {
      this.createFilter = config.createFilter;
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

    this.getSerializedFormat =
      config.getSerializedFormat ||
      ((agg: TAggConfig) => {
        return agg.params.field ? agg.params.field.format.toJSON() : {};
      });

    this.getValue = config.getValue || ((agg: TAggConfig, bucket: any) => {});
  }
}
