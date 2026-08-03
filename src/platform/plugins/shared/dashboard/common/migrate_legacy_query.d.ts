import type { Query } from '@kbn/es-query';
/**
 * Migrates legacy query formats to the current stored {@link Query} format.
 * Queries without a `language` property are assumed to be Lucene queries,
 * since Lucene was the only option in earlier versions.
 *
 * @param query - The query to migrate, which can be a {@link Query}, a legacy object, or a string.
 * @returns The migrated {@link Query}.
 */
export declare function migrateLegacyQuery(query: Query | {
    [key: string]: any;
} | string): Query;
