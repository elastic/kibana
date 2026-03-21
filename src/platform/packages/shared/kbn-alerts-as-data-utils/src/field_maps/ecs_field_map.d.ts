import type { FieldMap } from './types';
export declare const ecsFieldMap: FieldMap;
export type EcsFieldMap = typeof ecsFieldMap;
/**
 * A Set containing the names of ECS fields that have type 'nested'.
 * This is exported separately from ecsFieldMap because nested fields are excluded
 * from ecsFieldMap to prevent Elasticsearch composite mapping conflicts, but some
 * code (like traverseAndMutateDoc) still needs to know which fields are nested
 * to properly validate alert documents.
 */
export declare const ecsNestedFieldNames: ReadonlySet<string>;
