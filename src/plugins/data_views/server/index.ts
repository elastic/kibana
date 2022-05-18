/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export { getFieldByName, findIndexPatternById } from './utils';
export type { FieldDescriptor } from './fetcher';
export {
  IndexPatternsFetcher,
  shouldReadFieldFromDocValues,
  mergeCapabilitiesWithFields,
  getCapabilitiesForRollupIndices,
} from './fetcher';
export type { IndexPatternsServiceStart } from './types';

import { PluginInitializerContext } from '@kbn/core/server';
import { DataViewsServerPlugin } from './plugin';
import { DataViewsServerPluginSetup, DataViewsServerPluginStart } from './types';
export type { dataViewsServiceFactory } from './data_views_service_factory';

/**
 * Static code to be shared externally
 * @public
 */

export function plugin(initializerContext: PluginInitializerContext) {
  return new DataViewsServerPlugin(initializerContext);
}

export type {
  DataViewsServerPluginSetup as PluginSetup,
  DataViewsServerPluginStart as PluginStart,
};
export { DataViewsServerPlugin as Plugin };

export {
  SERVICE_PATH,
  SERVICE_PATH_LEGACY,
  DATA_VIEW_PATH,
  DATA_VIEW_PATH_LEGACY,
  SPECIFIC_DATA_VIEW_PATH,
  SPECIFIC_DATA_VIEW_PATH_LEGACY,
  RUNTIME_FIELD_PATH,
  RUNTIME_FIELD_PATH_LEGACY,
  SPECIFIC_RUNTIME_FIELD_PATH,
  SPECIFIC_RUNTIME_FIELD_PATH_LEGACY,
  SCRIPTED_FIELD_PATH,
  SCRIPTED_FIELD_PATH_LEGACY,
  SPECIFIC_SCRIPTED_FIELD_PATH,
  SPECIFIC_SCRIPTED_FIELD_PATH_LEGACY,
  SERVICE_KEY,
  SERVICE_KEY_LEGACY,
} from './constants';

export type { SERVICE_KEY_TYPE } from './constants';
