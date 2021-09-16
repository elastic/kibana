/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
  SavedObjectsClientContract,
  ElasticsearchClient,
  UiSettingsServiceStart,
} from 'kibana/server';
import { ExpressionsServerSetup } from 'src/plugins/expressions/server';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { DataPluginStart } from '../plugin';
import { registerRoutes } from './routes';
import { indexPatternSavedObjectType } from '../saved_objects';
import { capabilitiesProvider } from './capabilities_provider';
import { IndexPatternsCommonService } from '../';
import { FieldFormatsStart } from '../../../field_formats/server';
import { getIndexPatternLoad } from './expressions';
import { UiSettingsServerToCommon } from './ui_settings_wrapper';
import { IndexPatternsApiServer } from './index_patterns_api_client';
import { SavedObjectsClientServerToCommon } from './saved_objects_client_wrapper';
import { registerIndexPatternsUsageCollector } from './register_index_pattern_usage_collection';
import { createScriptedFieldsDeprecationsConfig } from './deprecations';

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
