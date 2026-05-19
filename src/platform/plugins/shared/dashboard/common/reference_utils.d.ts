import type { Reference } from '@kbn/content-management-utils';
export declare const getPanelIdFromReference: (reference: Reference) => string | undefined;
/**
 * Retrieves references for a specific panel by its ID.
 * Filters references that match the panel ID prefix and removes the prefix from the reference names.
 *
 * @param id - The panel ID to filter references for.
 * @param references - The array of {@link Reference} objects to filter.
 * @returns An array of {@link Reference} objects belonging to the specified panel.
 */
export declare const getReferencesForPanelId: (id: string, references: Reference[]) => Reference[];
/**
 * Prefixes references from a panel with the panel ID.
 * This is used when extracting references from panels to store at the dashboard level.
 * Tag references are filtered out as they should not be included in panel references.
 *
 * @param id - The panel ID to use as prefix.
 * @param references - The array of {@link Reference} objects to prefix.
 * @returns An array of {@link Reference} objects with prefixed names.
 */
export declare const prefixReferencesFromPanel: (id: string, references: Reference[]) => Reference[];
