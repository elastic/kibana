import type { ISavedObjectTypeRegistry } from '@kbn/core-saved-objects-server';
export interface MigratorConfig {
    /** The index prefix for this migrator. e.g '.kibana' */
    indexPrefix: string;
    /** The id of the types this migrator is in charge of */
    types: string[];
}
export declare const buildMigratorConfigs: ({ typeRegistry, kibanaIndexPrefix, }: {
    typeRegistry: ISavedObjectTypeRegistry;
    kibanaIndexPrefix: string;
}) => MigratorConfig[];
