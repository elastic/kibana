import type { FieldDefinition } from '@kbn/management-settings-types';
import type { CategoryCounts } from '@kbn/management-settings-types/category';
/**
 * Utility function to extract the number of fields in each settings category.
 * @param fields A list of {@link FieldDefinition} objects.
 * @returns A {@link CategoryCounts} object.
 */
export declare const getCategoryCounts: (fields: FieldDefinition[]) => CategoryCounts;
