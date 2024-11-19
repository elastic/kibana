/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Subscription } from 'rxjs';

import type { IUiSettingsClient } from '@kbn/core/public';
import type { ExpressionsServiceSetup } from '@kbn/expressions-plugin/common';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { DataViewsContract } from '@kbn/data-views-plugin/common';
import {
  aggsRequiredUiSettings,
  AggsCommonStartDependencies,
  AggsCommonService,
} from '../../../common/search/aggs';
import { calculateBounds, TimeRange } from '../../../common';
import type { AggsSetup, AggsStart } from './types';
import type { NowProviderInternalContract } from '../../now_provider';

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
  uiSettings: IUiSettingsClient;
  registerFunction: ExpressionsServiceSetup['registerFunction'];
  nowProvider: NowProviderInternalContract;
}

/** @internal */
export interface AggsStartDependencies {
  fieldFormats: FieldFormatsStart;
  indexPatterns: DataViewsContract;
}

/**
 * The aggs service provides a means of modeling and manipulating the various
 * Elasticsearch aggregations supported by Kibana, providing the ability to
 * output the correct DSL when you are ready to send your request to ES.
 */
export class AggsService {
  private readonly aggsCommonService = new AggsCommonService({
    shouldDetectTimeZone: true,
  });
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

    return this.aggsCommonService.setup({
      registerFunction,
    });
  }

  public start({ indexPatterns, fieldFormats }: AggsStartDependencies): AggsStart {
    const { calculateAutoTimeExpression, types, createAggConfigs } = this.aggsCommonService.start({
      getConfig: this.getConfig!,
      getIndexPattern: indexPatterns.get,
      calculateBounds: this.calculateBounds,
      fieldFormats,
    });

    return {
      calculateAutoTimeExpression,
      createAggConfigs,
      types,
    };
  }

  public stop() {
    this.subscriptions.forEach((s) => s.unsubscribe());
    this.subscriptions = [];
  }
}
