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

import { Subscription } from 'rxjs';

import { IUiSettingsClient } from 'src/core/public';
import { ExpressionsServiceSetup } from 'src/plugins/expressions/common';
import { FieldFormatsStart } from '../../field_formats';
import { getForceNow } from '../../query/timefilter/lib/get_force_now';
import { calculateBounds, TimeRange } from '../../../common';
import {
  aggsRequiredUiSettings,
  AggsCommonStartDependencies,
  AggsCommonService,
  AggConfigs,
  AggTypesDependencies,
} from '../../../common/search/aggs';
import { AggsSetup, AggsStart } from './types';
import { IndexPatternsContract } from '../../index_patterns';

/**
 * Aggs needs synchronous access to specific uiSettings. Since settings can change
 * without a page refresh, we create a cache that subscribes to changes from
 * uiSettings.get$ and keeps everything up-to-date.
 *
 * @internal
 */
export function createGetConfig(
  uiSettings: IUiSettingsClient,
  requiredSettings: string[],
  subscriptions: Subscription[]
): AggsCommonStartDependencies['getConfig'] {
  const settingsCache: Record<string, any> = {};

  requiredSettings.forEach((setting) => {
    subscriptions.push(
      uiSettings.get$(setting).subscribe((value) => {
        settingsCache[setting] = value;
      })
    );
  });

  return (key) => settingsCache[key];
}

/** @internal */
export interface AggsSetupDependencies {
  registerFunction: ExpressionsServiceSetup['registerFunction'];
  uiSettings: IUiSettingsClient;
}

/** @internal */
export interface AggsStartDependencies {
  fieldFormats: FieldFormatsStart;
  uiSettings: IUiSettingsClient;
  indexPatterns: IndexPatternsContract;
}

/**
 * The aggs service provides a means of modeling and manipulating the various
 * Elasticsearch aggregations supported by Kibana, providing the ability to
 * output the correct DSL when you are ready to send your request to ES.
 */
export class AggsService {
  private readonly aggsCommonService = new AggsCommonService();
  private readonly initializedAggTypes = new Map();
  private getConfig?: AggsCommonStartDependencies['getConfig'];
  private subscriptions: Subscription[] = [];

  /**
   * getForceNow uses window.location, so we must have a separate implementation
   * of calculateBounds on the client and the server.
   */
  private calculateBounds = (timeRange: TimeRange) =>
    calculateBounds(timeRange, { forceNow: getForceNow() });

  public setup({ registerFunction, uiSettings }: AggsSetupDependencies): AggsSetup {
    this.getConfig = createGetConfig(uiSettings, aggsRequiredUiSettings, this.subscriptions);

    return this.aggsCommonService.setup({ registerFunction });
  }

  public start({ fieldFormats, uiSettings, indexPatterns }: AggsStartDependencies): AggsStart {
    const isDefaultTimezone = () => uiSettings.isDefault('dateFormat:tz');

    const {
      calculateAutoTimeExpression,
      getDateMetaByDatatableColumn,
      types,
    } = this.aggsCommonService.start({
      getConfig: this.getConfig!,
      getIndexPattern: indexPatterns.get,
      isDefaultTimezone,
    });

    const aggTypesDependencies: AggTypesDependencies = {
      calculateBounds: this.calculateBounds,
      getConfig: this.getConfig!,
      getFieldFormatsStart: () => ({
        deserialize: fieldFormats.deserialize,
        getDefaultInstance: fieldFormats.getDefaultInstance,
      }),
      isDefaultTimezone,
    };

    // initialize each agg type and store in memory
    types.getAll().buckets.forEach((type) => {
      const agg = type(aggTypesDependencies);
      this.initializedAggTypes.set(agg.name, agg);
    });
    types.getAll().metrics.forEach((type) => {
      const agg = type(aggTypesDependencies);
      this.initializedAggTypes.set(agg.name, agg);
    });

    const typesRegistry = {
      get: (name: string) => {
        return this.initializedAggTypes.get(name);
      },
      getAll: () => {
        return {
          buckets: Array.from(this.initializedAggTypes.values()).filter(
            (agg) => agg.type === 'buckets'
          ),
          metrics: Array.from(this.initializedAggTypes.values()).filter(
            (agg) => agg.type === 'metrics'
          ),
        };
      },
    };

    return {
      calculateAutoTimeExpression,
      getDateMetaByDatatableColumn,
      createAggConfigs: (indexPattern, configStates = [], schemas) => {
        return new AggConfigs(indexPattern, configStates, { typesRegistry });
      },
      types: typesRegistry,
    };
  }

  public stop() {
    this.subscriptions.forEach((s) => s.unsubscribe());
    this.subscriptions = [];
  }
}
