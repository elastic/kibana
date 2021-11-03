/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export { getFieldByName, findIndexPatternById } from './utils';
export {
  IndexPatternsFetcher,
  FieldDescriptor,
  shouldReadFieldFromDocValues,
  mergeCapabilitiesWithFields,
  getCapabilitiesForRollupIndices,
} from './fetcher';
export { IndexPatternsServiceStart } from './types';

import { PluginInitializerContext } from 'src/core/server';
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

export {
  DataViewsServerPlugin as Plugin,
  DataViewsServerPluginSetup as PluginSetup,
  DataViewsServerPluginStart as PluginStart,
};
