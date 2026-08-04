import type { SavedObjectsType } from '@kbn/core/server';
import type { MigrateFunctionsObject } from '@kbn/kibana-utils-plugin/common';
export declare const getSavedSearchObjectType: (getSearchSourceMigrations: () => MigrateFunctionsObject) => SavedObjectsType;
