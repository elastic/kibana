/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { pick } from 'lodash';

import type {
  IUiSettingsClient,
  UiSettingsServiceStart,
  SavedObjectsClientContract,
  ElasticsearchClient,
} from '@kbn/core/server';
import { ExpressionsServiceSetup } from '@kbn/expressions-plugin/common';
import { FieldFormatsStart } from '@kbn/field-formats-plugin/server';
import { DataViewsServerPluginStart } from '@kbn/data-views-plugin/server';
import {
  calculateBounds,
  AggsCommonService,
  aggsRequiredUiSettings,
  TimeRange,
} from '../../../common';
import { AggsSetup, AggsStart } from './types';

/** @internal */
export interface AggsSetupDependencies {
  registerFunction: ExpressionsServiceSetup['registerFunction'];
}

/** @internal */
export interface AggsStartDependencies {
  fieldFormats: FieldFormatsStart;
  uiSettings: UiSettingsServiceStart;
  indexPatterns: DataViewsServerPluginStart;
}

async function getConfigFn(uiSettingsClient: IUiSettingsClient) {
  // cache ui settings, only including items which are explicitly needed by aggs
  const uiSettingsCache = pick(await uiSettingsClient.getAll(), aggsRequiredUiSettings);
  return <T = any>(key: string): T => {
    return uiSettingsCache[key];
  };
}

/**
 * The aggs service provides a means of modeling and manipulating the various
 * Elasticsearch aggregations supported by Kibana, providing the ability to
 * output the correct DSL when you are ready to send your request to ES.
 */
export class AggsService {
  private readonly aggsCommonService = new AggsCommonService({ shouldDetectTimeZone: false });

  /**
   * getForceNow uses window.location on the client, so we must have a
   * separate implementation of calculateBounds on the server.
   */
  private calculateBounds = (timeRange: TimeRange) => calculateBounds(timeRange);

  public setup({ registerFunction }: AggsSetupDependencies): AggsSetup {
    return this.aggsCommonService.setup({
      registerFunction,
    });
  }

  public start({ fieldFormats, uiSettings, indexPatterns }: AggsStartDependencies): AggsStart {
    return {
      asScopedToClient: async (
        savedObjectsClient: SavedObjectsClientContract,
        elasticsearchClient: ElasticsearchClient
      ) => {
        const uiSettingsClient = uiSettings.asScopedToClient(savedObjectsClient);
        const { calculateAutoTimeExpression, types, createAggConfigs } =
          this.aggsCommonService.start({
            getConfig: await getConfigFn(uiSettingsClient),
            fieldFormats: await fieldFormats.fieldFormatServiceFactory(uiSettingsClient),
            getIndexPattern: (
              await indexPatterns.dataViewsServiceFactory(savedObjectsClient, elasticsearchClient)
            ).get,
            calculateBounds: this.calculateBounds,
          });

        return {
          calculateAutoTimeExpression,
          createAggConfigs,
          types,
        };
      },
    };
  }

  public stop() {}
}
