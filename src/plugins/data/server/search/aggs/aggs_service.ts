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

import { pick } from 'lodash';

import {
  UiSettingsServiceStart,
  SavedObjectsClientContract,
  ElasticsearchClient,
} from 'src/core/server';
import { ExpressionsServiceSetup } from 'src/plugins/expressions/common';
import {
  AggsCommonService,
  AggConfigs,
  AggTypesDependencies,
  aggsRequiredUiSettings,
  calculateBounds,
  TimeRange,
} from '../../../common';
import { FieldFormatsStart } from '../../field_formats';
import { IndexPatternsServiceStart } from '../../index_patterns';
import { AggsSetup, AggsStart } from './types';

/** @internal */
export interface AggsSetupDependencies {
  registerFunction: ExpressionsServiceSetup['registerFunction'];
}

/** @internal */
export interface AggsStartDependencies {
  fieldFormats: FieldFormatsStart;
  uiSettings: UiSettingsServiceStart;
  indexPatterns: IndexPatternsServiceStart;
}

/**
 * The aggs service provides a means of modeling and manipulating the various
 * Elasticsearch aggregations supported by Kibana, providing the ability to
 * output the correct DSL when you are ready to send your request to ES.
 */
export class AggsService {
  private readonly aggsCommonService = new AggsCommonService();

  /**
   * getForceNow uses window.location on the client, so we must have a
   * separate implementation of calculateBounds on the server.
   */
  private calculateBounds = (timeRange: TimeRange) => calculateBounds(timeRange, {});

  public setup({ registerFunction }: AggsSetupDependencies): AggsSetup {
    return this.aggsCommonService.setup({ registerFunction });
  }

  public start({ fieldFormats, uiSettings, indexPatterns }: AggsStartDependencies): AggsStart {
    return {
      asScopedToClient: async (
        savedObjectsClient: SavedObjectsClientContract,
        elasticsearchClient: ElasticsearchClient
      ) => {
        const uiSettingsClient = uiSettings.asScopedToClient(savedObjectsClient);
        const formats = await fieldFormats.fieldFormatServiceFactory(uiSettingsClient);

        // cache ui settings, only including items which are explicitly needed by aggs
        const uiSettingsCache = pick(await uiSettingsClient.getAll(), aggsRequiredUiSettings);
        const getConfig = <T = any>(key: string): T => {
          return uiSettingsCache[key];
        };
        const isDefaultTimezone = () => getConfig('dateFormat:tz') === 'Browser';

        const {
          calculateAutoTimeExpression,
          getDateMetaByDatatableColumn,
          types,
        } = this.aggsCommonService.start({
          getConfig,
          getIndexPattern: (
            await indexPatterns.indexPatternsServiceFactory(savedObjectsClient, elasticsearchClient)
          ).get,
          isDefaultTimezone,
        });

        const aggTypesDependencies: AggTypesDependencies = {
          calculateBounds: this.calculateBounds,
          getConfig,
          getFieldFormatsStart: () => ({
            deserialize: formats.deserialize,
            getDefaultInstance: formats.getDefaultInstance,
          }),
          /**
           * Date histogram and date range need to know whether we are using the
           * default timezone, but `isDefault` is not currently offered on the
           * server, so we need to manually check for the default value.
           */
          isDefaultTimezone,
        };

        const typesRegistry = {
          get: (name: string) => {
            const type = types.get(name);
            if (!type) {
              return;
            }
            return type(aggTypesDependencies);
          },
          getAll: () => {
            return {
              // initialize each agg type on the fly
              buckets: types.getAll().buckets.map((type) => type(aggTypesDependencies)),
              metrics: types.getAll().metrics.map((type) => type(aggTypesDependencies)),
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
      },
    };
  }

  public stop() {}
}
