/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * The presentational layer of the JSON tree: styling, the JSON syntax tokens (keys, values,
 * brackets, commas), and one component per render-row kind (`NodeRowView`, `ClosingBracketRow`,
 * `PagerRowView`). These hold no state — they render a row and forward interaction to callbacks
 * supplied by the container.
 */

import React, { memo, useEffect, useRef, useState } from 'react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import {
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

// ---- Styles ----

const treeStyles = {
  wrapper: ({ euiTheme }: UseEuiTheme) =>
    css({
      fontFamily: euiTheme.font.familyCode,
      margin: 0,
      padding: 0,
    }),
  // Root-level braces sit flush-left so the top-level fields read as nested inside them.
  rootBracket: ({ euiTheme }: UseEuiTheme) =>
    css({
      color: euiTheme.colors.textParagraph,
      paddingBlock: euiTheme.size.xxs,
      paddingInlineStart: euiTheme.size.xs,
    }),
  row: ({ euiTheme }: UseEuiTheme) =>
    css({
      display: 'flex',
      // Single-line rows centre vertically within the fixed row height; a wrapping value
      // grows past `minHeight`, leaving no slack to centre, so its key still sits on the
      // first line.
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
      // Reveal the per-value copy button only while the row is hovered or focused.
      '&:hover .jsonSyntaxTreeCopyButton, &:focus-within .jsonSyntaxTreeCopyButton': {
        opacity: 1,
      },
    }),
  expandableRow: () => css({ cursor: 'pointer' }),
  // Closing brackets share the row's vertical rhythm but are inert (no hover/focus).
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
  // The syntax tokens (key, punctuation, value, comma) share one inline-flow container so
  // they read like a line of JSON and wrap naturally; `minWidth: 0` lets long values wrap
  // instead of overflowing the row.
  label: () => css({ minWidth: 0 }),
  key: ({ euiTheme }: UseEuiTheme) => css({ color: euiTheme.colors.textParagraph }),
  punctuation: ({ euiTheme }: UseEuiTheme) => css({ color: euiTheme.colors.textSubdued }),
  bracket: ({ euiTheme }: UseEuiTheme) => css({ color: euiTheme.colors.textParagraph }),
  count: ({ euiTheme }: UseEuiTheme) =>
    css({ color: euiTheme.colors.textSubdued, marginInline: euiTheme.size.xs }),
  copyButton: ({ euiTheme }: UseEuiTheme) =>
    css({ opacity: 0, marginInlineStart: euiTheme.size.xs, '&:focus-visible': { opacity: 1 } }),
  // The inline "Show N more" affordance: muted, sitting where the JSON would continue.
  moreLabel: ({ euiTheme }: UseEuiTheme) => css({ color: euiTheme.colors.textSubdued }),
  // The secondary "Show fewer" control reads as the same muted, monospace affordance as the
  // primary "Show N more" label — a plain inline control, not a chunky button.
  fewerButton: ({ euiTheme }: UseEuiTheme) =>
    css({
      display: 'inline-flex',
      alignItems: 'center',
      gap: euiTheme.size.xs,
      marginInlineStart: euiTheme.size.s,
      padding: 0,
      border: 'none',
      background: 'transparent',
      font: 'inherit',
      color: euiTheme.colors.textSubdued,
      cursor: 'pointer',
      '&:focus-visible': {
        outline: `${euiTheme.focus.width} solid ${euiTheme.colors.primary}`,
        outlineOffset: euiTheme.size.xxs,
        borderRadius: euiTheme.border.radius.small,
      },
    }),
  // Values: colours come from the colourblind-safe visualisation palette (not the
  // danger/success status tokens), and the formatting itself (quotes, keywords) conveys
  // type so we never rely on colour alone.
  value: () => css({ minWidth: 0, overflowWrap: 'anywhere', whiteSpace: 'pre-wrap' }),
  valueString: ({ euiTheme }: UseEuiTheme) => css({ color: euiTheme.colors.vis.euiColorVisText1 }),
  // Numbers and booleans share one scalar colour (distinct from the string hue); the
  // `true`/`false` keyword vs bare digits already distinguishes them. No red/green pairing.
  valueScalar: ({ euiTheme }: UseEuiTheme) => css({ color: euiTheme.colors.vis.euiColorVisText2 }),
  valueNull: ({ euiTheme }: UseEuiTheme) =>
    css({ color: euiTheme.colors.textSubdued, fontStyle: 'italic' }),
};

// Indent a row to its depth: a base inset plus one step per level.
const rowPaddingInlineStart = (euiTheme: UseEuiTheme['euiTheme'], depth: number) =>
  `calc(${euiTheme.size.s} + ${depth} * ${euiTheme.size.base})`;

// Keys for a control nested inside a focusable row (the copy button, the "Show fewer" button):
// an arrow hands focus back to the row; Enter/Space stay on the control so the row's own key
// handler doesn't fire too. Escape still bubbles to the host, which returns focus to the grid cell.
const nestedControlKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
  if (event.key.startsWith('Arrow')) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.closest<HTMLElement>('[role="treeitem"]')?.focus();
  } else if (event.key === 'Enter' || event.key === ' ') {
    event.stopPropagation();
  }
};

// ---- i18n labels ----

const collectionCountLabel = (node: CollectionNode) => {
  const count = node.children.length;
  return node.collectionType === 'array'
    ? i18n.translate('unifiedDataTable.jsonSyntaxTree.itemCount', {
        defaultMessage: '{count, plural, one {# item} other {# items}}',
        values: { count },
      })
    : i18n.translate('unifiedDataTable.jsonSyntaxTree.fieldCount', {
        defaultMessage: '{count, plural, one {# field} other {# fields}}',
        values: { count },
      });
};

const showMoreLabel = (collectionType: CollectionType, count: number) =>
  collectionType === 'array'
    ? i18n.translate('unifiedDataTable.jsonSyntaxTree.showMoreItems', {
        defaultMessage: 'Show {count} more {count, plural, one {item} other {items}}',
        values: { count },
      })
    : i18n.translate('unifiedDataTable.jsonSyntaxTree.showMoreFields', {
        defaultMessage: 'Show {count} more {count, plural, one {field} other {fields}}',
        values: { count },
      });

const showFewerLabel = (collectionType: CollectionType) =>
  collectionType === 'array'
    ? i18n.translate('unifiedDataTable.jsonSyntaxTree.showFewerItems', {
        defaultMessage: 'Show fewer items',
      })
    : i18n.translate('unifiedDataTable.jsonSyntaxTree.showFewerFields', {
        defaultMessage: 'Show fewer fields',
      });

// ---- Syntax tokens ----

// Renders the `"key":` prefix. Array items are positional, so they render as bare values
// with no key (matching JSON, where array elements have no key).
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

// Renders a primitive with JSON styling (quotes for strings, type colours). `formatted` — when a
// host's `FormatValue` returns one — replaces the inner text (e.g. a highlighted value) while
// keeping the quotes and colour, so a highlighted string still reads as a string.
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

// How long the copy button shows its "Copied" confirmation before reverting.
const COPIED_FEEDBACK_DURATION = 1200;

// A copy-to-clipboard button that confirms the copy in place: it briefly swaps to a success check
// and a "Copied" tooltip. `getText` is read lazily on click, so copying a large subtree only
// serializes it when actually invoked. Revealed on row hover/focus via `jsonSyntaxTreeCopyButton`.
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

  const copiedLabel = i18n.translate('unifiedDataTable.jsonSyntaxTree.copied', {
    defaultMessage: 'Copied',
  });

  return (
    <EuiToolTip content={copied ? copiedLabel : label} disableScreenReaderOutput>
      <EuiButtonIcon
        aria-label={label}
        className="jsonSyntaxTreeCopyButton"
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
  const label = i18n.translate('unifiedDataTable.jsonSyntaxTree.copyValue', {
    defaultMessage: 'Copy value',
  });
  return <CopyButton getText={() => (value === null ? 'null' : String(value))} label={label} />;
});

// Copies a whole object/array subtree as pretty-printed JSON.
const SubtreeCopyButton = memo(function SubtreeCopyButton({ node }: { node: CollectionNode }) {
  const label =
    node.collectionType === 'array'
      ? i18n.translate('unifiedDataTable.jsonSyntaxTree.copyArray', {
          defaultMessage: 'Copy array',
        })
      : i18n.translate('unifiedDataTable.jsonSyntaxTree.copyObject', {
          defaultMessage: 'Copy object',
        });
  return <CopyButton getText={() => nodeToJsonString(node)} label={label} />;
});

// The body of a node row (everything after the caret): key prefix + value/brackets + comma.
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

  // Empty collection: render `{}` / `[]` inline (never expandable).
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
      data-test-subj={`jsonSyntaxTreeRow-${node.id}`}
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
  // The row's own (primary) affordance: "Show N more" while items remain, otherwise "Show fewer".
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
      css={[styles.row, styles.expandableRow]}
      style={{ paddingInlineStart: rowPaddingInlineStart(euiTheme, row.depth) }}
      onClick={onActivate}
      onFocus={onFocus}
      onKeyDown={onKeyDown}
      data-test-subj={`jsonSyntaxTreePager-${row.collectionId}`}
    >
      <span css={styles.caret}>
        <EuiIcon type={showMore ? 'plus' : 'minus'} size="s" aria-hidden />
      </span>
      <span css={styles.moreLabel}>{primaryLabel}</span>
      {/* When the list is both truncated and revealed past its cap, "Show fewer" shares the line
          as a nested control; the row's own action stays "Show more". */}
      {showMore && row.canShowFewer && (
        <button
          type="button"
          css={styles.fewerButton}
          onClick={(event) => {
            event.stopPropagation();
            onShowFewer();
          }}
          onKeyDown={nestedControlKeyDown}
          data-test-subj={`jsonSyntaxTreeFewer-${row.collectionId}`}
        >
          <EuiIcon type="minus" size="s" aria-hidden />
          {showFewerLabel(row.collectionType)}
        </button>
      )}
    </div>
  );
};

// A closing bracket is presentational: `aria-hidden`, no role, never focusable.
export const ClosingBracketRow = memo(function ClosingBracketRow({ row }: { row: ClosingRow }) {
  const styles = useMemoCss(treeStyles);
  const { euiTheme } = useEuiTheme();
  return (
    <div
      aria-hidden
      css={styles.closingRow}
      style={{ paddingInlineStart: rowPaddingInlineStart(euiTheme, row.depth) }}
      data-test-subj="jsonSyntaxTreeClosingBracket"
    >
      <span css={styles.caret} aria-hidden />
      <span css={styles.label}>
        <span css={styles.bracket}>{CLOSE_BRACKET[row.collectionType]}</span>
        {row.trailingComma && <Comma />}
      </span>
    </div>
  );
});

export { treeStyles };
