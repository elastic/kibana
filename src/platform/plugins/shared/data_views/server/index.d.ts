import type { TypeOf } from '@kbn/config-schema';
import type { PluginConfigDescriptor } from '@kbn/core/server';
export { getFieldByName, findIndexPatternById } from './utils';
export type { FieldDescriptor, RollupIndexCapability } from './fetcher';
export { IndexPatternsFetcher, getCapabilitiesForRollupIndices } from './fetcher';
export type { DataViewsServerPluginSetup, DataViewsServerPluginStart, DataViewsServerPluginSetupDependencies, DataViewsServerPluginStartDependencies, } from './types';
import type { PluginInitializerContext } from '@kbn/core/server';
import type { DataViewsServerPlugin } from './plugin';
import type { DataViewsServerPluginSetup, DataViewsServerPluginStart } from './types';
export type { dataViewsServiceFactory } from './data_views_service_factory';
/**
 * Static code to be shared externally
 * @public
 */
export declare function plugin(initializerContext: PluginInitializerContext): Promise<DataViewsServerPlugin>;
export type { DataViewsServerPluginSetup as PluginSetup, DataViewsServerPluginStart as PluginStart, };
export type { DataViewsServerPlugin as Plugin };
declare const configSchema: import("@kbn/config-schema").ObjectType<{
    scriptedFieldsEnabled: import("@kbn/config-schema").ConditionalType<true, boolean, never>;
    dataTiersExcludedForFields: import("@kbn/config-schema").ConditionalType<true, never, boolean>;
    fieldListCachingEnabled: import("@kbn/config-schema").ConditionalType<true, boolean, boolean>;
    hasEsDataTimeout: import("@kbn/config-schema").Type<number>;
}>;
type ConfigType = TypeOf<typeof configSchema>;
export declare const config: PluginConfigDescriptor<ConfigType>;
export { SERVICE_PATH, SERVICE_PATH_LEGACY, DATA_VIEW_PATH, DATA_VIEW_PATH_LEGACY, SPECIFIC_DATA_VIEW_PATH, SPECIFIC_DATA_VIEW_PATH_LEGACY, RUNTIME_FIELD_PATH, RUNTIME_FIELD_PATH_LEGACY, SPECIFIC_RUNTIME_FIELD_PATH, SPECIFIC_RUNTIME_FIELD_PATH_LEGACY, SCRIPTED_FIELD_PATH, SCRIPTED_FIELD_PATH_LEGACY, SPECIFIC_SCRIPTED_FIELD_PATH, SPECIFIC_SCRIPTED_FIELD_PATH_LEGACY, SERVICE_KEY, SERVICE_KEY_LEGACY, DATA_VIEW_SWAP_REFERENCES_PATH, } from './constants';
export type { SERVICE_KEY_TYPE } from './constants';
export type { FieldSpec } from '../common/types';
export { DataViewsService, DataView } from '../common/data_views';
