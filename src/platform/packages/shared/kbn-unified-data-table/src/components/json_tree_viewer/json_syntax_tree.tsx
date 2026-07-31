/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Prototype "Direction B" for the JSON viewer design review.
 *
 * This keeps the self-contained, accessible tree of Prototype A (`json_field_tree`):
 * controlled expansion that never remounts (so expand/collapse-all keep keyboard focus
 * and scroll), roving-tabindex arrow-key navigation, and per-value copy buttons that are
 * plain icon buttons inside `div` rows (no nested-interactive a11y violations).
 *
 * But it renders the *literal JSON styling* of the current `JsonTreeViewer`: quoted keys,
 * opening/closing braces on their own lines, trailing commas, a `{ N fields }` preview on
 * collapsed nodes, and colour-coded values. Because expansion state lives in JS, the
 * closing bracket is a real interleaved line and the collapsed preview is a plain JS
 * branch — none of the `key`-remount, negative-margin, `:has()` or `!important` hacks the
 * `EuiTreeView`-based version needs.
 */

import React, { memo, useCallback, useMemo, useRef, useState } from 'react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiToolTip,
  copyToClipboard,
  useEuiFontSize,
  useEuiTheme,
  type UseEuiTheme,
} from '@elastic/eui';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';

type JsonPrimitive = string | number | boolean | null;
export type JsonValue = Record<string, unknown> | unknown[] | JsonPrimitive | undefined;

export interface JsonSyntaxTreeProps {
  json: JsonValue;
}

const INITIAL_VISIBLE_ITEMS = 10;
const VISIBLE_ITEMS_INCREMENT = 10;

const OPEN_BRACKET = { object: '{', array: '[' } as const;
const CLOSE_BRACKET = { object: '}', array: ']' } as const;

// ---- Data model (a plain tree, not React elements) ----

type CollectionType = 'object' | 'array';
type PrimitiveType = 'string' | 'number' | 'boolean' | 'null';

interface CollectionNode {
  id: string;
  key: string;
  isArrayItem: boolean;
  kind: 'collection';
  collectionType: CollectionType;
  children: JsonNode[];
}

interface LeafNode {
  id: string;
  key: string;
  isArrayItem: boolean;
  kind: 'leaf';
  primitiveType: PrimitiveType;
  value: JsonPrimitive;
}

type JsonNode = CollectionNode | LeafNode;

const isJsonObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const getPrimitiveType = (value: unknown): PrimitiveType => {
  if (typeof value === 'string') return 'string';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  return 'null';
};

const normalizePrimitive = (value: unknown): JsonPrimitive => {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  return null;
};

const getNodeId = (path: string[]) => `json-syntax-${path.join('__')}`;

const buildNode = ({
  key,
  path,
  value,
  isArrayItem,
}: {
  key: string;
  path: string[];
  value: unknown;
  isArrayItem: boolean;
}): JsonNode => {
  if (Array.isArray(value)) {
    return {
      id: getNodeId(path),
      key,
      isArrayItem,
      kind: 'collection',
      collectionType: 'array',
      children: value.map((child, index) =>
        buildNode({
          key: String(index),
          path: [...path, String(index)],
          value: child,
          isArrayItem: true,
        })
      ),
    };
  }

  if (isJsonObject(value)) {
    return {
      id: getNodeId(path),
      key,
      isArrayItem,
      kind: 'collection',
      collectionType: 'object',
      children: Object.entries(value).map(([childKey, childValue]) =>
        buildNode({
          key: childKey,
          path: [...path, childKey],
          value: childValue,
          isArrayItem: false,
        })
      ),
    };
  }

  return {
    id: getNodeId(path),
    key,
    isArrayItem,
    kind: 'leaf',
    primitiveType: getPrimitiveType(value),
    value: normalizePrimitive(value),
  };
};

const buildNodes = (json: JsonValue): JsonNode[] => {
  if (Array.isArray(json)) {
    return json.map((value, index) =>
      buildNode({ key: String(index), path: [String(index)], value, isArrayItem: true })
    );
  }
  if (isJsonObject(json)) {
    return Object.entries(json).map(([key, value]) =>
      buildNode({ key, path: [key], value, isArrayItem: false })
    );
  }
  return [buildNode({ key: 'value', path: ['value'], value: json, isArrayItem: false })];
};

// Ids of the collections that can actually be toggled (empty `{}` / `[]` render inline and
// are not expandable). Drives the Expand/Collapse-all control and `isAllExpanded`.
const collectExpandableIds = (nodes: JsonNode[]): string[] =>
  nodes.flatMap((node) => {
    if (node.kind !== 'collection') return [];
    const childIds = collectExpandableIds(node.children);
    return node.children.length > 0 ? [node.id, ...childIds] : childIds;
  });

// ---- Flatten visible rows (drives rendering order and keyboard navigation) ----
//
// Unlike Prototype A, an expanded collection also emits a synthetic `closing` row after
// its children, so the tree reads like formatted JSON. Closing rows are presentational
// (`aria-hidden`, no role, not focusable) and are excluded from keyboard navigation.

interface NodeRow {
  kind: 'node';
  node: JsonNode;
  depth: number;
  hasChildren: boolean;
  isExpanded: boolean;
  // Whether a sibling follows this node, i.e. it needs a trailing comma.
  trailingComma: boolean;
  parentId: string | null;
  setSize: number;
  posInSet: number;
}

interface ClosingRow {
  kind: 'closing';
  id: string;
  depth: number;
  collectionType: CollectionType;
  trailingComma: boolean;
}

type RenderRow = NodeRow | ClosingRow;

const isNodeRow = (row: RenderRow): row is NodeRow => row.kind === 'node';

const flattenRows = (
  nodes: JsonNode[],
  expanded: ReadonlySet<string>,
  depth: number,
  parentId: string | null,
  out: RenderRow[]
): RenderRow[] => {
  nodes.forEach((node, index) => {
    const trailingComma = index < nodes.length - 1;
    const hasChildren = node.kind === 'collection' && node.children.length > 0;
    const isExpanded = hasChildren && expanded.has(node.id);
    out.push({
      kind: 'node',
      node,
      depth,
      hasChildren,
      isExpanded,
      trailingComma,
      parentId,
      setSize: nodes.length,
      posInSet: index + 1,
    });
    if (isExpanded && node.kind === 'collection') {
      flattenRows(node.children, expanded, depth + 1, node.id, out);
      out.push({
        kind: 'closing',
        id: `${node.id}__close`,
        depth,
        collectionType: node.collectionType,
        trailingComma,
      });
    }
  });
  return out;
};

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

// ---- Label sub-components ----

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

const PrimitiveValue = memo(function PrimitiveValue({
  primitiveType,
  value,
}: {
  primitiveType: PrimitiveType;
  value: JsonPrimitive;
}) {
  const styles = useMemoCss(treeStyles);
  if (primitiveType === 'string') {
    return <span css={[styles.value, styles.valueString]}>{`"${String(value)}"`}</span>;
  }
  if (primitiveType === 'number' || primitiveType === 'boolean') {
    return <span css={[styles.value, styles.valueScalar]}>{String(value)}</span>;
  }
  return <span css={[styles.value, styles.valueNull]}>null</span>;
});

const Comma = memo(function Comma() {
  const styles = useMemoCss(treeStyles);
  return <span css={styles.punctuation}>,</span>;
});

const ValueCopyButton = memo(function ValueCopyButton({ value }: { value: JsonPrimitive }) {
  const styles = useMemoCss(treeStyles);
  const label = i18n.translate('unifiedDataTable.jsonSyntaxTree.copyValue', {
    defaultMessage: 'Copy value',
  });
  return (
    <EuiToolTip content={label} disableScreenReaderOutput>
      <EuiButtonIcon
        aria-label={label}
        className="jsonSyntaxTreeCopyButton"
        color="text"
        css={styles.copyButton}
        iconSize="s"
        iconType="copy"
        onClick={(event: React.MouseEvent) => {
          event.stopPropagation();
          copyToClipboard(value === null ? 'null' : String(value));
        }}
        size="xs"
      />
    </EuiToolTip>
  );
});

// The body of a node row (everything after the caret): key prefix + value/brackets + comma.
const NodeLabel = memo(function NodeLabel({ row }: { row: NodeRow }) {
  const styles = useMemoCss(treeStyles);
  const { node, isExpanded, hasChildren, trailingComma } = row;

  if (node.kind === 'leaf') {
    return (
      <span css={styles.label}>
        <KeyPrefix name={node.key} isArrayItem={node.isArrayItem} />
        <PrimitiveValue primitiveType={node.primitiveType} value={node.value} />
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
    </span>
  );
});

// ---- Main component ----

export const JsonSyntaxTree = memo(function JsonSyntaxTree({ json }: JsonSyntaxTreeProps) {
  const styles = useMemoCss(treeStyles);
  const { euiTheme } = useEuiTheme();
  const codeFontCss = css(useEuiFontSize('xs'));

  const nodes = useMemo(() => buildNodes(json), [json]);
  const expandableIds = useMemo(() => collectExpandableIds(nodes), [nodes]);
  const rootIsArray = Array.isArray(json);

  const { openBracket, closeBracket } = useMemo(() => {
    if (Array.isArray(json)) return { openBracket: '[', closeBracket: ']' };
    if (isJsonObject(json)) return { openBracket: '{', closeBracket: '}' };
    return { openBracket: null, closeBracket: null };
  }, [json]);

  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_ITEMS);
  const [activeId, setActiveId] = useState<string | null>(null);

  const rowRefs = useRef(new Map<string, HTMLDivElement>());

  const visibleTopLevel = useMemo(
    () => nodes.slice(0, Math.min(visibleCount, nodes.length)),
    [nodes, visibleCount]
  );

  const rows = useMemo(
    () => flattenRows(visibleTopLevel, expanded, 0, null, []),
    [visibleTopLevel, expanded]
  );

  const orderedIds = useMemo(() => rows.filter(isNodeRow).map((row) => row.node.id), [rows]);
  const orderedIdSet = useMemo(() => new Set(orderedIds), [orderedIds]);

  const hiddenCount = nodes.length - visibleTopLevel.length;
  const nextChunk = Math.min(VISIBLE_ITEMS_INCREMENT, hiddenCount);
  const hasControls = expandableIds.length > 0;
  const isAllExpanded = hasControls && expandableIds.every((id) => expanded.has(id));

  // Exactly one row is part of the tab order (roving tabindex).
  const activeRowId = activeId && orderedIdSet.has(activeId) ? activeId : orderedIds[0] ?? null;

  const setExpandedFor = useCallback((id: string, shouldExpand: boolean) => {
    setExpanded((prev) => {
      if (prev.has(id) === shouldExpand) return prev;
      const next = new Set(prev);
      if (shouldExpand) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const toggle = useCallback(
    (id: string) => setExpandedFor(id, !expanded.has(id)),
    [expanded, setExpandedFor]
  );

  const expandAll = useCallback(() => {
    setExpanded(new Set(expandableIds));
    setVisibleCount(nodes.length);
  }, [expandableIds, nodes.length]);

  const collapseAll = useCallback(() => setExpanded(new Set()), []);

  const focusRow = useCallback((id: string | undefined) => {
    if (!id) return;
    setActiveId(id);
    rowRefs.current.get(id)?.focus();
  }, []);

  const onRowKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>, row: NodeRow) => {
      const index = orderedIds.indexOf(row.node.id);
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          focusRow(orderedIds[index + 1]);
          break;
        case 'ArrowUp':
          event.preventDefault();
          focusRow(orderedIds[index - 1]);
          break;
        case 'Home':
          event.preventDefault();
          focusRow(orderedIds[0]);
          break;
        case 'End':
          event.preventDefault();
          focusRow(orderedIds[orderedIds.length - 1]);
          break;
        case 'ArrowRight':
          event.preventDefault();
          if (row.hasChildren && !row.isExpanded) setExpandedFor(row.node.id, true);
          else if (row.hasChildren && row.isExpanded) focusRow(orderedIds[index + 1]);
          break;
        case 'ArrowLeft':
          event.preventDefault();
          if (row.hasChildren && row.isExpanded) setExpandedFor(row.node.id, false);
          else if (row.parentId) focusRow(row.parentId);
          break;
        case 'Enter':
        case ' ':
          if (row.hasChildren) {
            event.preventDefault();
            toggle(row.node.id);
          }
          break;
        default:
          break;
      }
    },
    [orderedIds, focusRow, setExpandedFor, toggle]
  );

  const paginationLabels = {
    more: rootIsArray
      ? i18n.translate('unifiedDataTable.jsonSyntaxTree.showMoreItems', {
          defaultMessage: 'Show {count} more {count, plural, one {item} other {items}}',
          values: { count: nextChunk },
        })
      : i18n.translate('unifiedDataTable.jsonSyntaxTree.showMoreFields', {
          defaultMessage: 'Show {count} more {count, plural, one {field} other {fields}}',
          values: { count: nextChunk },
        }),
    all: rootIsArray
      ? i18n.translate('unifiedDataTable.jsonSyntaxTree.showAllItems', {
          defaultMessage: 'Show all items',
        })
      : i18n.translate('unifiedDataTable.jsonSyntaxTree.showAllFields', {
          defaultMessage: 'Show all fields',
        }),
    fewer: rootIsArray
      ? i18n.translate('unifiedDataTable.jsonSyntaxTree.showFewerItems', {
          defaultMessage: 'Show fewer items',
        })
      : i18n.translate('unifiedDataTable.jsonSyntaxTree.showFewerFields', {
          defaultMessage: 'Show fewer fields',
        }),
  };

  return (
    <>
      {hasControls && (
        <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              flush="left"
              iconType={isAllExpanded ? 'fold' : 'unfold'}
              onClick={isAllExpanded ? collapseAll : expandAll}
              size="xs"
            >
              {isAllExpanded
                ? i18n.translate('unifiedDataTable.jsonSyntaxTree.collapseAll', {
                    defaultMessage: 'Collapse all',
                  })
                : i18n.translate('unifiedDataTable.jsonSyntaxTree.expandAll', {
                    defaultMessage: 'Expand all',
                  })}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}

      <div css={[styles.wrapper, codeFontCss]}>
        {openBracket !== null && <div css={styles.rootBracket}>{openBracket}</div>}

        <div
          role="tree"
          aria-label={i18n.translate('unifiedDataTable.jsonSyntaxTree.treeAriaLabel', {
            defaultMessage: 'JSON tree view',
          })}
          data-test-subj="jsonSyntaxTree"
        >
          {rows.map((row) => {
            const paddingInlineStart = `calc(${euiTheme.size.s} + ${row.depth} * ${euiTheme.size.base})`;

            if (row.kind === 'closing') {
              return (
                <div
                  key={row.id}
                  aria-hidden
                  css={styles.closingRow}
                  style={{ paddingInlineStart }}
                  data-test-subj="jsonSyntaxTreeClosingBracket"
                >
                  <span css={styles.caret} aria-hidden />
                  <span css={styles.label}>
                    <span css={styles.bracket}>{CLOSE_BRACKET[row.collectionType]}</span>
                    {row.trailingComma && <Comma />}
                  </span>
                </div>
              );
            }

            const { node, hasChildren, isExpanded } = row;
            return (
              <div
                key={node.id}
                ref={(element) => {
                  if (element) rowRefs.current.set(node.id, element);
                  else rowRefs.current.delete(node.id);
                }}
                role="treeitem"
                aria-level={row.depth + 1}
                aria-setsize={row.setSize}
                aria-posinset={row.posInSet}
                aria-expanded={hasChildren ? isExpanded : undefined}
                aria-selected={node.id === activeRowId}
                tabIndex={node.id === activeRowId ? 0 : -1}
                css={hasChildren ? [styles.row, styles.expandableRow] : styles.row}
                style={{ paddingInlineStart }}
                onClick={() => hasChildren && toggle(node.id)}
                onFocus={() => setActiveId(node.id)}
                onKeyDown={(event) => onRowKeyDown(event, row)}
                data-test-subj={`jsonSyntaxTreeRow-${node.id}`}
              >
                {hasChildren ? (
                  <span css={styles.caret}>
                    <EuiIcon type={isExpanded ? 'arrowDown' : 'arrowRight'} size="s" aria-hidden />
                  </span>
                ) : (
                  <span css={styles.caret} aria-hidden />
                )}
                <NodeLabel row={row} />
              </div>
            );
          })}
        </div>

        {closeBracket !== null && <div css={styles.rootBracket}>{closeBracket}</div>}
      </div>

      {(hiddenCount > 0 || visibleCount > INITIAL_VISIBLE_ITEMS) && (
        <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
          {visibleCount > INITIAL_VISIBLE_ITEMS && (
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                flush="left"
                iconType="arrowUp"
                onClick={() => setVisibleCount(INITIAL_VISIBLE_ITEMS)}
                size="xs"
              >
                {paginationLabels.fewer}
              </EuiButtonEmpty>
            </EuiFlexItem>
          )}
          {hiddenCount > 0 && (
            <>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  flush="left"
                  iconType="plus"
                  onClick={() =>
                    setVisibleCount((prev) =>
                      Math.min(prev + VISIBLE_ITEMS_INCREMENT, nodes.length)
                    )
                  }
                  size="xs"
                >
                  {paginationLabels.more}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  flush="left"
                  iconType="listBullet"
                  onClick={() => setVisibleCount(nodes.length)}
                  size="xs"
                >
                  {paginationLabels.all}
                </EuiButtonEmpty>
              </EuiFlexItem>
            </>
          )}
        </EuiFlexGroup>
      )}
    </>
  );
});
