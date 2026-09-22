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
  EuiBasicTable,
  EuiCallOut,
  EuiIcon,
  EuiMarkdownFormat,
  EuiStat,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import type { CatalogComponent } from '@kbn/a2ui-renderer';
import { bool, objectArray, oneOf, optionalStr, str } from '../coerce';

const TEXT_COLORS = ['default', 'subdued', 'success', 'warning', 'danger', 'accent'] as const;
const ALIGNS = ['left', 'center', 'right'] as const;

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
  render: ({ props, accessibility }) => {
    const items = objectArray(props.rows);
    const columns: Array<EuiBasicTableColumn<Record<string, unknown>>> = objectArray(
      props.columns
    ).map((column) => ({
      field: str(column.field),
      name: str(column.name),
      align: ALIGNS.includes(column.align as never)
        ? (column.align as (typeof ALIGNS)[number])
        : undefined,
      render: (value: unknown) => str(value),
    }));

    if (columns.length === 0) return null;

    return (
      <EuiBasicTable
        items={items}
        columns={columns}
        compressed={bool(props.compressed)}
        tableLayout="auto"
        tableCaption={str(props.caption) || accessibility?.label || 'Data table'}
      />
    );
  },
};
