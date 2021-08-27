/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { Subscription } from 'rxjs';
import type { IUiSettingsClient } from '../../../../../core/public/ui_settings/types';
import type { ExpressionsServiceSetup } from '../../../../expressions/common/service/expressions_services';
import type { FieldFormatsStart } from '../../../../field_formats/public/plugin';
import type { IndexPatternsContract } from '../../../common/index_patterns/index_patterns/index_patterns';
import { calculateBounds } from '../../../common/query/timefilter/get_time';
import type { TimeRange } from '../../../common/query/timefilter/types';
import type { AggsCommonStartDependencies } from '../../../common/search/aggs/aggs_service';
import {
  AggsCommonService,
  aggsRequiredUiSettings,
} from '../../../common/search/aggs/aggs_service';
import { AggConfigs } from '../../../common/search/aggs/agg_configs';
import type { AggTypesDependencies } from '../../../common/search/aggs/agg_types';
import type { AggsStart } from '../../../common/search/aggs/types';
import type { NowProviderInternalContract } from '../../now_provider/now_provider';
import type { AggsSetup } from './types';

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

    return this.aggsCommonService.setup({ registerFunction });
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
