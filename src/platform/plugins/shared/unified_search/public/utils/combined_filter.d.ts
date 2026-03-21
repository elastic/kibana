import type { CombinedFilter } from '@kbn/es-query';
import { type Filter } from '@kbn/es-query';
/**
 * Defines a boolean relation type (AND/OR) from the filter otherwise returns undefined.
 * @param {Filter} filter
 */
export declare const getBooleanRelationType: (filter: Filter | CombinedFilter) => import("@kbn/es-query").BooleanRelation | undefined;
