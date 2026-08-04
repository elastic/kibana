import type { UserContentCommonSchema } from '@kbn/content-management-table-list-view-common';
import { type SortField } from '@kbn/content-list-provider';
/**
 * Descriptor for a custom sort field contributed by a content list provider.
 * Pass to {@link defineContentListSortField} or include in {@link ContentListSortFieldConfig}.
 */
export interface ContentListSortField<TItem extends UserContentCommonSchema = UserContentCommonSchema> {
    /** Unique sort field id; maps to the KQL/query field name. */
    id: string;
    /** Display label shown in the sort dropdown. */
    title: string;
    /** Extracts the sortable value from an item for client-side sorting. When omitted, falls back to the built-in field resolver. */
    getValue?: (item: TItem) => string | number | null | undefined;
    /** Label for ascending direction (e.g. "A → Z"). */
    ascLabel?: string;
    /** Label for descending direction (e.g. "Z → A"). */
    descLabel?: string;
}
/** All sort fields available on a provider, keyed by field id. */
export type ContentListSortFieldMap = Record<string, ContentListSortField>;
/**
 * Accepted shapes for the `sorting` option on a content list provider:
 * - `SortField[]` — replaces defaults entirely.
 * - `ContentListSortFieldMap` — merged with defaults (own keys win).
 * - `(defaults) => ContentListSortFieldMap` — full control; receives defaults for reference.
 */
export type ContentListSortFieldConfig = SortField[] | ContentListSortFieldMap | ((defaults: ContentListSortFieldMap) => ContentListSortFieldMap);
/**
 * Identity helper that infers `TItem` so callers get type-safe `getValue` without
 * an explicit type parameter. Equivalent to passing the object directly.
 */
export declare const defineContentListSortField: <TItem extends UserContentCommonSchema>(field: ContentListSortField<TItem>) => ContentListSortField;
export declare const toSortField: (field: ContentListSortField) => SortField;
export declare const DEFAULT_CLIENT_SORT_FIELDS: ContentListSortFieldMap;
export declare const resolveSortFieldMap: (fields?: ContentListSortFieldConfig) => ContentListSortFieldMap;
