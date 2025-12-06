/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText, type Query } from '@elastic/eui';
import { useContentListItems, useContentListConfig } from '@kbn/content-list-provider';
import {
  SelectableFilterPopover,
  StandardFilterOption,
  type SelectableFilterOption,
} from './selectable_filter_popover';

/**
 * Configuration for a custom filter option.
 */
export interface CustomFilterOption {
  /** Value to store in the query. */
  value: string;
  /** Display label. */
  label: string;
}

/**
 * Configuration for a custom filter.
 */
export interface CustomFilterConfig {
  /** Display name for the filter. */
  name: string;
  /** Whether multiple values can be selected. */
  multiSelect?: boolean;
  /** Available options for the filter. */
  options: CustomFilterOption[];
}

/**
 * Props for the {@link CustomFilterRenderer} component.
 */
export interface CustomFilterRendererProps {
  /** Field name for this filter. */
  fieldName: string;
  /** Filter configuration from the provider. See {@link CustomFilterConfig}. */
  filterConfig: CustomFilterConfig;
  /** Query object from `EuiSearchBar` (for `custom_component`). */
  query?: Query;
  /** `onChange` callback from `EuiSearchBar` (for `custom_component`). */
  onChange?: (query: Query) => void;
  /** Optional `data-test-subj` attribute for testing. */
  'data-test-subj'?: string;
}

/**
 * `CustomFilterRenderer` component for `EuiSearchBar` `custom_component` filter.
 *
 * Uses {@link SelectableFilterPopover} to match the appearance of built-in filters
 * like {@link TagsRenderer} and {@link CreatedByRenderer}.
 *
 * Features:
 * - Multi-select with include/exclude support (Cmd+click to exclude).
 * - Item counts per option.
 * - Search within the popover.
 * - Consistent styling with other filters.
 *
 * @param props - The component props. See {@link CustomFilterRendererProps}.
 * @returns A React element containing the custom filter.
 */
export const CustomFilterRenderer = ({
  fieldName,
  filterConfig,
  query,
  onChange,
  'data-test-subj': dataTestSubj = 'contentListCustomFilterRenderer',
}: CustomFilterRendererProps) => {
  const { items } = useContentListItems();

  // Count items per option value
  const valueCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach((item) => {
      // Access the custom field value from the item
      const value = (item as Record<string, unknown>)[fieldName];
      if (value !== undefined && value !== null) {
        const strValue = String(value);
        counts[strValue] = (counts[strValue] || 0) + 1;
      }
    });
    return counts;
  }, [items, fieldName]);

  // Build options for SelectableFilterPopover
  const options = useMemo((): Array<SelectableFilterOption<CustomFilterOption>> => {
    return filterConfig.options.map((opt) => ({
      key: opt.value,
      label: opt.label,
      value: opt.value,
      count: valueCounts[opt.value] ?? 0,
      data: opt,
    }));
  }, [filterConfig.options, valueCounts]);

  // Default to multi-select (multiSelect: true) if not specified
  const isSingleSelection = filterConfig.multiSelect === false;

  return (
    <SelectableFilterPopover<CustomFilterOption>
      fieldName={fieldName}
      title={filterConfig.name}
      query={query}
      onChange={onChange}
      options={options}
      singleSelection={isSingleSelection}
      renderOption={(option, { isActive, onClick }) =>
        isSingleSelection ? (
          // Single-select: don't show counts (they become misleading when filtered)
          <EuiFlexGroup gutterSize="s" alignItems="center" onClick={onClick}>
            <EuiFlexItem grow={false}>
              <EuiText size="s">{option.label}</EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : (
          // Multi-select: show counts
          <StandardFilterOption count={option.count ?? 0} isActive={isActive} onClick={onClick}>
            <EuiText size="s">{option.label}</EuiText>
          </StandardFilterOption>
        )
      }
      emptyMessage="No options available"
      noMatchesMessage="No options match the search"
      data-test-subj={dataTestSubj}
    />
  );
};

/**
 * Props for the {@link DynamicCustomFilterRenderer} component.
 *
 * This component reads config from context, so it only needs the field ID.
 */
export interface DynamicCustomFilterRendererProps {
  /** Field ID that references `filtering.custom[fieldId]` in the provider config. */
  fieldId: string;
  /** Query object from `EuiSearchBar` (for `custom_component`). */
  query?: Query;
  /** `onChange` callback from `EuiSearchBar` (for `custom_component`). */
  onChange?: (query: Query) => void;
}

/**
 * `DynamicCustomFilterRenderer` component.
 *
 * Dynamic custom filter renderer that reads config from context.
 *
 * This component reads the current config from {@link useContentListConfig} on each render,
 * ensuring config changes (options, name, `multiSelect`) are properly reflected.
 *
 * The component reference is stable (no factory function), so React won't
 * unmount/remount it on re-render, keeping the popover open during interactions.
 *
 * @param props - The component props. See {@link DynamicCustomFilterRendererProps}.
 * @returns A React element containing the custom filter, or `null` if config is not found.
 */
export const DynamicCustomFilterRenderer = ({
  fieldId,
  query,
  onChange,
}: DynamicCustomFilterRendererProps) => {
  const { features } = useContentListConfig();
  const filteringConfig = typeof features.filtering === 'object' ? features.filtering : undefined;
  const customConfig = filteringConfig?.custom?.[fieldId];

  if (!customConfig) {
    return null;
  }

  // Build the filter config from provider.
  const filterConfig: CustomFilterConfig = {
    name: customConfig.name,
    multiSelect: customConfig.multiSelect,
    options: customConfig.options.map((opt: { value: unknown; label: string }) => ({
      value: String(opt.value),
      label: opt.label,
    })),
  };

  return (
    <CustomFilterRenderer
      fieldName={fieldId}
      filterConfig={filterConfig}
      query={query}
      onChange={onChange}
      data-test-subj={`contentListCustomFilter-${fieldId}`}
    />
  );
};

/**
 * Creates a stable wrapper component for a specific field ID.
 *
 * This is used to satisfy `EuiSearchBar`'s `custom_component` pattern which
 * requires a component type (not a rendered element). The wrapper captures
 * only the `fieldId` and reads fresh config from context on each render.
 *
 * @param fieldId - The field ID for this filter.
 * @returns A stable React component that reads config dynamically.
 */
export const createDynamicCustomFilterRenderer = (
  fieldId: string
): React.ComponentType<{ query: Query; onChange?: (query: Query) => void }> => {
  const DynamicRenderer = ({
    query,
    onChange,
  }: {
    query: Query;
    onChange?: (query: Query) => void;
  }) => <DynamicCustomFilterRenderer fieldId={fieldId} query={query} onChange={onChange} />;

  DynamicRenderer.displayName = `DynamicCustomFilterRenderer(${fieldId})`;
  return DynamicRenderer;
};
