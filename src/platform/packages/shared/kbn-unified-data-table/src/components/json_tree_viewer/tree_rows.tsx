/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * This file contains the presentational layer of the JSON tree: one component per row kind
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
  useEuiMemoizedStyles,
  useEuiTheme,
  type UseEuiTheme,
} from '@elastic/eui';
import {
  CHILDREN_INCREMENT,
  CLOSE_BRACKET,
  OPEN_BRACKET,
  nodeToJsonString,
  type ClosingRow,
  type CollectionNode,
  type CollectionType,
  type FormatValue,
  type GetLeafActions,
  type JsonPrimitive,
  type JsonTreeRowAction,
  type NodeRow,
  type PagerRow,
  type PrimitiveType,
} from './tree_model';

const LABEL_TEXT_CLASS = 'jsonTreeViewerLabelText';
const LEAF_LABEL_CLASS = 'jsonTreeViewerLeafLabel';
const VALUE_CLASS = 'jsonTreeViewerValue';

// After this many lines, the value will be truncated.
const MAX_WRAP_VALUE_LINES = 100;

// ---- Row view components (one per render-row kind) ----

// Focus and roving-tabindex wiring shared by the focusable row kinds.
interface FocusableRowProps {
  isActive: boolean;
  rowRef: (element: HTMLDivElement | null) => void;
  onFocus: () => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void;
}

interface NodeRowViewProps extends FocusableRowProps {
  row: NodeRow;
  onActivate: (event: React.MouseEvent) => void;
  formatValue?: FormatValue;
  getLeafActions?: GetLeafActions;
}
export const NodeRowView = memo(function NodeRowView({
  row,
  isActive,
  rowRef,
  onActivate,
  onFocus,
  onKeyDown,
  formatValue,
  getLeafActions,
}: NodeRowViewProps) {
  const styles = useEuiMemoizedStyles(treeStyles);
  const { euiTheme } = useEuiTheme();
  const { node, hasChildren, isExpanded } = row;
  // The row's action buttons (copy, filter) mount only while the row is active or hovered,
  // so a large tree doesn't flood the document with focusable elements (which makes focus-trap /
  // tabbable scans dominate page load time).
  const [isHovered, setIsHovered] = useState(false);
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
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onKeyDown={onKeyDown}
      data-test-subj={`jsonTreeViewerRow-${node.id}`}
    >
      {hasChildren ? (
        <span css={styles.caret}>
          <EuiIcon
            type={isExpanded ? 'chevronSingleDown' : 'chevronSingleRight'}
            size="s"
            aria-hidden
          />
        </span>
      ) : (
        <span css={styles.caret} aria-hidden />
      )}
      <NodeLabel
        row={row}
        showActions={isActive || isHovered}
        formatValue={formatValue}
        getLeafActions={getLeafActions}
      />
    </div>
  );
});

interface PagerRowViewProps extends FocusableRowProps {
  row: PagerRow;
  onShowMore: () => void;
  onShowFewer: () => void;
}
export const PagerRowView = memo(function PagerRowView({
  row,
  isActive,
  rowRef,
  onFocus,
  onKeyDown,
  onShowMore,
  onShowFewer,
}: PagerRowViewProps) {
  const styles = useEuiMemoizedStyles(treeStyles);
  const { euiTheme } = useEuiTheme();
  const showMore = row.hiddenCount > 0;

  // The primary control shows more while items remain, otherwise it collapses back ("show fewer").
  const primaryLabel = showMore
    ? showMoreLabel(
        row.collectionType,
        Math.min(CHILDREN_INCREMENT, row.hiddenCount),
        row.totalCount
      )
    : showFewerLabel(row.collectionType);

  // "Show fewer" unmounts the focused button — move focus to the pager row first so it isn't lost.
  const clickShowFewer = (event: React.MouseEvent) => {
    event.stopPropagation();
    const pager = event.currentTarget.closest<HTMLElement>('[role="treeitem"]');
    onShowFewer();
    pager?.focus();
  };

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
        css={styles.pagerButton}
        iconType={showMore ? 'plus' : 'minus'}
        onClick={
          showMore
            ? (event: React.MouseEvent) => {
                event.stopPropagation();
                onShowMore();
              }
            : clickShowFewer
        }
        onKeyDown={pagerButtonKeyDown}
        onMouseDown={(event: React.MouseEvent) => event.preventDefault()}
        data-test-subj={
          showMore
            ? `jsonTreeViewerMore-${row.collectionId}`
            : `jsonTreeViewerFewer-${row.collectionId}`
        }
      >
        {primaryLabel}
      </EuiButtonEmpty>
      {showMore && row.canShowFewer && (
        <EuiButtonEmpty
          color="text"
          size="xs"
          css={styles.pagerButton}
          iconType="minus"
          onClick={clickShowFewer}
          onKeyDown={pagerButtonKeyDown}
          onMouseDown={(event: React.MouseEvent) => event.preventDefault()}
          data-test-subj={`jsonTreeViewerFewer-${row.collectionId}`}
        >
          {showFewerLabel(row.collectionType)}
        </EuiButtonEmpty>
      )}
    </div>
  );
});

export const ClosingBracketRow = memo(function ClosingBracketRow({ row }: { row: ClosingRow }) {
  const styles = useEuiMemoizedStyles(treeStyles);
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

// ---- Token Components ----

const KeyPrefix = memo(function KeyPrefix({
  name,
  isArrayItem,
}: {
  name: string;
  isArrayItem: boolean;
}) {
  const styles = useEuiMemoizedStyles(treeStyles);
  if (isArrayItem) return null;
  return (
    <span css={styles.keyPrefix}>
      <span css={styles.punctuation}>{'"'}</span>
      <span css={styles.key}>{name}</span>
      <span css={styles.punctuation}>{'"'}</span>
      <span css={styles.punctuation}>:</span>{' '}
    </span>
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
  const styles = useEuiMemoizedStyles(treeStyles);
  if (primitiveType === 'string') {
    return (
      <span className={VALUE_CLASS} css={[styles.value, styles.valueString]}>
        {'"'}
        {formatted ?? String(value)}
        {'"'}
      </span>
    );
  }
  if (primitiveType === 'number' || primitiveType === 'boolean') {
    return (
      <span className={VALUE_CLASS} css={[styles.value, styles.valueScalar]}>
        {formatted ?? String(value)}
      </span>
    );
  }
  return (
    <span className={VALUE_CLASS} css={[styles.value, styles.valueNull]}>
      null
    </span>
  );
});

const Comma = memo(function Comma() {
  const styles = useEuiMemoizedStyles(treeStyles);
  return <span css={styles.punctuation}>,</span>;
});

const COPIED_FEEDBACK_DURATION = 1200;

const copiedLabel = () =>
  i18n.translate('unifiedDataTable.jsonTreeViewer.copied', { defaultMessage: 'Copied' });

const useCopyWithFeedback = (getText: () => string, label: string) => {
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(resetTimer.current), []);

  const copy = () => {
    copyToClipboard(getText());
    setCopied(true);
    clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setCopied(false), COPIED_FEEDBACK_DURATION);
  };

  return {
    copy,
    iconType: copied ? 'check' : 'copy',
    color: copied ? 'success' : 'text',
    displayedLabel: copied ? copiedLabel() : label,
  } as const;
};

const CopyButton = function CopyButton({
  getText,
  label,
  nodeId,
}: {
  getText: () => string;
  label: string;
  nodeId: string;
}) {
  const styles = useEuiMemoizedStyles(treeStyles);
  const { copy, iconType, color, displayedLabel } = useCopyWithFeedback(getText, label);

  return (
    <EuiToolTip content={displayedLabel} disableScreenReaderOutput>
      <EuiButtonIcon
        aria-label={displayedLabel}
        className="jsonTreeViewerCopyButton jsonTreeViewerRowAction"
        color={color}
        css={styles.rowActionButton}
        data-test-subj={`jsonTreeViewerCopy-${nodeId}`}
        iconSize="s"
        iconType={iconType}
        onClick={(event: React.MouseEvent) => {
          event.stopPropagation();
          copy();
        }}
        // Prevent focusing the Datagrid cell so it does not scroll to the top of it.
        onMouseDown={(event: React.MouseEvent) => event.preventDefault()}
        onKeyDown={rowActionKeyDown}
        size="xs"
      />
    </EuiToolTip>
  );
};

// Copies a single primitive leaf as its raw text (e.g. `hello`, `1024`, `null`).
const ValueCopyButton = memo(function ValueCopyButton({
  nodeId,
  value,
}: {
  nodeId: string;
  value: JsonPrimitive;
}) {
  const label = i18n.translate('unifiedDataTable.jsonTreeViewer.copyValue', {
    defaultMessage: 'Copy value',
  });
  return (
    <CopyButton
      getText={() => (value === null ? 'null' : String(value))}
      label={label}
      nodeId={nodeId}
    />
  );
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
  return <CopyButton getText={() => nodeToJsonString(node)} label={label} nodeId={node.id} />;
});

// Copies the whole document as pretty-printed JSON.
export const CopyAllButton = memo(function CopyAllButton({
  getText,
  onKeyDown,
  buttonRef,
}: {
  getText: () => string;
  onKeyDown?: (event: React.KeyboardEvent<HTMLButtonElement>) => void;
  buttonRef?: React.Ref<HTMLButtonElement>;
}) {
  const { copy, iconType, color, displayedLabel } = useCopyWithFeedback(
    getText,
    i18n.translate('unifiedDataTable.jsonTreeViewer.copyAll', { defaultMessage: 'Copy all' })
  );

  return (
    <EuiButtonEmpty
      buttonRef={buttonRef}
      className="jsonTreeViewerHeaderControl"
      color={color}
      data-test-subj="jsonTreeViewerCopyAll"
      flush="left"
      iconSize="s"
      iconType={iconType}
      onClick={() => copy()}
      onKeyDown={onKeyDown}
      size="xs"
    >
      {displayedLabel}
    </EuiButtonEmpty>
  );
});

// A host-defined trailing action on a leaf row.
const RowActionButton = memo(function RowActionButton({ action }: { action: JsonTreeRowAction }) {
  const styles = useEuiMemoizedStyles(treeStyles);
  return (
    <EuiToolTip content={action.label} disableScreenReaderOutput>
      <EuiButtonIcon
        aria-label={action.label}
        className="jsonTreeViewerRowAction"
        color="text"
        css={styles.rowActionButton}
        data-test-subj={action['data-test-subj']}
        iconSize="s"
        iconType={action.iconType}
        onClick={(event: React.MouseEvent) => {
          event.stopPropagation();
          action.onClick();
        }}
        // Prevent focusing the Datagrid cell so it does not scroll to the top of it.
        onMouseDown={(event: React.MouseEvent) => event.preventDefault()}
        onKeyDown={rowActionKeyDown}
        size="xs"
      />
    </EuiToolTip>
  );
});

// The body of a node row: key prefix + value/brackets + comma.
const NodeLabel = memo(function NodeLabel({
  row,
  showActions,
  formatValue,
  getLeafActions,
}: {
  row: NodeRow;
  showActions: boolean;
  formatValue?: FormatValue;
  getLeafActions?: GetLeafActions;
}) {
  const styles = useEuiMemoizedStyles(treeStyles);
  const { node, isExpanded, hasChildren, trailingComma } = row;

  if (node.kind === 'leaf') {
    const leafActions =
      showActions && getLeafActions
        ? getLeafActions({ value: node.value, path: node.path, isArrayItem: node.isArrayItem })
        : [];
    return (
      <span css={styles.label}>
        <span className={`${LABEL_TEXT_CLASS} ${LEAF_LABEL_CLASS}`} css={styles.labelText}>
          <KeyPrefix name={node.key} isArrayItem={node.isArrayItem} />
          <PrimitiveValue
            primitiveType={node.primitiveType}
            value={node.value}
            formatted={formatValue?.({ value: node.value, path: node.path })}
          />
          {trailingComma && <Comma />}
        </span>
        {showActions && (
          <span className="jsonTreeViewerRowActions" css={styles.actions}>
            <ValueCopyButton nodeId={node.id} value={node.value} />
            {leafActions.map((action) => (
              <RowActionButton key={action.id} action={action} />
            ))}
          </span>
        )}
      </span>
    );
  }

  const open = OPEN_BRACKET[node.collectionType];
  const close = CLOSE_BRACKET[node.collectionType];

  // Empty collection: renders `{}` / `[]` inline (never expandable).
  if (!hasChildren) {
    return (
      <span css={styles.label}>
        <span className={LABEL_TEXT_CLASS} css={styles.labelText}>
          <KeyPrefix name={node.key} isArrayItem={node.isArrayItem} />
          <span css={styles.bracket}>{`${open}${close}`}</span>
          {trailingComma && <Comma />}
        </span>
      </span>
    );
  }

  // Expanded: just the opening bracket; children and the closing bracket render as
  // their own rows. The trailing comma belongs to the closing bracket row.
  if (isExpanded) {
    return (
      <span css={styles.label}>
        <span className={LABEL_TEXT_CLASS} css={styles.labelText}>
          <KeyPrefix name={node.key} isArrayItem={node.isArrayItem} />
          <span css={styles.bracket}>{open}</span>
        </span>
        {showActions && (
          <span className="jsonTreeViewerRowActions" css={styles.actions}>
            <SubtreeCopyButton node={node} />
          </span>
        )}
      </span>
    );
  }

  // Collapsed: a one-line preview, e.g. `"user": { 2 fields }`.
  return (
    <span css={styles.label}>
      <span className={LABEL_TEXT_CLASS} css={styles.labelText}>
        <KeyPrefix name={node.key} isArrayItem={node.isArrayItem} />
        <span css={styles.bracket}>{open}</span>
        <span css={styles.count}>
          {collectionCountLabel(node.collectionType, node.children.length)}
        </span>
        <span css={styles.bracket}>{close}</span>
        {trailingComma && <Comma />}
      </span>
      {showActions && (
        <span className="jsonTreeViewerRowActions" css={styles.actions}>
          <SubtreeCopyButton node={node} />
        </span>
      )}
    </span>
  );
});

/** Root placeholder when the document has no visible fields (e.g. hide-nulls left an empty object). */
export const EmptyRootPlaceholder = memo(function EmptyRootPlaceholder({
  collectionType,
}: {
  collectionType: CollectionType;
}) {
  const styles = useEuiMemoizedStyles(treeStyles);
  const { euiTheme } = useEuiTheme();
  return (
    <div
      css={styles.row}
      style={{ paddingInlineStart: rowPaddingInlineStart(euiTheme, 0) }}
      data-test-subj="jsonTreeViewerEmpty"
    >
      <span css={styles.caret} aria-hidden />
      <span css={styles.label}>
        <span className={LABEL_TEXT_CLASS} css={styles.labelText}>
          <span css={styles.bracket}>{OPEN_BRACKET[collectionType]}</span>
          <span css={styles.count}>{collectionCountLabel(collectionType, 0)}</span>
          <span css={styles.bracket}>{CLOSE_BRACKET[collectionType]}</span>
        </span>
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

// Accessibility handling for leaf node actions.
const rowActionKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
  if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
    const container = event.currentTarget.closest<HTMLElement>('.jsonTreeViewerRowActions');
    const buttons = container
      ? Array.from(container.querySelectorAll<HTMLElement>('.jsonTreeViewerRowAction'))
      : [];
    const index = buttons.indexOf(event.currentTarget);
    const next = event.key === 'ArrowRight' ? buttons[index + 1] : buttons[index - 1];
    if (next) {
      event.preventDefault();
      event.stopPropagation();
      next.focus();
      return;
    }
  }
  nestedControlKeyDown(event);
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

// ---- i18n labels ----
const collectionCountLabel = (collectionType: CollectionType, count: number) =>
  collectionType === 'array'
    ? i18n.translate('unifiedDataTable.jsonTreeViewer.itemCount', {
        defaultMessage: '{count, plural, one {# item} other {# items}}',
        values: { count },
      })
    : i18n.translate('unifiedDataTable.jsonTreeViewer.fieldCount', {
        defaultMessage: '{count, plural, one {# field} other {# fields}}',
        values: { count },
      });

const showMoreLabel = (collectionType: CollectionType, count: number, total: number) =>
  collectionType === 'array'
    ? i18n.translate('unifiedDataTable.jsonTreeViewer.showMoreItems', {
        defaultMessage: 'Show {count} more of {total} {total, plural, one {item} other {items}}',
        values: { count, total },
      })
    : i18n.translate('unifiedDataTable.jsonTreeViewer.showMoreFields', {
        defaultMessage: 'Show {count} more of {total} {total, plural, one {field} other {fields}}',
        values: { count, total },
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
const treeStyles = ({ euiTheme }: UseEuiTheme) => ({
  wrapper: css({
    fontFamily: euiTheme.font.familyCode,
    fontSize: euiTheme.font.scale.xs * euiTheme.base,
    margin: 0,
    padding: 0,
  }),
  row: css({
    display: 'flex',
    alignItems: 'center',
    gap: euiTheme.size.xs,
    minHeight: euiTheme.size.base,
    paddingInlineEnd: euiTheme.size.xs,
    borderRadius: euiTheme.border.radius.small,
    cursor: 'default',
    // Skip layout/paint of off-screen rows so large documents (e.g. indices-stats) stay cheap
    // without giving each cell its own scrollbar. Rows stay in the DOM, so keyboard navigation,
    // find-in-page, and assistive tech still reach them; `auto` remembers each row's real height, so
    // the intrinsic size is only an estimate until a row has been shown once.
    contentVisibility: 'auto',
    containIntrinsicBlockSize: `auto ${euiTheme.size.base}`,
    '&:hover': {
      backgroundColor: euiTheme.colors.backgroundBaseInteractiveHover,
    },
    '&:focus-visible': {
      outline: `${euiTheme.focus.width} solid ${euiTheme.colors.primary}`,
      outlineOffset: `-${euiTheme.focus.width}`,
    },
    '&:hover .jsonTreeViewerRowAction, &:focus-within .jsonTreeViewerRowAction': {
      opacity: 1,
    },
  }),
  expandableRow: css({ cursor: 'pointer' }),
  pagerRow: css({ '&:hover': { backgroundColor: 'transparent' } }),
  pagerButton: css({
    blockSize: euiTheme.size.base,
    minBlockSize: euiTheme.size.base,
    margin: `${euiTheme.size.xs} 0`,
  }),
  closingRow: css({
    display: 'flex',
    alignItems: 'center',
    gap: euiTheme.size.xs,
    minHeight: euiTheme.size.base,
    // See `row`: skip off-screen layout/paint while keeping the closing bracket in the DOM.
    contentVisibility: 'auto',
    containIntrinsicBlockSize: `auto ${euiTheme.size.base}`,
  }),
  caret: css({
    flexShrink: 0,
    width: euiTheme.size.base,
    display: 'inline-flex',
    justifyContent: 'center',
    color: euiTheme.colors.textSubdued,
  }),
  label: css({ display: 'flex', alignItems: 'center', minWidth: 0 }),
  labelText: css({ minWidth: 0 }),
  keyPrefix: css({ flexShrink: 0 }),
  key: css({ color: euiTheme.colors.textPrimary }),
  punctuation: css({ color: euiTheme.colors.textSubdued }),
  bracket: css({ color: euiTheme.colors.textParagraph }),
  count: css({ color: euiTheme.colors.textSubdued, marginInline: euiTheme.size.xs }),
  actions: css({ display: 'flex', alignItems: 'center', flexShrink: 0 }),
  rowActionButton: css({
    blockSize: euiTheme.size.base,
    inlineSize: euiTheme.size.base,
    flexShrink: 0,
    opacity: 0,
    marginInlineStart: euiTheme.size.xs,
    '&:focus-visible': { opacity: 1 },
  }),
  value: css({ minWidth: 0, overflowWrap: 'anywhere', whiteSpace: 'pre-wrap' }),
  wrap: css({
    [`& .${LEAF_LABEL_CLASS}`]: {
      display: 'flex',
      minWidth: 0,
      alignItems: 'flex-start',
    },
    [`& .${VALUE_CLASS}`]: css`
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: ${MAX_WRAP_VALUE_LINES};
      overflow: hidden;
      min-width: 0;
      flex: 0 1 auto;
    `,
  }),
  noWrap: css({
    [`& .${LABEL_TEXT_CLASS}`]: {
      display: 'block',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    },
    [`& .${VALUE_CLASS}`]: {
      whiteSpace: 'nowrap',
    },
  }),
  valueString: css({ color: euiTheme.colors.textDanger }),
  valueScalar: css({ color: euiTheme.colors.textAccent }),
  valueNull: css({ color: euiTheme.colors.textSubdued, fontStyle: 'italic' }),
});

const rowPaddingInlineStart = (euiTheme: UseEuiTheme['euiTheme'], depth: number) =>
  `calc(${euiTheme.size.s} + ${depth} * ${euiTheme.size.base})`;

export { treeStyles };
