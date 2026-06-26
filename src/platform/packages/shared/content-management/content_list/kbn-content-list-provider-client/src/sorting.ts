/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UserContentCommonSchema } from '@kbn/content-management-table-list-view-common';
import { DEFAULT_SORT_FIELDS, type SortField } from '@kbn/content-list-provider';

/**
 * Descriptor for a custom sort field contributed by a content list provider.
 * Pass to {@link defineContentListSortField} or include in {@link ContentListSortFieldConfig}.
 */
export interface ContentListSortField<
  TItem extends UserContentCommonSchema = UserContentCommonSchema
> {
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
export type ContentListSortFieldConfig =
  | SortField[]
  | ContentListSortFieldMap
  | ((defaults: ContentListSortFieldMap) => ContentListSortFieldMap);

/**
 * Identity helper that infers `TItem` so callers get type-safe `getValue` without
 * an explicit type parameter. Equivalent to passing the object directly.
 */
export const defineContentListSortField = <TItem extends UserContentCommonSchema>(
  field: ContentListSortField<TItem>
): ContentListSortField => field as ContentListSortField;

export const toSortField = (field: ContentListSortField): SortField => ({
  field: field.id,
  name: field.title,
  ...(field.ascLabel && { ascLabel: field.ascLabel }),
  ...(field.descLabel && { descLabel: field.descLabel }),
});

export const DEFAULT_CLIENT_SORT_FIELDS: ContentListSortFieldMap = {
  ...Object.fromEntries(
    DEFAULT_SORT_FIELDS.map((field) => [
      field.field,
      {
        id: field.field,
        title: field.name,
        ascLabel: field.ascLabel,
        descLabel: field.descLabel,
      },
    ])
  ),
};

export const resolveSortFieldMap = (
  fields?: ContentListSortFieldConfig
): ContentListSortFieldMap => {
  if (!fields) {
    return DEFAULT_CLIENT_SORT_FIELDS;
  }
  if (Array.isArray(fields)) {
    return Object.fromEntries(
      fields.map((field) => [
        field.field,
        {
          id: field.field,
          title: field.name,
          ascLabel: field.ascLabel,
          descLabel: field.descLabel,
        },
      ])
    );
  }
  return typeof fields === 'function'
    ? fields(DEFAULT_CLIENT_SORT_FIELDS)
    : {
        ...DEFAULT_CLIENT_SORT_FIELDS,
        ...fields,
      };
};
