/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { ReactElement } from 'react';
import {
  EuiButtonIcon,
  EuiScreenReaderOnly,
  type EuiBasicTableColumn,
  type IconType,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ContentListItem } from '@kbn/content-list-provider';
import type { ColumnBuilder, ColumnBuilderContext } from '../types';
import type { BaseColumnProps } from '../namespaces';

/**
 * Icon type configuration for expander column.
 */
export interface ExpanderIconTypeConfig {
  /**
   * Icon to show when row is expanded.
   * @default 'arrowDown'
   */
  expanded?: IconType;
  /**
   * Icon to show when row is collapsed.
   * @default 'arrowRight'
   */
  collapsed?: IconType;
}

/**
 * Props for Expander column component.
 * Uses {@link BaseColumnProps} with component-specific icon configuration.
 * This is the source of truth for Expander column configuration.
 */
export type ExpanderColumnProps = BaseColumnProps<{
  /**
   * Icon configuration for expanded/collapsed states.
   */
  iconType?: ExpanderIconTypeConfig;
}>;

/**
 * Internal config type used by the builder after parsing.
 */
export interface ExpanderColumnConfig {
  /** Optional width override for the expander column. */
  width?: string;
  /** Icon configuration for expanded/collapsed states. */
  iconType?: ExpanderIconTypeConfig;
}

/**
 * Parse Expander column props from a React element.
 *
 * @param element - React element representing the `ExpanderColumn` component.
 * @returns Parsed {@link ExpanderColumnConfig} object.
 */
export const parseProps = (element: ReactElement): ExpanderColumnConfig => {
  const props = element.props || {};

  return {
    width: props.width,
    iconType: props.iconType,
  };
};

/**
 * Build the Expander column with smart defaults.
 */
export const buildColumn: ColumnBuilder<ExpanderColumnConfig> = (
  config,
  context: ColumnBuilderContext
): EuiBasicTableColumn<ContentListItem> | null => {
  // If no expander context, don't render the column.
  if (!context.expander) {
    return null;
  }

  const { hasExpandableContent, isRowExpanded, toggleRowExpanded, hasAnyExpandableContent } =
    context.expander;

  // If no items have expandable content, don't render the column.
  if (!hasAnyExpandableContent) {
    return null;
  }

  const expandedIcon = config?.iconType?.expanded ?? 'arrowDown';
  const collapsedIcon = config?.iconType?.collapsed ?? 'arrowRight';

  return {
    name: (
      <EuiScreenReaderOnly>
        <span>
          {i18n.translate('contentManagement.contentList.table.expandRowHeader', {
            defaultMessage: 'Expand row',
          })}
        </span>
      </EuiScreenReaderOnly>
    ),
    align: 'left',
    width: config?.width ?? '40px',
    isExpander: true,
    'data-test-subj': 'content-list-table-column-expander',
    render: (item: ContentListItem) => {
      if (!hasExpandableContent(item)) {
        return null;
      }
      const expanded = isRowExpanded(item);
      return (
        <EuiButtonIcon
          onClick={() => toggleRowExpanded(item)}
          aria-label={
            expanded
              ? i18n.translate('contentManagement.contentList.table.collapseRow', {
                  defaultMessage: 'Collapse',
                })
              : i18n.translate('contentManagement.contentList.table.expandRow', {
                  defaultMessage: 'Expand',
                })
          }
          iconType={expanded ? expandedIcon : collapsedIcon}
          data-test-subj="contentListExpandRowButton"
        />
      );
    },
  };
};
