/**
 * Generic hook for toggling a value in any field filter via EUI Query mutations.
 *
 * Parses the current `queryText` → mutates the EUI Query → dispatches the
 * new text. Same pattern as `useFieldQueryFilter` in the toolbar, but works
 * from outside EuiSearchBar (e.g., avatar clicks, tag badge clicks).
 *
 * For known filters, prefer the convenience wrappers
 * {@link useTagFilterToggle} and {@link useCreatedByFilterToggle}.
 *
 * @param fieldName - The field name (e.g., `'tag'`, `'createdBy'`).
 * @returns A toggle callback `(id, type?) => void`.
 */
export declare const useFilterToggle: (fieldName: string) => (id: string, type?: "include" | "exclude") => void;
/** Convenience wrapper around {@link useFilterToggle} for the `tag` field. */
export declare const useTagFilterToggle: () => (id: string, type?: "include" | "exclude") => void;
/** Convenience wrapper around {@link useFilterToggle} for the `createdBy` field. */
export declare const useCreatedByFilterToggle: () => (id: string, type?: "include" | "exclude") => void;
