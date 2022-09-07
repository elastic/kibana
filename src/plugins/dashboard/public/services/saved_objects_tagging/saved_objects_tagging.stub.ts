/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginServiceFactory } from '@kbn/presentation-util-plugin/public';
import { taggingApiMock } from '@kbn/saved-objects-tagging-oss-plugin/public/mocks';
import { DashboardSavedObjectsTaggingService } from './types';

type SavedObjectsTaggingServiceFactory = PluginServiceFactory<DashboardSavedObjectsTaggingService>;

export const savedObjectsTaggingServiceFactory: SavedObjectsTaggingServiceFactory = () => {
  const pluginMock = taggingApiMock.createUi();

  return {
    hasApi: true,

    // I'm not defining components so that I don't have to update the snapshot of `save_modal.test`
    // However, if it's ever necessary, it can be done via: `components: pluginMock.components`,
    getSearchBarFilter: pluginMock.getSearchBarFilter,
    getTableColumnDefinition: pluginMock.getTableColumnDefinition,
    hasTagDecoration: pluginMock.hasTagDecoration,
    parseSearchQuery: pluginMock.parseSearchQuery,
  };
};
