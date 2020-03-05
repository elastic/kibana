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

import { CoreSetup, CoreStart } from '../../../../../core/public';
import { IndexPattern } from '../../../../../plugins/data/public';
import {
  aggTypes,
  AggType,
  AggTypesRegistry,
  AggTypesRegistrySetup,
  AggTypesRegistryStart,
  AggConfig,
  AggConfigs,
  CreateAggConfigParams,
  FieldParamType,
  getCalculateAutoTimeExpression,
  MetricAggType,
  aggTypeFieldFilters,
  parentPipelineAggHelper,
  siblingPipelineAggHelper,
} from './aggs';

interface AggsSetup {
  calculateAutoTimeExpression: ReturnType<typeof getCalculateAutoTimeExpression>;
  types: AggTypesRegistrySetup;
}

interface AggsStartLegacy {
  AggConfig: typeof AggConfig;
  AggType: typeof AggType;
  aggTypeFieldFilters: typeof aggTypeFieldFilters;
  FieldParamType: typeof FieldParamType;
  MetricAggType: typeof MetricAggType;
  parentPipelineAggHelper: typeof parentPipelineAggHelper;
  siblingPipelineAggHelper: typeof siblingPipelineAggHelper;
}

interface AggsStart {
  calculateAutoTimeExpression: ReturnType<typeof getCalculateAutoTimeExpression>;
  createAggConfigs: (
    indexPattern: IndexPattern,
    configStates?: CreateAggConfigParams[],
    schemas?: Record<string, any>
  ) => InstanceType<typeof AggConfigs>;
  types: AggTypesRegistryStart;
  __LEGACY: AggsStartLegacy;
}

export interface SearchSetup {
  aggs: AggsSetup;
}

export interface SearchStart {
  aggs: AggsStart;
}

/**
 * The contract provided here is a new platform shim for ui/agg_types.
 *
 * Once it has been refactored to work with new platform services,
 * it will move into the existing search service in src/plugins/data/public/search
 */
export class SearchService {
  private readonly aggTypesRegistry = new AggTypesRegistry();

  public setup(core: CoreSetup): SearchSetup {
    const aggTypesSetup = this.aggTypesRegistry.setup();
    aggTypes.buckets.forEach(b => aggTypesSetup.registerBucket(b));
    aggTypes.metrics.forEach(m => aggTypesSetup.registerMetric(m));

    return {
      aggs: {
        calculateAutoTimeExpression: getCalculateAutoTimeExpression(core.uiSettings),
        types: aggTypesSetup,
      },
    };
  }

  public start(core: CoreStart): SearchStart {
    const aggTypesStart = this.aggTypesRegistry.start();
    return {
      aggs: {
        calculateAutoTimeExpression: getCalculateAutoTimeExpression(core.uiSettings),
        createAggConfigs: (indexPattern, configStates = [], schemas) => {
          return new AggConfigs(indexPattern, configStates, {
            schemas,
            typesRegistry: aggTypesStart,
          });
        },
        types: aggTypesStart,
        __LEGACY: {
          AggConfig, // TODO make static
          AggType,
          aggTypeFieldFilters,
          FieldParamType,
          MetricAggType,
          parentPipelineAggHelper, // TODO make static
          siblingPipelineAggHelper, // TODO make static
        },
      },
    };
  }

  public stop() {}
}
