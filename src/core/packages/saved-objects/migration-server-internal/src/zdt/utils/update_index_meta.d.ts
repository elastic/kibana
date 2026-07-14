import type { IndexMappingMeta, VirtualVersionMap } from '@kbn/core-saved-objects-base-server-internal';
export declare const setMetaMappingMigrationComplete: ({ meta, versions, }: {
    meta: IndexMappingMeta;
    versions: VirtualVersionMap;
}) => IndexMappingMeta;
export declare const setMetaDocMigrationStarted: ({ meta, }: {
    meta: IndexMappingMeta;
}) => IndexMappingMeta;
export declare const setMetaDocMigrationComplete: ({ meta, versions, }: {
    meta: IndexMappingMeta;
    versions: VirtualVersionMap;
}) => IndexMappingMeta;
export declare const removePropertiesFromV2: (meta: IndexMappingMeta) => IndexMappingMeta;
