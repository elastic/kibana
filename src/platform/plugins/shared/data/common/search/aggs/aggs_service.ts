/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExpressionsServiceSetup } from '@kbn/expressions-plugin/common';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { FieldFormatsStartCommon } from '@kbn/field-formats-plugin/common';
import { UI_SETTINGS, AggTypesDependencies } from '../..';
import { GetConfigFn } from '../../types';
import {
  AggConfigs,
  AggTypesRegistry,
  getAggTypes,
  getAggTypesFunctions,
  getCalculateAutoTimeExpression,
} from '.';
import { AggsCommonSetup, AggsCommonStart } from './types';

/** @internal */
export const aggsRequiredUiSettings = [
  'dateFormat',
  'dateFormat:scaled',
  'dateFormat:tz',
  UI_SETTINGS.HISTOGRAM_BAR_TARGET,
  UI_SETTINGS.HISTOGRAM_MAX_BARS,
  UI_SETTINGS.SEARCH_QUERY_LANGUAGE,
  UI_SETTINGS.QUERY_ALLOW_LEADING_WILDCARDS,
  UI_SETTINGS.QUERY_STRING_OPTIONS,
  UI_SETTINGS.COURIER_IGNORE_FILTER_IF_FIELD_NOT_IN_INDEX,
];

export interface AggsCommonSetupDependencies {
  registerFunction: ExpressionsServiceSetup['registerFunction'];
}

export interface AggsCommonStartDependencies {
  getIndexPattern(id: string): Promise<DataView>;
  getConfig: GetConfigFn;
  fieldFormats: FieldFormatsStartCommon;
  calculateBounds: AggTypesDependencies['calculateBounds'];
}

/**
 * The aggs service provides a means of modeling and manipulating the various
 * Elasticsearch aggregations supported by Kibana, providing the ability to
 * output the correct DSL when you are ready to send your request to ES.
 */
export class AggsCommonService {
  private readonly aggTypesRegistry = new AggTypesRegistry();

  constructor(private aggExecutionContext?: AggTypesDependencies['aggExecutionContext']) {}

  public setup({ registerFunction }: AggsCommonSetupDependencies): AggsCommonSetup {
    const aggTypesSetup = this.aggTypesRegistry.setup();

    // register each agg type
    const aggTypes = getAggTypes();
    aggTypes.buckets.forEach(({ name, fn }) => aggTypesSetup.registerBucket(name, fn));
    aggTypes.metrics.forEach(({ name, fn }) => aggTypesSetup.registerMetric(name, fn));

    // register expression functions for each agg type
    const aggFunctions = getAggTypesFunctions();
    aggFunctions.forEach((fn) => registerFunction(fn));

    return {
      types: aggTypesSetup,
    };
  }

  public start({
    getConfig,
    fieldFormats,
    calculateBounds,
  }: AggsCommonStartDependencies): AggsCommonStart {
    const aggTypesStart = this.aggTypesRegistry.start({
      getConfig,
      getFieldFormatsStart: () => fieldFormats,
      aggExecutionContext: this.aggExecutionContext,
      calculateBounds,
    });

    return {
      types: aggTypesStart,
      calculateAutoTimeExpression: getCalculateAutoTimeExpression(getConfig),
      createAggConfigs: (indexPattern, configStates, options) =>
        new AggConfigs(
          indexPattern,
          configStates,
          {
            ...options,
            typesRegistry: aggTypesStart,
            aggExecutionContext: this.aggExecutionContext,
          },
          getConfig
        ),
    };
  }
}
