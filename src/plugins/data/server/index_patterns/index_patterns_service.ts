/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { Logger } from '@kbn/logging';
import type { CoreSetup, CoreStart } from '../../../../core/server';
import type { ElasticsearchClient } from '../../../../core/server/elasticsearch/client/types';
import type { Plugin } from '../../../../core/server/plugins/types';
import type { SavedObjectsClientContract } from '../../../../core/server/saved_objects/types';
import type { UiSettingsServiceStart } from '../../../../core/server/ui_settings/types';
import type { ExpressionsServerSetup } from '../../../expressions/server/plugin';
import type { FieldFormatsStart } from '../../../field_formats/server/types';
import type { UsageCollectionSetup } from '../../../usage_collection/server/plugin';
import { IndexPatternsService as IndexPatternsCommonService } from '../../common/index_patterns/index_patterns/index_patterns';
import type { DataPluginStart } from '../plugin';
import { indexPatternSavedObjectType } from '../saved_objects/index_patterns';
import { capabilitiesProvider } from './capabilities_provider';
import { createScriptedFieldsDeprecationsConfig } from './deprecations/scripted_fields';
import { getIndexPatternLoad } from './expressions/load_index_pattern';
import { IndexPatternsApiServer } from './index_patterns_api_client';
import { registerIndexPatternsUsageCollector } from './register_index_pattern_usage_collection';
import { registerRoutes } from './routes';
import { SavedObjectsClientServerToCommon } from './saved_objects_client_wrapper';
import { UiSettingsServerToCommon } from './ui_settings_wrapper';

export interface IndexPatternsServiceStart {
  indexPatternsServiceFactory: (
    savedObjectsClient: SavedObjectsClientContract,
    elasticsearchClient: ElasticsearchClient
  ) => Promise<IndexPatternsCommonService>;
}

export interface IndexPatternsServiceSetupDeps {
  expressions: ExpressionsServerSetup;
  logger: Logger;
  usageCollection?: UsageCollectionSetup;
}

export interface IndexPatternsServiceStartDeps {
  fieldFormats: FieldFormatsStart;
  logger: Logger;
}

export const indexPatternsServiceFactory = ({
  logger,
  uiSettings,
  fieldFormats,
}: {
  logger: Logger;
  uiSettings: UiSettingsServiceStart;
  fieldFormats: FieldFormatsStart;
}) => async (
  savedObjectsClient: SavedObjectsClientContract,
  elasticsearchClient: ElasticsearchClient
) => {
  const uiSettingsClient = uiSettings.asScopedToClient(savedObjectsClient);
  const formats = await fieldFormats.fieldFormatServiceFactory(uiSettingsClient);

  return new IndexPatternsCommonService({
    uiSettings: new UiSettingsServerToCommon(uiSettingsClient),
    savedObjectsClient: new SavedObjectsClientServerToCommon(savedObjectsClient),
    apiClient: new IndexPatternsApiServer(elasticsearchClient, savedObjectsClient),
    fieldFormats: formats,
    onError: (error) => {
      logger.error(error);
    },
    onNotification: ({ title, text }) => {
      logger.warn(`${title}${text ? ` : ${text}` : ''}`);
    },
  });
};

export class IndexPatternsServiceProvider implements Plugin<void, IndexPatternsServiceStart> {
  public setup(
    core: CoreSetup<IndexPatternsServiceStartDeps, DataPluginStart>,
    { expressions, usageCollection }: IndexPatternsServiceSetupDeps
  ) {
    core.savedObjects.registerType(indexPatternSavedObjectType);
    core.capabilities.registerProvider(capabilitiesProvider);

    registerRoutes(core.http, core.getStartServices);

    expressions.registerFunction(getIndexPatternLoad({ getStartServices: core.getStartServices }));
    registerIndexPatternsUsageCollector(core.getStartServices, usageCollection);
    core.deprecations.registerDeprecations(createScriptedFieldsDeprecationsConfig(core));
  }

  public start(core: CoreStart, { fieldFormats, logger }: IndexPatternsServiceStartDeps) {
    const { uiSettings } = core;

    return {
      indexPatternsServiceFactory: indexPatternsServiceFactory({
        logger,
        uiSettings,
        fieldFormats,
      }),
    };
  }
}
