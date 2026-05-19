/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type React from 'react';
import { type Query } from '@elastic/eui';
/**
 * Configuration for a selectable filter option.
 */
export interface SelectableFilterOption<T extends object = Record<string, unknown>> {
  /** Unique key for the option. */
  key: string;
  /** Display label. */
  label: string;
  /** Value to store in the query (defaults to `key` if not provided). */
  value?: string;
  /** Item count for this option. */
  count?: number;
  /** Custom data associated with this option. */
  data?: T;
}
/**
 * Props for the {@link SelectableFilterPopover} component.
 */
export interface SelectableFilterPopoverProps<T extends object = Record<string, unknown>> {
  /** Field name in the query (e.g., `'tag'`, `'createdBy'`). */
  fieldName: string;
  /** Title displayed in the popover header and button. */
  title: string;
  /** Query object from `EuiSearchBar`. */
  query?: Query;
  /** Callback when filter changes. */
  onChange?: (query: Query) => void;
  /** Options to display. See {@link SelectableFilterOption}. */
  options: Array<SelectableFilterOption<T>>;
  /** Render function for option content. */
  renderOption: (
    option: SelectableFilterOption<T>,
    state: {
      checked: 'on' | 'off' | undefined;
      isActive: boolean;
    }
  ) => React.ReactNode;
  /**
   * Single selection mode — only one value can be selected at a time.
   * Also hides the modifier key tip since exclude is not supported.
   *
   * @default false
   */
  singleSelection?: boolean;
  /** Whether the options are loading. */
  isLoading?: boolean;
  /** Empty state message to display. */
  emptyMessage?: string;
  /** No matches message to display. */
  noMatchesMessage?: string;
  /** Width of the popover panel. */
  panelWidth?: number;
  /** Minimum width of the popover panel. */
  panelMinWidth?: number;
  /** Optional footer content (rendered below {@link ModifierKeyTip}). */
  footerContent?: React.ReactNode;
  /** Optional header content rendered above the selectable list (e.g. a search input). */
  headerContent?: React.ReactNode;
  /** Called when the popover opens or closes. */
  onToggle?: (isOpen: boolean) => void;
  /** `data-test-subj` attribute for testing. */
  'data-test-subj'?: string;
}
/**
 * `SelectableFilterPopover` component.
 *
 * A reusable multi-select filter popover with include/exclude support.
 *
 * Provides:
 * - `EuiSelectable` with search.
 * - Include/exclude via modifier key (Cmd/Ctrl + click).
 * - Filter counts with active state badges.
 * - Standard header with selection count and clear button.
 * - Standard footer with modifier key tip.
 *
 * @example
 * ```tsx
 * <SelectableFilterPopover
 *   fieldName="tag"
 *   title="Tags"
 *   query={query}
 *   onChange={onChange}
 *   options={tags.map(tag => ({
 *     key: tag.id,
 *     label: tag.name,
 *     count: tagCounts[tag.name] ?? 0,
 *     data: tag,
 *   }))}
 *   renderOption={(option, { isActive }) => (
 *     <StandardFilterOption count={option.count ?? 0} isActive={isActive}>
 *       <EuiHealth color={option.data.color}>{option.label}</EuiHealth>
 *     </StandardFilterOption>
 *   )}
 * />
 * ```
 */
export declare const SelectableFilterPopover: <T extends object = Record<string, unknown>>({
  fieldName,
  title,
  query,
  onChange,
  options,
  renderOption,
  singleSelection,
  isLoading,
  emptyMessage,
  noMatchesMessage,
  panelWidth,
  panelMinWidth,
  footerContent,
  headerContent,
  onToggle: onToggleProp,
  'data-test-subj': dataTestSubj,
}: SelectableFilterPopoverProps<T>) => React.JSX.Element;
/**
 * Props for the {@link StandardFilterOption} component.
 */
export interface StandardOptionRenderProps {
  /** Primary content (e.g., name with icon/avatar). */
  children: React.ReactNode;
  /** Item count. When `undefined`, the count badge is hidden entirely. */
  count?: number;
  /** Whether the filter is active. */
  isActive: boolean;
}
/**
 * Standard option layout with content and optional count badge.
 *
 * Include/exclude is handled by `SelectableFilterPopover`'s modifier key
 * tracking — no click handler is needed on individual options.
 */
export declare const StandardFilterOption: ({
  children,
  count,
  isActive,
}: StandardOptionRenderProps) => React.JSX.Element;
