import type { SavedObjectAttributes, SavedObjectMigrationMap } from '@kbn/core/server';
import type { MigrateFunctionsObject } from '@kbn/kibana-utils-plugin/common';
export interface SavedSearchMigrationAttributes extends SavedObjectAttributes {
    kibanaSavedObjectMeta: {
        searchSourceJSON: string;
    };
}
export declare const searchMigrations: {
    '6.7.2': (...args: any[]) => any;
    '7.0.0': (...args: any[]) => any;
    '7.4.0': (...args: any[]) => any;
    '7.9.3': (...args: any[]) => any;
};
export declare const getAllMigrations: (searchSourceMigrations: MigrateFunctionsObject) => SavedObjectMigrationMap;
