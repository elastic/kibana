/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  Logger,
  SavedObjectsClientContract,
  ElasticsearchClient,
  UiSettingsServiceStart,
  KibanaRequest,
  CoreStart,
} from '@kbn/core/server';
import { FieldFormatsStart } from '@kbn/field-formats-plugin/server';
import { DataViewsService } from '../common';
import { UiSettingsServerToCommon } from './ui_settings_wrapper';
import { IndexPatternsApiServer } from './index_patterns_api_client';
import { SavedObjectsClientServerToCommon } from './saved_objects_client_wrapper';

export const dataViewsServiceFactory = ({
  logger,
  uiSettings,
  fieldFormats,
  capabilities,
}: {
  logger: Logger;
  uiSettings: UiSettingsServiceStart;
  fieldFormats: FieldFormatsStart;
  capabilities: CoreStart['capabilities'];
}) =>
  async function (
    savedObjectsClient: SavedObjectsClientContract,
    elasticsearchClient: ElasticsearchClient,
    request?: KibanaRequest,
    byPassCapabilities?: boolean
  ) {
    const uiSettingsClient = uiSettings.asScopedToClient(savedObjectsClient);
    const formats = await fieldFormats.fieldFormatServiceFactory(uiSettingsClient);

    return new DataViewsService({
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
      getCanSave: async () =>
        byPassCapabilities
          ? true
          : request
          ? (await capabilities.resolveCapabilities(request)).indexPatterns.save === true
          : false,
    });
  };
