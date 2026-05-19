import type { TypeOf } from '@kbn/config-schema';
import type { ServiceConfigDescriptor } from '@kbn/core-base-server-internal';
declare const migrationSchema: import("@kbn/config-schema").ObjectType<{
    algorithm: import("@kbn/config-schema").Type<"v2" | "zdt">;
    batchSize: import("@kbn/config-schema").Type<number>;
    maxBatchSizeBytes: import("@kbn/config-schema").Type<import("@kbn/config-schema").ByteSizeValue>;
    maxReadBatchSizeBytes: import("@kbn/config-schema").Type<import("@kbn/config-schema").ByteSizeValue>;
    discardUnknownObjects: import("@kbn/config-schema").Type<string | undefined>;
    discardCorruptObjects: import("@kbn/config-schema").Type<string | undefined>;
    scrollDuration: import("@kbn/config-schema").Type<string>;
    pollInterval: import("@kbn/config-schema").Type<number>;
    skip: import("@kbn/config-schema").Type<boolean>;
    retryAttempts: import("@kbn/config-schema").Type<number>;
    /**
     * ZDT algorithm specific options
     */
    zdt: import("@kbn/config-schema").ObjectType<{
        /**
         * The delay that the migrator will wait for, in seconds, when updating the
         * index mapping's meta to let the other nodes pickup the changes.
         */
        metaPickupSyncDelaySec: import("@kbn/config-schema").Type<number>;
        /**
         * The document migration phase will be run from instances with any of the specified roles.
         *
         * This is mostly used for testing environments and integration tests were
         * we have full control over a single node Kibana deployment.
         *
         * Defaults to ["migrator"]
         */
        runOnRoles: import("@kbn/config-schema").Type<string[]>;
    }>;
    /**
     * Skip logging migration progress unless there are any errors.
     */
    useCumulativeLogger: import("@kbn/config-schema").Type<boolean>;
    /**
     * List of WIP (work-in-progress) saved object type names that Kibana is explicitly allowed to
     * start with. Kibana will refuse to start if any type listed in `wip_types.json` is registered
     * but absent from this list. Intended for development environments only; do not use in production.
     *
     * Intentionally optional so that migration internals, which do not need this field, are unaffected
     * by its presence in the config type.
     */
    allowWipTypes: import("@kbn/config-schema").Type<string[] | undefined>;
}>;
export type SavedObjectsMigrationConfigType = TypeOf<typeof migrationSchema>;
export declare const savedObjectsMigrationConfig: ServiceConfigDescriptor<SavedObjectsMigrationConfigType>;
declare const soSchema: import("@kbn/config-schema").ObjectType<{
    maxImportPayloadBytes: import("@kbn/config-schema").Type<import("@kbn/config-schema").ByteSizeValue>;
    maxImportExportSize: import("@kbn/config-schema").Type<number>;
    allowHttpApiAccess: import("@kbn/config-schema").ConditionalType<true, boolean, boolean>;
    enableAccessControl: import("@kbn/config-schema").Type<boolean>;
}>;
export type SavedObjectsConfigType = TypeOf<typeof soSchema>;
export declare const savedObjectsConfig: ServiceConfigDescriptor<SavedObjectsConfigType>;
export declare class SavedObjectConfig {
    maxImportPayloadBytes: number;
    maxImportExportSize: number;
    allowHttpApiAccess: boolean;
    migration: SavedObjectsMigrationConfigType;
    enableAccessControl: boolean;
    constructor(rawConfig: SavedObjectsConfigType, rawMigrationConfig: SavedObjectsMigrationConfigType);
}
export {};
