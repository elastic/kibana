/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

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

type ContentListFilterOptions<TOption, TValue extends string> =
  | readonly ContentListFilterOption<TValue>[]
  | FilterOptionsFromItems<TOption, TValue>;

/**
 * Declarative descriptor for a custom filter contributed by a content list provider.
 * Pass to {@link defineContentListFilter} to obtain a {@link ResolvedContentListFilter}.
 */
export interface ContentListFilterDefinition<
  TItem extends UserContentCommonSchema = UserContentCommonSchema,
  TValue extends string = string,
  TOption = unknown
> {
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

const isOptionsFromItems = <TOption, TValue extends string>(
  options: ContentListFilterOptions<TOption, TValue>
): options is FilterOptionsFromItems<TOption, TValue> => !Array.isArray(options);

const getOptions = <TOption, TValue extends string>(
  options?: ContentListFilterOptions<TOption, TValue>
): Array<ContentListFilterOption<TValue>> => {
  if (!options) {
    return [];
  }
  if (isOptionsFromItems(options)) {
    const resolved = options.items.map((option) => ({
      value: options.getOptionValue(option),
      label: options.getOptionLabel(option),
    }));
    return options.unmatchedOption ? [options.unmatchedOption, ...resolved] : resolved;
  }
  return [...options];
};

const getUnmatchedOption = <TOption, TValue extends string>(
  options?: ContentListFilterOptions<TOption, TValue>
): ContentListFilterOption<TValue> | undefined =>
  options && isOptionsFromItems(options) ? options.unmatchedOption : undefined;

const isValueArray = <TValue extends string>(
  value: MaybeArray<TValue>
): value is readonly TValue[] => Array.isArray(value);

const toArray = <TValue extends string>(value: MaybeArray<TValue>): TValue[] => {
  if (isValueArray(value)) {
    return value.filter((v): v is TValue => v != null);
  }
  return value == null ? [] : [value];
};

/**
 * Converts a {@link ContentListFilterDefinition} into a {@link ResolvedContentListFilter}
 * ready for registration on a content list provider.
 */
export const defineContentListFilter = <
  TItem extends UserContentCommonSchema,
  TValue extends string = string,
  TOption = unknown
>(
  definition: ContentListFilterDefinition<TItem, TValue, TOption>
): ResolvedContentListFilter<TValue> => {
  const fieldName = definition.queryField ?? definition.id;

  const getKnownOptions = () => getOptions(definition.options);

  const getLabelForValue = (value: string | null | undefined) =>
    value == null ? undefined : getKnownOptions().find((option) => option.value === value)?.label;

  const normalizeValues = (item: UserContentCommonSchema): TValue[] => {
    const options = getKnownOptions();
    const rawValues = toArray(definition.getItemValue(item as TItem));
    if (!definition.options) {
      return Array.from(new Set(rawValues));
    }
    const knownValues = new Set(options.map(({ value }) => value));
    const unmatchedOption = getUnmatchedOption(definition.options);
    const normalized = new Set<TValue>();

    for (const value of rawValues) {
      if (knownValues.has(value)) {
        normalized.add(value);
      } else if (unmatchedOption) {
        normalized.add(unmatchedOption.value);
      }
    }

    if (normalized.size === 0 && unmatchedOption) {
      normalized.add(unmatchedOption.value);
    }

    return Array.from(normalized);
  };

  const resolveDisplayToValue = (displayValue: string): string | undefined => {
    const match = getKnownOptions().find(
      (option) => option.label === displayValue || option.value === displayValue
    );
    return match?.value;
  };

  return {
    id: definition.id,
    title: definition.title,
    fieldName,
    emptyMessage: definition.emptyMessage,
    noMatchesMessage: definition.noMatchesMessage,
    panelMinWidth: definition.panelMinWidth,
    getOptions: getKnownOptions,
    getLabelForValue,
    normalizeValues,
    toFieldDefinition: () => ({
      fieldName,
      resolveIdToDisplay: (id) => getLabelForValue(id) ?? id,
      resolveDisplayToId: resolveDisplayToValue,
      resolveFuzzyDisplayToIds: (partial) => {
        const lower = partial.toLowerCase();
        return getKnownOptions()
          .filter(
            (option) =>
              option.label.toLowerCase().includes(lower) ||
              option.value.toLowerCase().includes(lower)
          )
          .map(({ value }) => value);
      },
    }),
  };
};

export const matchesFilterValue = (
  item: UserContentCommonSchema,
  filter: ResolvedContentListFilter,
  value: string
): boolean => filter.normalizeValues(item).includes(value);
