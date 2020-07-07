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
import { FieldFormatsStartCommon } from '../../field_formats';
import {
  getAggTypes,
  getAggTypesFunctions,
  AggTypesRegistry,
  AggConfigs,
  getCalculateAutoTimeExpression,
} from './';
import { AggsSetup, AggsStart } from './types';
import { CalculateBoundsFn } from './buckets/date_histogram';

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
export interface AggsServiceSetupDependencies {
  calculateBounds: CalculateBoundsFn;
  getConfig: <T = any>(key: string) => T;
  getFieldFormatsStart: () => Pick<FieldFormatsStartCommon, 'deserialize' | 'getDefaultInstance'>;
  isDefaultTimezone: () => boolean;
  registerFunction: ExpressionsServiceSetup['registerFunction'];
}

/** @internal */
export interface AggsServiceStartDependencies {
  getConfig: <T = any>(key: string) => T;
}

/**
 * The aggs service provides a means of modeling and manipulating the various
 * Elasticsearch aggregations supported by Kibana, providing the ability to
 * output the correct DSL when you are ready to send your request to ES.
 */
export class AggsService {
  private readonly aggTypesRegistry = new AggTypesRegistry();

  public setup({
    calculateBounds,
    getConfig,
    getFieldFormatsStart,
    isDefaultTimezone,
    registerFunction,
  }: AggsServiceSetupDependencies): AggsSetup {
    const aggTypesSetup = this.aggTypesRegistry.setup();

    // register each agg type
    const aggTypes = getAggTypes({
      calculateBounds,
      getFieldFormatsStart,
      getConfig,
      isDefaultTimezone,
    });
    aggTypes.buckets.forEach((b) => aggTypesSetup.registerBucket(b));
    aggTypes.metrics.forEach((m) => aggTypesSetup.registerMetric(m));

    // register expression functions for each agg type
    const aggFunctions = getAggTypesFunctions();
    aggFunctions.forEach((fn) => registerFunction(fn));

    return {
      calculateAutoTimeExpression: getCalculateAutoTimeExpression(getConfig),
      types: aggTypesSetup,
    };
  }

  public start({ getConfig }: AggsServiceStartDependencies): AggsStart {
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

  public stop() {}
}
