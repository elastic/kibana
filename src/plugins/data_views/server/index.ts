/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema, TypeOf } from '@kbn/config-schema';
import type { PluginConfigDescriptor } from '@kbn/core/server';
export { getFieldByName, findIndexPatternById } from './utils';
export type { FieldDescriptor, RollupIndexCapability } from './fetcher';
export { IndexPatternsFetcher, getCapabilitiesForRollupIndices } from './fetcher';
export type {
  DataViewsServerPluginSetup,
  DataViewsServerPluginStart,
  DataViewsServerPluginSetupDependencies,
  DataViewsServerPluginStartDependencies,
} from './types';

import { PluginInitializerContext } from '@kbn/core/server';
import type { DataViewsServerPlugin } from './plugin';
import { DataViewsServerPluginSetup, DataViewsServerPluginStart } from './types';
export type { dataViewsServiceFactory } from './data_views_service_factory';

/**
 * Static code to be shared externally
 * @public
 */

export async function plugin(initializerContext: PluginInitializerContext) {
  const { DataViewsServerPlugin } = await import('./plugin');
  return new DataViewsServerPlugin(initializerContext);
}

export type {
  DataViewsServerPluginSetup as PluginSetup,
  DataViewsServerPluginStart as PluginStart,
};
export type { DataViewsServerPlugin as Plugin };

const configSchema = schema.object({
  scriptedFieldsEnabled: schema.conditional(
    schema.contextRef('serverless'),
    true,
    schema.boolean({ defaultValue: false }),
    schema.never()
  ),

  dataTiersExcludedForFields: schema.conditional(
    schema.contextRef('serverless'),
    true,
    schema.never(),
    schema.boolean({ defaultValue: true })
  ),
  fieldListCachingEnabled: schema.conditional(
    schema.contextRef('serverless'),
    true,
    schema.boolean({ defaultValue: false }),
    schema.boolean({ defaultValue: true })
  ),
});

type ConfigType = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<ConfigType> = {
  schema: configSchema,
  exposeToBrowser: {
    scriptedFieldsEnabled: true,
  },
};

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
  DATA_VIEW_SWAP_REFERENCES_PATH,
} from './constants';

export type { SERVICE_KEY_TYPE } from './constants';

export type { FieldSpec } from '../common/types';
export { DataViewsService, DataView } from '../common/data_views';
