import type { UserContentCommonSchema } from '@kbn/content-management-table-list-view-common';
import type { FieldDefinition } from '@kbn/content-list-provider';
type MaybeArray<T> = T | readonly T[] | null | undefined;
/** A single selectable option in a {@link ContentListFilterDefinition}. */
export interface ContentListFilterOption<TValue extends string = string> {
    value: TValue;
    label: string;
}
interface FilterOptionsFromItems<TOption, TValue extends string> {
    items: readonly TOption[];
    getOptionValue: (option: TOption) => TValue;
    getOptionLabel: (option: TOption) => string;
    unmatchedOption?: ContentListFilterOption<TValue>;
}
type ContentListFilterOptions<TOption, TValue extends string> = readonly ContentListFilterOption<TValue>[] | FilterOptionsFromItems<TOption, TValue>;
/**
 * Declarative descriptor for a custom filter contributed by a content list provider.
 * Pass to {@link defineContentListFilter} to obtain a {@link ResolvedContentListFilter}.
 */
export interface ContentListFilterDefinition<TItem extends UserContentCommonSchema = UserContentCommonSchema, TValue extends string = string, TOption = unknown> {
    /** Unique filter id; also used as the query field name when `queryField` is omitted. */
    id: string;
    /** Display label shown in the toolbar filter button. */
    title: string;
    /** KQL field name to use in queries. Defaults to `id`. */
    queryField?: string;
    /** Extracts the filterable value(s) from a single item. */
    getItemValue: (item: TItem) => MaybeArray<TValue>;
    /**
     * Static option list or a descriptor for deriving options from a data array.
     * Omit to let the toolbar control derive options from the values present in
     * the current list (faceted), like the built-in tag and created-by filters.
     */
    options?: ContentListFilterOptions<TOption, TValue>;
    /** Shown when the option list is empty. */
    emptyMessage?: string;
    /** Shown when the active search yields no matching options. */
    noMatchesMessage?: string;
    /** Minimum pixel width of the filter popover panel. */
    panelMinWidth?: number;
}
/**
 * Runtime form of a {@link ContentListFilterDefinition}, produced by {@link defineContentListFilter}.
 * Consumed by the toolbar and by {@link useClientFilterCounts}.
 */
export interface ResolvedContentListFilter<TValue extends string = string> {
    id: string;
    title: string;
    /** KQL field name used in queries. */
    fieldName: string;
    emptyMessage?: string;
    noMatchesMessage?: string;
    panelMinWidth?: number;
    /** Returns the current option list. */
    getOptions: () => Array<ContentListFilterOption<TValue>>;
    /** Looks up the display label for a stored value; returns `undefined` for unknown values. */
    getLabelForValue: (value: string | null | undefined) => string | undefined;
    /** Extracts and normalizes filterable values from an item, mapping unknowns to `unmatchedOption` when configured. */
    normalizeValues: (item: UserContentCommonSchema) => TValue[];
    /** Produces a {@link FieldDefinition} for wiring this filter into the KQL query pipeline. */
    toFieldDefinition: () => FieldDefinition;
}
/** All resolved custom filters registered on a provider, keyed by filter id. */
export type ContentListFilterMap = Record<string, ResolvedContentListFilter>;
/**
 * Converts a {@link ContentListFilterDefinition} into a {@link ResolvedContentListFilter}
 * ready for registration on a content list provider.
 */
export declare const defineContentListFilter: <TItem extends UserContentCommonSchema, TValue extends string = string, TOption = unknown>(definition: ContentListFilterDefinition<TItem, TValue, TOption>) => ResolvedContentListFilter<TValue>;
export declare const matchesFilterValue: (item: UserContentCommonSchema, filter: ResolvedContentListFilter, value: string) => boolean;
export {};
