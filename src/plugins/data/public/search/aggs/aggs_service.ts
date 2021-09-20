/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Subscription } from 'rxjs';

import { IUiSettingsClient } from 'src/core/public';
import { ExpressionsServiceSetup } from 'src/plugins/expressions/common';
import { FieldFormatsStart } from '../../../../field_formats/public';
import { AggTypesRegistryStart, calculateBounds, TimeRange } from '../../../common';
import {
  AggConfigs,
  AggsCommonService,
  AggsCommonStartDependencies,
  aggsRequiredUiSettings,
} from '../../../common/search/aggs';
import { AggsSetup, AggsStart } from './types';
import { IndexPatternsContract } from '../../index_patterns';
import { NowProviderInternalContract } from '../../now_provider';
import { KbnRegistry, KbnRegistryItemLoader } from '../../../../kibana_utils/common';
import type { BucketAggType } from '../../../common/search/aggs/buckets';
import type { MetricAggType } from '../../../common/search/aggs/metrics';
import type { AggTypesDependencies } from '../../../common/search/aggs/agg_types';
import {
  getAggTypeLoaders,
  getAggTypes,
  getAggTypesFunctions,
} from '../../../common/search/aggs/load_agg_types';

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
  nowProvider: NowProviderInternalContract;
}

/** @internal */
export interface AggsStartDependencies {
  fieldFormats: FieldFormatsStart;
  uiSettings: IUiSettingsClient;
  indexPatterns: IndexPatternsContract;
}

type InitializedAggTypeItem = (BucketAggType | MetricAggType) & { id: string };
type InitializedAggTypeLoader = KbnRegistryItemLoader<InitializedAggTypeItem> & { type: string };

/**
 * The aggs service provides a means of modeling and manipulating the various
 * Elasticsearch aggregations supported by Kibana, providing the ability to
 * output the correct DSL when you are ready to send your request to ES.
 */
export class AggsService {
  private readonly aggsCommonService = new AggsCommonService();
  private readonly initializedAggTypes = new KbnRegistry<
    InitializedAggTypeItem,
    InitializedAggTypeLoader
  >();
  private getConfig?: AggsCommonStartDependencies['getConfig'];
  private subscriptions: Subscription[] = [];
  private nowProvider!: NowProviderInternalContract;

  /**
   * NowGetter uses window.location, so we must have a separate implementation
   * of calculateBounds on the client and the server.
   */
  private calculateBounds = (timeRange: TimeRange) =>
    calculateBounds(timeRange, { forceNow: this.nowProvider.get() });

  public setup({ registerFunction, uiSettings, nowProvider }: AggsSetupDependencies): AggsSetup {
    this.nowProvider = nowProvider;
    this.getConfig = createGetConfig(uiSettings, aggsRequiredUiSettings, this.subscriptions);

    const aggs = this.aggsCommonService.setup();

    // register each agg type
    const aggTypes = getAggTypes();
    aggTypes.buckets.forEach(({ name, fn }) => aggs.types.registerBucket(name, fn));

    const aggTypeLoaders = getAggTypeLoaders();

    aggTypeLoaders.metrics.forEach((loader) => {
      Object.assign(loader.fn, { id: loader.name });
      aggs.types.registerMetric(loader.name, loader.fn);
    });

    // register expression functions for each agg type
    const aggFunctions = getAggTypesFunctions();
    aggFunctions.forEach((fn) => registerFunction(fn));

    return aggs;
  }

  public start({ fieldFormats, uiSettings, indexPatterns }: AggsStartDependencies): AggsStart {
    const isDefaultTimezone = () => uiSettings.isDefault('dateFormat:tz');

    const { calculateAutoTimeExpression, datatableUtilities, types } = this.aggsCommonService.start(
      {
        getConfig: this.getConfig!,
        getIndexPattern: indexPatterns.get,
        isDefaultTimezone,
      }
    );

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
      const aggOrLoader = type(aggTypesDependencies);
      aggOrLoader.id = aggOrLoader.id || aggOrLoader.name;
      this.initializedAggTypes.register(aggOrLoader);
    });
    types.getAll().metrics.forEach((type) => {
      const aggOrLoader = type(aggTypesDependencies);
      if (typeof aggOrLoader === 'function') {
        this.initializedAggTypes.register({
          id: type.id,
          load: aggOrLoader,
          type: 'metrics',
        });
      } else {
        this.initializedAggTypes.register({
          id: aggOrLoader.name,
          ...aggOrLoader,
        });
      }
    });

    const typesRegistry: AggTypesRegistryStart & { preloadAll: () => Promise<void> } = {
      preloadAll: async () => {
        await this.initializedAggTypes.preloadAll();
      },
      get: (name: string) => {
        return this.initializedAggTypes.get(name) as BucketAggType<any> | MetricAggType<any>;
      },
      getAll: () => {
        return {
          buckets: Array.from(this.initializedAggTypes.getAll()).filter(
            (agg) => agg.type === 'buckets'
          ) as Array<BucketAggType<any>>,
          metrics: Array.from(this.initializedAggTypes.getAll()).filter(
            (agg) => agg.type === 'metrics'
          ) as Array<MetricAggType<any>>,
        };
      },
    };

    return {
      calculateAutoTimeExpression,
      datatableUtilities,
      createAggConfigs: (indexPattern, configStates = []) => {
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
