/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ISearchOptions, ISearchSource } from 'src/plugins/data/public';
import { ExpressionAstExpression } from 'src/plugins/expressions/common';
import { IAggConfigs } from '../agg_configs';
import { IAggConfig } from '../agg_config';

export class BaseParamType<TAggConfig extends IAggConfig = IAggConfig> {
  name: string;
  type: string;
  displayName: string;
  required: boolean;
  advanced: boolean;
  default: any;
  write: (
    aggConfig: TAggConfig,
    output: Record<string, any>,
    aggConfigs?: IAggConfigs,
    locals?: Record<string, any>
  ) => void;
  serialize: (value: any, aggConfig?: TAggConfig) => any;
  deserialize: (value: any, aggConfig?: TAggConfig) => any;
  toExpressionAst?: (value: any) => ExpressionAstExpression[] | ExpressionAstExpression | undefined;
  options: any[];
  valueType?: any;

  onChange?(agg: TAggConfig): void;
  shouldShow?(agg: TAggConfig): boolean;

  /**
   *  A function that will be called before an aggConfig is serialized and sent to ES.
   *  Allows aggConfig to retrieve values needed for serialization
   *  Example usage: an aggregation needs to know the min/max of a field to determine an appropriate interval
   *
   *  @param {AggConfig} aggConfig
   *  @param {Courier.SearchSource} searchSource
   *  @returns {Promise<undefined>|undefined}
   */
  modifyAggConfigOnSearchRequestStart: (
    aggConfig: TAggConfig,
    searchSource?: ISearchSource,
    options?: ISearchOptions
  ) => void;

  constructor(config: Record<string, any>) {
    this.name = config.name;
    this.type = config.type;
    this.displayName = config.displayName || this.name;
    this.required = config.required === true;
    this.advanced = config.advanced || false;
    this.onChange = config.onChange;
    this.shouldShow = config.shouldShow;
    this.default = config.default;

    const defaultWrite = (aggConfig: TAggConfig, output: Record<string, any>) => {
      if (aggConfig.params[this.name]) {
        output.params[this.name] = aggConfig.params[this.name] || this.default;
      }
    };

    this.write = config.write || defaultWrite;
    this.serialize = config.serialize;
    this.deserialize = config.deserialize;
    this.toExpressionAst = config.toExpressionAst;
    this.options = config.options;
    this.modifyAggConfigOnSearchRequestStart =
      config.modifyAggConfigOnSearchRequestStart || function () {};
    this.valueType = config.valueType || config.type;
  }
}
