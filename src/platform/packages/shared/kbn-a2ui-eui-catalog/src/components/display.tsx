/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import {
  EuiBadge,
  EuiButtonIcon,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiInMemoryTable,
  EuiMarkdownFormat,
  EuiStat,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import type { EuiBasicTableColumn, EuiSearchBarProps } from '@elastic/eui';
import type { CatalogComponent } from '@kbn/a2ui-renderer';
import { bool, num, objectArray, oneOf, optionalStr, str } from '../coerce';

const TEXT_COLORS = ['default', 'subdued', 'success', 'warning', 'danger', 'accent'] as const;
const ALIGNS = ['left', 'center', 'right'] as const;
const DATA_TYPES = ['string', 'number', 'date', 'boolean'] as const;

const HEADING_SIZES = { heading1: 'l', heading2: 'm', heading3: 's' } as const;

export const Text: CatalogComponent = {
  name: 'Text',
  render: ({ props, accessibility }) => {
    const content = str(props.text);
    const variant = oneOf(
      props.variant,
      ['heading1', 'heading2', 'heading3', 'body', 'caption'] as const,
      'body'
    );
    const color = oneOf(props.color, TEXT_COLORS, 'default');
    const textAlign = ALIGNS.includes(props.textAlign as never)
      ? (props.textAlign as (typeof ALIGNS)[number])
      : undefined;

    if (variant === 'heading1' || variant === 'heading2' || variant === 'heading3') {
      const Tag = variant === 'heading1' ? 'h1' : variant === 'heading2' ? 'h2' : 'h3';
      return (
        <EuiTitle size={HEADING_SIZES[variant]} aria-label={accessibility?.label}>
          <Tag>{content}</Tag>
        </EuiTitle>
      );
    }

    return (
      <EuiText
        size={variant === 'caption' ? 'xs' : 's'}
        color={color}
        textAlign={textAlign}
        aria-label={accessibility?.label}
      >
        {/* Markdown is rendered, never raw HTML — EuiMarkdownFormat sanitises by default. */}
        <EuiMarkdownFormat textSize={variant === 'caption' ? 'xs' : 's'}>
          {content}
        </EuiMarkdownFormat>
      </EuiText>
    );
  },
};

export const Icon: CatalogComponent = {
  name: 'Icon',
  render: ({ props, accessibility }) => (
    <EuiIcon
      type={str(props.name, 'dot')}
      color={optionalStr(props.color)}
      size={oneOf(props.size, ['s', 'm', 'l', 'xl'] as const, 'm')}
      aria-label={accessibility?.label}
    />
  ),
};

export const Badge: CatalogComponent = {
  name: 'Badge',
  render: ({ props, accessibility }) => (
    <EuiBadge
      color={oneOf(
        props.color,
        ['default', 'hollow', 'primary', 'success', 'warning', 'danger', 'accent'] as const,
        'default'
      )}
      iconType={optionalStr(props.iconType)}
      aria-label={accessibility?.label}
    >
      {str(props.label)}
    </EuiBadge>
  ),
};

export const Stat: CatalogComponent = {
  name: 'Stat',
  render: ({ props, accessibility }) => (
    <EuiStat
      title={str(props.title)}
      description={str(props.description)}
      titleColor={oneOf(
        props.color,
        ['default', 'subdued', 'primary', 'success', 'warning', 'danger', 'accent'] as const,
        'default'
      )}
      textAlign={oneOf(props.textAlign, ALIGNS, 'left')}
      aria-label={accessibility?.label}
    />
  ),
};

export const Callout: CatalogComponent = {
  name: 'Callout',
  render: ({ props, buildChild, accessibility }) => (
    <EuiCallOut
      title={str(props.title)}
      color={oneOf(props.color, ['primary', 'success', 'warning', 'danger'] as const, 'primary')}
      iconType={optionalStr(props.iconType)}
      aria-label={accessibility?.label}
    >
      {buildChild(props.child as string)}
    </EuiCallOut>
  ),
};

export const Table: CatalogComponent = {
  name: 'Table',
  render: ({ props, rawProps, dispatchAction, accessibility }) => {
    const items = objectArray(props.rows);
    const declared = objectArray(props.columns);

    const columns: Array<EuiBasicTableColumn<Record<string, unknown>>> = declared.map((column) => {
      const dataType = oneOf(column.dataType, DATA_TYPES, 'string');
      return {
        field: str(column.field),
        name: str(column.name),
        dataType,
        // Sortable unless the author opts out: a reader expects to be able to
        // reorder a table, and EUI sorts in memory over rows we already hold.
        sortable: bool(column.sortable, true),
        truncateText: bool(column.truncate),
        width: optionalStr(column.width),
        align: ALIGNS.includes(column.align as never)
          ? (column.align as (typeof ALIGNS)[number])
          : undefined,
        render: (value: unknown) => (value === null || value === undefined ? '—' : str(value)),
      };
    });

    /**
     * Row actions dispatch with the clicked row merged into the event context
     * as `row`. Without that the handler would have no way to tell which row
     * was pressed — the action itself is declared once for the whole column.
     */
    const rowActions = objectArray(rawProps.rowActions);
    if (rowActions.length > 0) {
      // Rendered explicitly rather than via EuiBasicTable's `actions` shorthand,
      // which leaves the icon buttons without an accessible name.
      columns.push({
        name: 'Actions',
        align: 'right',
        width: `${rowActions.length * 40}px`,
        // A column with no `field` is a computed column, so EuiBasicTable hands
        // the whole record as the first argument rather than a cell value.
        render: (row: Record<string, unknown>) => (
          <EuiFlexGroup gutterSize="xs" justifyContent="flexEnd" responsive={false}>
            {rowActions.map((entry, index) => {
              const label = str(entry.label, 'Action');
              return (
                <EuiFlexItem key={`${label}-${index}`} grow={false}>
                  <EuiToolTip content={label} disableScreenReaderOutput>
                    <EuiButtonIcon
                      iconType={optionalStr(entry.iconType) ?? 'inspect'}
                      color={(optionalStr(entry.color) ?? 'primary') as never}
                      size="xs"
                      aria-label={label}
                      onClick={() => {
                        const action = entry.action as {
                          event?: { name: string; context?: object };
                        };
                        if (!action?.event) return;
                        dispatchAction({
                          event: { ...action.event, context: { ...action.event.context, row } },
                        } as never);
                      }}
                    />
                  </EuiToolTip>
                </EuiFlexItem>
              );
            })}
          </EuiFlexGroup>
        ),
      } as EuiBasicTableColumn<Record<string, unknown>>);
    }

    if (columns.length === 0) return null;

    const sortField = optionalStr(props.sortField);
    const sorting = sortField
      ? {
          sort: {
            field: sortField,
            direction: oneOf(props.sortDirection, ['asc', 'desc'] as const, 'asc'),
          },
        }
      : true;

    // 0 (or absent) means show every row; anything else turns on EUI's pager.
    const pageSize = num(props.pageSize, 0);
    const pagination =
      pageSize > 0
        ? { initialPageSize: pageSize, pageSizeOptions: [pageSize, pageSize * 2, pageSize * 5] }
        : undefined;

    const search: EuiSearchBarProps | undefined = bool(props.search)
      ? {
          box: {
            incremental: true,
            placeholder: optionalStr(props.searchPlaceholder) ?? 'Search',
            schema: true,
            'aria-label': `Search ${str(props.caption) || 'the table'}`,
          },
        }
      : undefined;

    return (
      <EuiInMemoryTable
        items={items}
        columns={columns}
        sorting={sorting}
        pagination={pagination}
        search={search}
        compressed={bool(props.compressed)}
        tableLayout="auto"
        tableCaption={str(props.caption) || accessibility?.label || 'Data table'}
      />
    );
  },
};
