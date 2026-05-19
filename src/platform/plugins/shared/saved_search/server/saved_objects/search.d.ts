import type { SavedObjectsType } from '@kbn/core/server';
import type { MigrateFunctionsObject } from '@kbn/kibana-utils-plugin/common';
export declare function getSavedSearchObjectType(getSearchSourceMigrations: () => MigrateFunctionsObject): SavedObjectsType;
