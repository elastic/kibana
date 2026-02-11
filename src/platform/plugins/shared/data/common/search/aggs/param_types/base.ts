/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ExpressionAstExpression } from '@kbn/expressions-plugin/common';
import type { ISearchOptions } from '@kbn/search-types';
import type { ISearchSource } from '../../../../public';
import type { IAggConfigs } from '../agg_configs';
import type { IAggConfig } from '../agg_config';

export interface AggParamOutput {
  params: Record<string, unknown>;
  [key: string]: unknown;
}

export class BaseParamType<TAggConfig extends IAggConfig = IAggConfig> {
  name: string;
  type: string;
  displayName: string;
  required: boolean;
  advanced: boolean;
  default: unknown;
  write: (
    aggConfig: TAggConfig,
    output: AggParamOutput,
    aggConfigs?: IAggConfigs,
    locals?: Record<string, unknown>
  ) => void;
  serialize: (value: unknown, aggConfig?: TAggConfig) => unknown;
  deserialize: (value: unknown, aggConfig?: TAggConfig) => unknown;
  toExpressionAst?: (
    value: unknown
  ) => ExpressionAstExpression[] | ExpressionAstExpression | undefined;
  options: unknown[];
  getValueType: (aggConfig: IAggConfig) => unknown;
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

  constructor(config: Record<string, unknown>) {
    this.name = config.name as string;
    this.type = config.type as string;
    this.displayName = (config.displayName as string) || this.name;
    this.required = config.required === true;
    this.advanced = (config.advanced as boolean) || false;
    this.onChange = config.onChange as TAggConfig extends IAggConfig
      ? ((agg: TAggConfig) => void) | undefined
      : undefined;
    this.shouldShow = config.shouldShow as TAggConfig extends IAggConfig
      ? ((agg: TAggConfig) => boolean) | undefined
      : undefined;
    this.default = config.default;

    const defaultWrite = (aggConfig: TAggConfig, output: AggParamOutput) => {
      if (aggConfig.params[this.name]) {
        output.params[this.name] = aggConfig.params[this.name] || this.default;
      }
    };

    this.write = (config.write as BaseParamType<TAggConfig>['write']) || defaultWrite;
    this.serialize = config.serialize as BaseParamType<TAggConfig>['serialize'];
    this.deserialize = config.deserialize as BaseParamType<TAggConfig>['deserialize'];
    this.toExpressionAst = config.toExpressionAst as BaseParamType<TAggConfig>['toExpressionAst'];
    this.options = config.options as unknown[];
    this.modifyAggConfigOnSearchRequestStart =
      (config.modifyAggConfigOnSearchRequestStart as BaseParamType<TAggConfig>['modifyAggConfigOnSearchRequestStart']) ||
      function () {};

    this.getValueType = config.getValueType as BaseParamType<TAggConfig>['getValueType'];
  }
}
