/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * This file contains the presentational layer of the JSON tree: one component per render-row kind
 * (`NodeRowView`, `ClosingBracketRow`,`PagerRowView`). These hold no state.
 */

import React, { memo, useEffect, useRef, useState } from 'react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiIcon,
  EuiToolTip,
  copyToClipboard,
  useEuiTheme,
  type UseEuiTheme,
} from '@elastic/eui';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import {
  CHILDREN_INCREMENT,
  CLOSE_BRACKET,
  OPEN_BRACKET,
  nodeToJsonString,
  type ClosingRow,
  type CollectionNode,
  type CollectionType,
  type FormatValue,
  type JsonPrimitive,
  type NodeRow,
  type PagerRow,
  type PrimitiveType,
} from './tree_model';

// ---- Row views (one per render-row kind) ----

// Interaction wiring shared by the two focusable row kinds (node and pager). The container owns
// the state, so it binds each callback to the row and passes the result down.
interface FocusableRowProps {
  isActive: boolean;
  rowRef: (element: HTMLDivElement | null) => void;
  onActivate: () => void;
  onFocus: () => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void;
}

export const NodeRowView = function NodeRowView({
  row,
  isActive,
  rowRef,
  onActivate,
  onFocus,
  onKeyDown,
  formatValue,
}: FocusableRowProps & { row: NodeRow; formatValue?: FormatValue }) {
  const styles = useMemoCss(treeStyles);
  const { euiTheme } = useEuiTheme();
  const { node, hasChildren, isExpanded } = row;
  return (
    <div
      ref={rowRef}
      role="treeitem"
      aria-level={row.depth + 1}
      aria-setsize={row.setSize}
      aria-posinset={row.posInSet}
      aria-expanded={hasChildren ? isExpanded : undefined}
      aria-selected={isActive}
      tabIndex={isActive ? 0 : -1}
      css={hasChildren ? [styles.row, styles.expandableRow] : styles.row}
      style={{ paddingInlineStart: rowPaddingInlineStart(euiTheme, row.depth) }}
      onClick={onActivate}
      onFocus={onFocus}
      onKeyDown={onKeyDown}
      data-test-subj={`jsonTreeViewerRow-${node.id}`}
    >
      {hasChildren ? (
        <span css={styles.caret}>
          <EuiIcon type={isExpanded ? 'arrowDown' : 'arrowRight'} size="s" aria-hidden />
        </span>
      ) : (
        <span css={styles.caret} aria-hidden />
      )}
      <NodeLabel row={row} formatValue={formatValue} />
    </div>
  );
};

export const PagerRowView = function PagerRowView({
  row,
  isActive,
  rowRef,
  onActivate,
  onFocus,
  onKeyDown,
  onShowFewer,
}: FocusableRowProps & { row: PagerRow; onShowFewer: () => void }) {
  const styles = useMemoCss(treeStyles);
  const { euiTheme } = useEuiTheme();
  const showMore = row.hiddenCount > 0;

  const primaryLabel = showMore
    ? showMoreLabel(row.collectionType, Math.min(CHILDREN_INCREMENT, row.hiddenCount))
    : showFewerLabel(row.collectionType);
  return (
    <div
      ref={rowRef}
      role="treeitem"
      aria-level={row.depth + 1}
      aria-selected={isActive}
      tabIndex={isActive ? 0 : -1}
      css={[styles.row, styles.pagerRow]}
      style={{ paddingInlineStart: rowPaddingInlineStart(euiTheme, row.depth) }}
      onFocus={onFocus}
      onKeyDown={onKeyDown}
      data-test-subj={`jsonTreeViewerPager-${row.collectionId}`}
    >
      <EuiButtonEmpty
        color="text"
        size="xs"
        iconType={showMore ? 'plus' : 'minus'}
        onClick={(event: React.MouseEvent) => {
          event.stopPropagation();
          onActivate();
        }}
        onKeyDown={pagerButtonKeyDown}
      >
        {primaryLabel}
      </EuiButtonEmpty>
      {showMore && row.canShowFewer && (
        <EuiButtonEmpty
          color="text"
          size="xs"
          iconType="minus"
          onClick={(event: React.MouseEvent) => {
            event.stopPropagation();
            onShowFewer();
          }}
          onKeyDown={pagerButtonKeyDown}
          data-test-subj={`jsonTreeViewerFewer-${row.collectionId}`}
        >
          {showFewerLabel(row.collectionType)}
        </EuiButtonEmpty>
      )}
    </div>
  );
};

export const ClosingBracketRow = memo(function ClosingBracketRow({ row }: { row: ClosingRow }) {
  const styles = useMemoCss(treeStyles);
  const { euiTheme } = useEuiTheme();
  return (
    <div
      aria-hidden
      css={styles.closingRow}
      style={{ paddingInlineStart: rowPaddingInlineStart(euiTheme, row.depth) }}
      data-test-subj="jsonTreeViewerClosingBracket"
    >
      <span css={styles.caret} aria-hidden />
      <span css={styles.label}>
        <span css={styles.bracket}>{CLOSE_BRACKET[row.collectionType]}</span>
        {row.trailingComma && <Comma />}
      </span>
    </div>
  );
});

// Accesibility handling for the control buttons (copy / pager buttons).
const nestedControlKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
  if (event.key.startsWith('Arrow')) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.closest<HTMLElement>('[role="treeitem"]')?.focus();
  } else if (event.key === 'Enter' || event.key === ' ') {
    event.stopPropagation();
  }
};

// Accesibility handling for the pager buttons.
const pagerButtonKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
  if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
    const sibling =
      event.key === 'ArrowRight'
        ? event.currentTarget.nextElementSibling
        : event.currentTarget.previousElementSibling;
    if (sibling instanceof HTMLElement) {
      event.preventDefault();
      event.stopPropagation();
      sibling.focus();
      return;
    }
  }
  nestedControlKeyDown(event);
};

// ---- Token Components ----

const KeyPrefix = memo(function KeyPrefix({
  name,
  isArrayItem,
}: {
  name: string;
  isArrayItem: boolean;
}) {
  const styles = useMemoCss(treeStyles);
  if (isArrayItem) return null;
  return (
    <>
      <span css={styles.punctuation}>{'"'}</span>
      <span css={styles.key}>{name}</span>
      <span css={styles.punctuation}>{'"'}</span>
      <span css={styles.punctuation}>:</span>{' '}
    </>
  );
});

const PrimitiveValue = memo(function PrimitiveValue({
  primitiveType,
  value,
  formatted,
}: {
  primitiveType: PrimitiveType;
  value: JsonPrimitive;
  formatted?: React.ReactNode;
}) {
  const styles = useMemoCss(treeStyles);
  if (primitiveType === 'string') {
    return (
      <span css={[styles.value, styles.valueString]}>
        {'"'}
        {formatted ?? String(value)}
        {'"'}
      </span>
    );
  }
  if (primitiveType === 'number' || primitiveType === 'boolean') {
    return <span css={[styles.value, styles.valueScalar]}>{formatted ?? String(value)}</span>;
  }
  return <span css={[styles.value, styles.valueNull]}>null</span>;
});

const Comma = memo(function Comma() {
  const styles = useMemoCss(treeStyles);
  return <span css={styles.punctuation}>,</span>;
});

const COPIED_FEEDBACK_DURATION = 1200;
const CopyButton = function CopyButton({
  getText,
  label,
}: {
  getText: () => string;
  label: string;
}) {
  const styles = useMemoCss(treeStyles);
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(resetTimer.current), []);

  const copiedLabel = i18n.translate('unifiedDataTable.jsonTreeViewer.copied', {
    defaultMessage: 'Copied',
  });

  return (
    <EuiToolTip content={copied ? copiedLabel : label} disableScreenReaderOutput>
      <EuiButtonIcon
        aria-label={label}
        className="jsonTreeViewerCopyButton"
        color={copied ? 'success' : 'text'}
        css={styles.copyButton}
        iconSize="s"
        iconType={copied ? 'check' : 'copy'}
        onClick={(event: React.MouseEvent) => {
          event.stopPropagation();
          copyToClipboard(getText());
          setCopied(true);
          clearTimeout(resetTimer.current);
          resetTimer.current = setTimeout(() => setCopied(false), COPIED_FEEDBACK_DURATION);
        }}
        onKeyDown={nestedControlKeyDown}
        size="xs"
      />
    </EuiToolTip>
  );
};

// Copies a single primitive leaf as its raw text (e.g. `hello`, `1024`, `null`).
const ValueCopyButton = memo(function ValueCopyButton({ value }: { value: JsonPrimitive }) {
  const label = i18n.translate('unifiedDataTable.jsonTreeViewer.copyValue', {
    defaultMessage: 'Copy value',
  });
  return <CopyButton getText={() => (value === null ? 'null' : String(value))} label={label} />;
});

// Copies a whole object/array subtree as pretty-printed JSON.
const SubtreeCopyButton = memo(function SubtreeCopyButton({ node }: { node: CollectionNode }) {
  const label =
    node.collectionType === 'array'
      ? i18n.translate('unifiedDataTable.jsonTreeViewer.copyArray', {
          defaultMessage: 'Copy array',
        })
      : i18n.translate('unifiedDataTable.jsonTreeViewer.copyObject', {
          defaultMessage: 'Copy object',
        });
  return <CopyButton getText={() => nodeToJsonString(node)} label={label} />;
});

// The body of a node row: key prefix + value/brackets + comma.
const NodeLabel = memo(function NodeLabel({
  row,
  formatValue,
}: {
  row: NodeRow;
  formatValue?: FormatValue;
}) {
  const styles = useMemoCss(treeStyles);
  const { node, isExpanded, hasChildren, trailingComma } = row;

  if (node.kind === 'leaf') {
    return (
      <span css={styles.label}>
        <KeyPrefix name={node.key} isArrayItem={node.isArrayItem} />
        <PrimitiveValue
          primitiveType={node.primitiveType}
          value={node.value}
          formatted={formatValue?.({ value: node.value, path: node.path })}
        />
        {trailingComma && <Comma />}
        <ValueCopyButton value={node.value} />
      </span>
    );
  }

  const open = OPEN_BRACKET[node.collectionType];
  const close = CLOSE_BRACKET[node.collectionType];

  // Empty collection: renders `{}` / `[]` inline (never expandable).
  if (!hasChildren) {
    return (
      <span css={styles.label}>
        <KeyPrefix name={node.key} isArrayItem={node.isArrayItem} />
        <span css={styles.bracket}>{`${open}${close}`}</span>
        {trailingComma && <Comma />}
      </span>
    );
  }

  // Expanded: just the opening bracket; children and the closing bracket render as
  // their own rows. The trailing comma belongs to the closing bracket row.
  if (isExpanded) {
    return (
      <span css={styles.label}>
        <KeyPrefix name={node.key} isArrayItem={node.isArrayItem} />
        <span css={styles.bracket}>{open}</span>
        <SubtreeCopyButton node={node} />
      </span>
    );
  }

  // Collapsed: a one-line preview, e.g. `"user": { 2 fields }`.
  return (
    <span css={styles.label}>
      <KeyPrefix name={node.key} isArrayItem={node.isArrayItem} />
      <span css={styles.bracket}>{open}</span>
      <span css={styles.count}>{collectionCountLabel(node)}</span>
      <span css={styles.bracket}>{close}</span>
      {trailingComma && <Comma />}
      <SubtreeCopyButton node={node} />
    </span>
  );
});

// ---- i18n labels ----
const collectionCountLabel = (node: CollectionNode) => {
  const count = node.children.length;
  return node.collectionType === 'array'
    ? i18n.translate('unifiedDataTable.jsonTreeViewer.itemCount', {
        defaultMessage: '{count, plural, one {# item} other {# items}}',
        values: { count },
      })
    : i18n.translate('unifiedDataTable.jsonTreeViewer.fieldCount', {
        defaultMessage: '{count, plural, one {# field} other {# fields}}',
        values: { count },
      });
};

const showMoreLabel = (collectionType: CollectionType, count: number) =>
  collectionType === 'array'
    ? i18n.translate('unifiedDataTable.jsonTreeViewer.showMoreItems', {
        defaultMessage: 'Show {count} more {count, plural, one {item} other {items}}',
        values: { count },
      })
    : i18n.translate('unifiedDataTable.jsonTreeViewer.showMoreFields', {
        defaultMessage: 'Show {count} more {count, plural, one {field} other {fields}}',
        values: { count },
      });

const showFewerLabel = (collectionType: CollectionType) =>
  collectionType === 'array'
    ? i18n.translate('unifiedDataTable.jsonTreeViewer.showFewerItems', {
        defaultMessage: 'Show fewer items',
      })
    : i18n.translate('unifiedDataTable.jsonTreeViewer.showFewerFields', {
        defaultMessage: 'Show fewer fields',
      });

// ---- Styles ----
const treeStyles = {
  wrapper: ({ euiTheme }: UseEuiTheme) =>
    css({
      fontFamily: euiTheme.font.familyCode,
      margin: 0,
      padding: 0,
    }),
  row: ({ euiTheme }: UseEuiTheme) =>
    css({
      display: 'flex',
      alignItems: 'center',
      gap: euiTheme.size.xs,
      minHeight: euiTheme.size.l,
      paddingInlineEnd: euiTheme.size.xs,
      borderRadius: euiTheme.border.radius.small,
      cursor: 'default',
      '&:hover': {
        backgroundColor: euiTheme.colors.backgroundBaseInteractiveHover,
      },
      '&:focus-visible': {
        outline: `${euiTheme.focus.width} solid ${euiTheme.colors.primary}`,
        outlineOffset: `-${euiTheme.focus.width}`,
      },
      '&:hover .jsonTreeViewerCopyButton, &:focus-within .jsonTreeViewerCopyButton': {
        opacity: 1,
      },
    }),
  expandableRow: () => css({ cursor: 'pointer' }),
  pagerRow: () => css({ '&:hover': { backgroundColor: 'transparent' } }),
  closingRow: ({ euiTheme }: UseEuiTheme) =>
    css({
      display: 'flex',
      alignItems: 'center',
      gap: euiTheme.size.xs,
      minHeight: euiTheme.size.l,
    }),
  caret: ({ euiTheme }: UseEuiTheme) =>
    css({
      flexShrink: 0,
      width: euiTheme.size.base,
      display: 'inline-flex',
      justifyContent: 'center',
      color: euiTheme.colors.textSubdued,
    }),
  label: () => css({ minWidth: 0 }),
  key: ({ euiTheme }: UseEuiTheme) => css({ color: euiTheme.colors.textPrimary }),
  punctuation: ({ euiTheme }: UseEuiTheme) => css({ color: euiTheme.colors.textSubdued }),
  bracket: ({ euiTheme }: UseEuiTheme) => css({ color: euiTheme.colors.textParagraph }),
  count: ({ euiTheme }: UseEuiTheme) =>
    css({ color: euiTheme.colors.textSubdued, marginInline: euiTheme.size.xs }),
  copyButton: ({ euiTheme }: UseEuiTheme) =>
    css({ opacity: 0, marginInlineStart: euiTheme.size.xs, '&:focus-visible': { opacity: 1 } }),
  value: () => css({ minWidth: 0, overflowWrap: 'anywhere', whiteSpace: 'pre-wrap' }),
  valueString: ({ euiTheme }: UseEuiTheme) => css({ color: euiTheme.colors.textDanger }),
  valueScalar: ({ euiTheme }: UseEuiTheme) => css({ color: euiTheme.colors.textAccent }),
  valueNull: ({ euiTheme }: UseEuiTheme) =>
    css({ color: euiTheme.colors.textSubdued, fontStyle: 'italic' }),
};

const rowPaddingInlineStart = (euiTheme: UseEuiTheme['euiTheme'], depth: number) =>
  `calc(${euiTheme.size.s} + ${depth} * ${euiTheme.size.base})`;

export { treeStyles };
