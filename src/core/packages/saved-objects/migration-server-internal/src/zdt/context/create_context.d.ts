import type { MigrateIndexOptions } from '../migrate_index';
import type { MigratorContext } from './types';
export type CreateContextOps = Omit<MigrateIndexOptions, 'logger'>;
/**
 * Create the context object that will be used for this index migration.
 */
export declare const createContext: ({ kibanaVersion, types, docLinks, migrationConfig, documentMigrator, elasticsearchClient, indexPrefix, typeRegistry, serializer, nodeRoles, esCapabilities, }: CreateContextOps) => MigratorContext;
