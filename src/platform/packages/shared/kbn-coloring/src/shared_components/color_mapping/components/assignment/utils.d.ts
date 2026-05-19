import type { DatatableColumnMeta } from '@kbn/expressions-plugin/common';
/**
 * Determines is a field can have create a custom pattern to match during color mapping.
 */
export declare function canCreateCustomMatch(meta?: DatatableColumnMeta): boolean;
