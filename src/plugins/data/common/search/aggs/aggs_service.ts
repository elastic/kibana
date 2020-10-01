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

import { ExpressionsServiceSetup } from 'src/plugins/expressions/common';
import { UI_SETTINGS } from '../../../common';
import { GetConfigFn } from '../../types';
import {
  AggConfigs,
  AggTypesRegistry,
  getAggTypes,
  getAggTypesFunctions,
  getCalculateAutoTimeExpression,
} from './';
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

/** @internal */
export interface AggsCommonSetupDependencies {
  registerFunction: ExpressionsServiceSetup['registerFunction'];
}

/** @internal */
export interface AggsCommonStartDependencies {
  getConfig: GetConfigFn;
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

  public start({ getConfig }: AggsCommonStartDependencies): AggsCommonStart {
    const aggTypesStart = this.aggTypesRegistry.start();

    return {
      calculateAutoTimeExpression: getCalculateAutoTimeExpression(getConfig),
      createAggConfigs: (indexPattern, configStates = [], schemas) => {
        return new AggConfigs(indexPattern, configStates, {
          typesRegistry: aggTypesStart,
        });
      },
      types: aggTypesStart,
    };
  }
}
