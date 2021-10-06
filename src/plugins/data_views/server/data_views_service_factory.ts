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
} from 'kibana/server';
import { DataViewsService } from '../common';
import { FieldFormatsStart } from '../../field_formats/server';
import { UiSettingsServerToCommon } from './ui_settings_wrapper';
import { IndexPatternsApiServer } from './index_patterns_api_client';
import { SavedObjectsClientServerToCommon } from './saved_objects_client_wrapper';

export const dataViewsServiceFactory =
  ({
    logger,
    uiSettings,
    fieldFormats,
  }: {
    logger: Logger;
    uiSettings: UiSettingsServiceStart;
    fieldFormats: FieldFormatsStart;
  }) =>
  async (
    savedObjectsClient: SavedObjectsClientContract,
    elasticsearchClient: ElasticsearchClient
  ) => {
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
    });
  };
