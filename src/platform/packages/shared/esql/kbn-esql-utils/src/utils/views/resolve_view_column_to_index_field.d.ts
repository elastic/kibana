import type { EsqlView } from '@kbn/esql-types';
/**
 * Maps a view output column to the underlying index field when a DSL filter is valid.
 * Returns undefined for aggregates, expressions, unresolved sources, and non-view patterns.
 */
export declare const resolveViewColumnToIndexField: (fieldName: string, indexPattern: string, views: readonly EsqlView[]) => string | undefined;
