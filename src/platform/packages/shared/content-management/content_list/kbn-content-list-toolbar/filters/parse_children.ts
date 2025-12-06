/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Children, isValidElement } from 'react';
import type { ReactNode, ReactElement } from 'react';

/**
 * Map of display names to filter IDs for pre-built filters.
 */
const DISPLAY_NAME_TO_ID: Record<string, string> = {
  StarredFilter: 'starred',
  SortFilter: 'sort',
  TagsFilter: 'tags',
  CreatedByFilter: 'createdBy',
};

/**
 * Known filter IDs (pre-built filters).
 */
export const KNOWN_FILTER_IDS = ['starred', 'sort', 'tags', 'createdBy'] as const;

/**
 * Type representing the known pre-built filter identifiers.
 */
export type KnownFilterId = (typeof KNOWN_FILTER_IDS)[number];

/**
 * Default filter order when no children are provided.
 */
export const DEFAULT_FILTER_ORDER: string[] = ['sort', 'tags', 'createdBy', 'starred'];

/**
 * Map of filter IDs to their corresponding props.
 */
export type FilterPropsMap = Record<string, Record<string, unknown>>;

/**
 * Checks if a React element is a filter component.
 *
 * @param child - The React element to check.
 * @returns `true` if the element is a known filter marker component.
 */
const isFilterComponent = (child: ReactElement): boolean => {
  const displayName = (child.type as { displayName?: string }).displayName;
  if (!displayName) {
    return false;
  }
  return displayName in DISPLAY_NAME_TO_ID || displayName === 'Filter';
};

/**
 * Gets the filter ID from a filter component.
 *
 * For custom filters using {@link Filter}, the `field` prop is used as the ID.
 * For pre-built filters, the ID is determined by the component's `displayName`.
 *
 * @param child - The React element to extract the filter ID from.
 * @returns The filter ID string, or `null` if not determinable.
 */
const getFilterId = (child: ReactElement): string | null => {
  const displayName = (child.type as { displayName?: string }).displayName;
  if (!displayName) {
    return null;
  }

  // Custom filter uses `field` prop as ID.
  if (displayName === 'Filter') {
    const field = child.props?.field;
    if (!field) {
      // eslint-disable-next-line no-console
      console.warn('[ContentListToolbar] Filter component missing required "field" prop');
      return null;
    }
    return field;
  }

  // Pre-built filters have fixed IDs based on `displayName`.
  return DISPLAY_NAME_TO_ID[displayName] ?? null;
};

/**
 * Parses {@link Filter} components from children.
 *
 * Extracts filter IDs and their props from declarative filter marker children.
 * The order of filters is preserved from the children order.
 *
 * @param children - React children that may contain filter marker components.
 * @returns A tuple of `[filterIds, filterProps]` where `filterIds` is an array of filter ID strings
 *          and `filterProps` is a {@link FilterPropsMap}.
 *
 * @example
 * ```tsx
 * const [filterIds, filterProps] = parseFiltersFromChildren(
 *   <>
 *     <Filters.Tags tagManagementUrl="/app/tags" />
 *     <Filters.Sort />
 *     <Filters.Filter field="status" />
 *   </>
 * );
 * // filterIds = ['tags', 'sort', 'status']
 * // filterProps = {
 * //   tags: { tagManagementUrl: '/app/tags' },
 * //   sort: {},
 * //   status: { field: 'status' }
 * // }
 * ```
 */
export const parseFiltersFromChildren = (children: ReactNode): [string[], FilterPropsMap] => {
  const filterIds: string[] = [];
  const filterProps: FilterPropsMap = {};
  const seenIds = new Set<string>();

  Children.forEach(children, (child) => {
    if (!isValidElement(child) || !isFilterComponent(child)) {
      return;
    }

    const filterId = getFilterId(child);
    if (!filterId) {
      return;
    }

    // Check for duplicate IDs
    if (seenIds.has(filterId)) {
      // eslint-disable-next-line no-console
      console.warn(`[ContentListToolbar] Duplicate filter ID: ${filterId}`);
      return;
    }
    seenIds.add(filterId);

    filterIds.push(filterId);
    filterProps[filterId] = child.props ?? {};
  });

  return [filterIds, filterProps];
};
