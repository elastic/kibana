import type { Filter } from '@kbn/es-query';
/**
 * Cleans filters for serialization by removing the `value` property from filter metadata.
 * This is necessary because the `value` property is not serializable and should not be persisted.
 *
 * @param filters - The array of {@link Filter} objects to clean.
 * @returns The cleaned array of {@link Filter} objects, or `undefined` if no filters are provided.
 */
export declare function cleanFiltersForSerialize(filters?: Filter[]): Filter[] | undefined;
