/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { ExpressionsServiceSetup } from 'src/plugins/expressions/common';
import { CreateAggConfigParams, IndexPattern, UI_SETTINGS } from '../../../common';
import { GetConfigFn } from '../../types';
import {
  AggConfigs,
  AggTypesRegistry,
  getAggTypes,
  getAggTypesFunctions,
  getCalculateAutoTimeExpression,
} from './';
import { AggsCommonSetup, AggsCommonStart } from './types';
import { getDateMetaByDatatableColumn } from './utils/time_column_meta';
import { getDatatableColumnUtilities } from './utils/datatable_column_meta';

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

/** @internal */
export interface AggsCommonSetupDependencies {
  registerFunction: ExpressionsServiceSetup['registerFunction'];
}

/** @internal */
export interface AggsCommonStartDependencies {
  getConfig: GetConfigFn;
  getIndexPattern(id: string): Promise<IndexPattern>;
  isDefaultTimezone: () => boolean;
}

/**
 * The aggs service provides a means of modeling and manipulating the various
 * Elasticsearch aggregations supported by Kibana, providing the ability to
 * output the correct DSL when you are ready to send your request to ES.
 */
export class AggsCommonService {
  private readonly aggTypesRegistry = new AggTypesRegistry();

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
    getIndexPattern,
    isDefaultTimezone,
  }: AggsCommonStartDependencies): AggsCommonStart {
    const aggTypesStart = this.aggTypesRegistry.start();
    const calculateAutoTimeExpression = getCalculateAutoTimeExpression(getConfig);

    const createAggConfigs = (
      indexPattern: IndexPattern,
      configStates?: CreateAggConfigParams[]
    ) => {
      return new AggConfigs(indexPattern, configStates, {
        typesRegistry: aggTypesStart,
      });
    };

    return {
      calculateAutoTimeExpression,
      getDateMetaByDatatableColumn: getDateMetaByDatatableColumn({
        calculateAutoTimeExpression,
        getIndexPattern,
        getConfig,
        isDefaultTimezone,
      }),
      datatableUtilities: getDatatableColumnUtilities({
        getIndexPattern,
        createAggConfigs,
        aggTypesStart,
      }),
      createAggConfigs,
      types: aggTypesStart,
    };
  }
}
