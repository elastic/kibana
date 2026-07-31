/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Prototype "Direction A" for the JSON viewer design review.
 *
 * Instead of imitating literal JSON text (quotes, braces, trailing commas) on top of
 * `EuiTreeView`, this renders a clean *field tree*: `key: value` rows, a visible child
 * count on collapsed nodes, and controlled expansion that never remounts the tree — so
 * expand/collapse-all keep keyboard focus and scroll position. It is a self-contained,
 * accessible tree (roving tabindex + arrow-key navigation) so we are not constrained by
 * `EuiTreeView`'s lack of a controlled-expansion API.
 *
 * Large documents are kept cheap by capping *every* collection (the root and each expanded
 * node) at `INITIAL_CHILDREN` rendered children, with an inline "Show N more" row that
 * reveals the next chunk. This bounds the DOM per cell at any depth — Expand-all included —
 * so the grid's own row virtualization is all that's needed; the viewer never virtualizes.
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

export interface JsonFieldTreeProps {
  json: JsonValue;
}

// Each collection (root + every expanded node) renders at most this many children before a
// "Show N more" row appears; revealing bumps the collection's budget by this increment.
const INITIAL_CHILDREN = 10;
const CHILDREN_INCREMENT = 10;

// Stable id for the (container-less) root list, so it can carry its own reveal budget.
const ROOT_ID = 'json-field-$root';

// ---- Data model (a plain tree; a leaf may carry a pre-rendered node, e.g. a highlighted value) ----

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
  // A search-highlighted value arrives already rendered (matched terms marked); render it verbatim.
  rendered?: React.ReactNode;
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

const getNodeId = (path: string[]) => `json-field-${path.join('__')}`;

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
  // A highlighted value is a React element — a leaf that renders itself, not a collection to
  // recurse into (React elements are objects, so this must precede the object check below).
  if (React.isValidElement(value)) {
    return {
      id: getNodeId(path),
      key,
      isArrayItem,
      kind: 'leaf',
      primitiveType: 'string',
      value: null,
      rendered: value,
    };
  }

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

const collectCollectionIds = (nodes: JsonNode[]): string[] =>
  nodes.flatMap((node) =>
    node.kind === 'collection' ? [node.id, ...collectCollectionIds(node.children)] : []
  );

// ---- Flatten visible rows (drives rendering order and keyboard navigation) ----
//
// Every collection is capped at its reveal budget; when a list is truncated a synthetic
// `more` row is emitted at the children's depth. `more` rows are real (focusable) treeitems
// so they stay in the roving-tabindex order.

interface NodeRow {
  kind: 'node';
  node: JsonNode;
  depth: number;
  hasChildren: boolean;
  isExpanded: boolean;
  parentId: string | null;
  setSize: number;
  posInSet: number;
}

// A pager row reveals the next chunk of a truncated collection (`more`) or resets it back to
// the initial cap (`fewer`). Both are real, focusable treeitems.
interface PagerRow {
  kind: 'pager';
  variant: 'more' | 'fewer';
  id: string;
  depth: number;
  parentId: string | null;
  collectionId: string;
  collectionType: CollectionType;
  hiddenCount: number;
}

type RenderRow = NodeRow | PagerRow;

const rowKey = (row: RenderRow) => (row.kind === 'node' ? row.node.id : row.id);

const flattenVisible = (
  nodes: JsonNode[],
  listId: string,
  listType: CollectionType,
  expanded: ReadonlySet<string>,
  revealed: ReadonlyMap<string, number>,
  depth: number,
  parentId: string | null,
  out: RenderRow[]
): RenderRow[] => {
  const shown = Math.min(revealed.get(listId) ?? INITIAL_CHILDREN, nodes.length);
  for (let index = 0; index < shown; index++) {
    const node = nodes[index];
    const hasChildren = node.kind === 'collection' && node.children.length > 0;
    const isExpanded = hasChildren && expanded.has(node.id);
    out.push({
      kind: 'node',
      node,
      depth,
      hasChildren,
      isExpanded,
      parentId,
      // `setSize`/`posInSet` reflect the full sibling count even while capped, so a screen
      // reader still announces "3 of 250".
      setSize: nodes.length,
      posInSet: index + 1,
    });
    if (isExpanded && node.kind === 'collection') {
      flattenVisible(
        node.children,
        node.id,
        node.collectionType,
        expanded,
        revealed,
        depth + 1,
        node.id,
        out
      );
    }
  }
  const hidden = nodes.length - shown;
  if (hidden > 0) {
    out.push({
      kind: 'pager',
      variant: 'more',
      id: `${listId}__more`,
      depth,
      parentId,
      collectionId: listId,
      collectionType: listType,
      hiddenCount: hidden,
    });
  }
  // Offer "Show fewer" whenever this list was revealed past its initial cap, so a collection
  // grown large can be compacted again.
  if (shown > INITIAL_CHILDREN) {
    out.push({
      kind: 'pager',
      variant: 'fewer',
      id: `${listId}__fewer`,
      depth,
      parentId,
      collectionId: listId,
      collectionType: listType,
      hiddenCount: 0,
    });
  }
  return out;
};

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
      '&:hover .jsonFieldTreeCopyButton, &:focus-within .jsonFieldTreeCopyButton': {
        opacity: 1,
      },
    }),
  expandableRow: () => css({ cursor: 'pointer' }),
  copyButton: ({ euiTheme }: UseEuiTheme) =>
    css({ opacity: 0, marginInlineStart: euiTheme.size.xs, '&:focus-visible': { opacity: 1 } }),
  caret: ({ euiTheme }: UseEuiTheme) =>
    css({
      flexShrink: 0,
      width: euiTheme.size.base,
      display: 'inline-flex',
      justifyContent: 'center',
      color: euiTheme.colors.textSubdued,
    }),
  // Key + separator + value share one inline-flow container so that a wrapping value keeps
  // its key on the first line, while single-line rows still centre vertically (see `row`).
  label: () => css({ minWidth: 0 }),
  key: ({ euiTheme }: UseEuiTheme) =>
    css({
      color: euiTheme.colors.textParagraph,
      fontWeight: euiTheme.font.weight.medium,
    }),
  separator: ({ euiTheme }: UseEuiTheme) =>
    css({ color: euiTheme.colors.textSubdued, marginInline: euiTheme.size.xs }),
  count: ({ euiTheme }: UseEuiTheme) =>
    css({ color: euiTheme.colors.textSubdued, marginInlineStart: euiTheme.size.xs }),
  // The child count is wrapped in the collection's own delimiter ({ } for objects, [ ] for
  // arrays) so a field's type is obvious at a glance — without adopting full JSON syntax.
  bracket: ({ euiTheme }: UseEuiTheme) => css({ color: euiTheme.colors.textParagraph }),
  // The inline "Show N more" affordance: muted, but darkens on hover/focus like a link.
  moreLabel: ({ euiTheme }: UseEuiTheme) => css({ color: euiTheme.colors.textSubdued }),
  // Values: colours come from the colourblind-safe visualisation palette (not the
  // danger/success status tokens), and the value formatting itself (quotes, keywords)
  // conveys type so we never rely on colour alone.
  value: () => css({ minWidth: 0, overflowWrap: 'anywhere', whiteSpace: 'pre-wrap' }),
  valueString: ({ euiTheme }: UseEuiTheme) => css({ color: euiTheme.colors.vis.euiColorVisText1 }),
  // Numbers and booleans share one scalar colour (blue, distinct from the string teal);
  // the `true`/`false` keyword vs bare digits already distinguishes them, so a second
  // hue would only add noise. We deliberately avoid a red/green pairing.
  valueScalar: ({ euiTheme }: UseEuiTheme) => css({ color: euiTheme.colors.vis.euiColorVisText2 }),
  valueNull: ({ euiTheme }: UseEuiTheme) =>
    css({ color: euiTheme.colors.textSubdued, fontStyle: 'italic' }),
};

// ---- Value rendering ----

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
  return (
    <span css={[styles.value, styles.valueNull]}>
      {i18n.translate('unifiedDataTable.jsonFieldTree.nullValue', { defaultMessage: 'null' })}
    </span>
  );
});

const ValueCopyButton = memo(function ValueCopyButton({ value }: { value: JsonPrimitive }) {
  const styles = useMemoCss(treeStyles);
  const label = i18n.translate('unifiedDataTable.jsonFieldTree.copyValue', {
    defaultMessage: 'Copy value',
  });
  return (
    <EuiToolTip content={label} disableScreenReaderOutput>
      <EuiButtonIcon
        aria-label={label}
        className="jsonFieldTreeCopyButton"
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

const collectionCountLabel = (node: CollectionNode) => {
  const count = node.children.length;
  return node.collectionType === 'array'
    ? i18n.translate('unifiedDataTable.jsonFieldTree.itemCount', {
        defaultMessage: '{count, plural, one {# item} other {# items}}',
        values: { count },
      })
    : i18n.translate('unifiedDataTable.jsonFieldTree.fieldCount', {
        defaultMessage: '{count, plural, one {# field} other {# fields}}',
        values: { count },
      });
};

const showMoreLabel = (collectionType: CollectionType, count: number) =>
  collectionType === 'array'
    ? i18n.translate('unifiedDataTable.jsonFieldTree.showMoreItems', {
        defaultMessage: 'Show {count} more {count, plural, one {item} other {items}}',
        values: { count },
      })
    : i18n.translate('unifiedDataTable.jsonFieldTree.showMoreFields', {
        defaultMessage: 'Show {count} more {count, plural, one {field} other {fields}}',
        values: { count },
      });

const showFewerLabel = (collectionType: CollectionType) =>
  collectionType === 'array'
    ? i18n.translate('unifiedDataTable.jsonFieldTree.showFewerItems', {
        defaultMessage: 'Show fewer items',
      })
    : i18n.translate('unifiedDataTable.jsonFieldTree.showFewerFields', {
        defaultMessage: 'Show fewer fields',
      });

// ---- Main component ----

export const JsonFieldTree = memo(function JsonFieldTree({ json }: JsonFieldTreeProps) {
  const styles = useMemoCss(treeStyles);
  const { euiTheme } = useEuiTheme();
  const codeFontCss = css(useEuiFontSize('xs'));

  const nodes = useMemo(() => buildNodes(json), [json]);
  const allCollectionIds = useMemo(() => collectCollectionIds(nodes), [nodes]);
  const rootType: CollectionType = Array.isArray(json) ? 'array' : 'object';

  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());
  const [revealed, setRevealed] = useState<ReadonlyMap<string, number>>(() => new Map());
  const [activeId, setActiveId] = useState<string | null>(null);

  const rowRefs = useRef(new Map<string, HTMLDivElement>());

  const rows = useMemo(
    () => flattenVisible(nodes, ROOT_ID, rootType, expanded, revealed, 0, null, []),
    [nodes, rootType, expanded, revealed]
  );

  const orderedIds = useMemo(() => rows.map(rowKey), [rows]);
  const rowById = useMemo(() => new Map(rows.map((row) => [rowKey(row), row] as const)), [rows]);

  const hasControls = allCollectionIds.length > 0;
  const isAllExpanded = hasControls && allCollectionIds.every((id) => expanded.has(id));

  // Exactly one row is part of the tab order (roving tabindex).
  const activeRowId = activeId && rowById.has(activeId) ? activeId : orderedIds[0] ?? null;

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

  const revealMore = useCallback((id: string) => {
    setRevealed((prev) => {
      const next = new Map(prev);
      next.set(id, (prev.get(id) ?? INITIAL_CHILDREN) + CHILDREN_INCREMENT);
      return next;
    });
  }, []);

  const showFewer = useCallback((id: string) => {
    setRevealed((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  // Expand-all only flips expansion; it never raises reveal budgets, so the DOM stays
  // bounded by the per-collection caps even for a huge document.
  const expandAll = useCallback(() => setExpanded(new Set(allCollectionIds)), [allCollectionIds]);
  const collapseAll = useCallback(() => setExpanded(new Set()), []);

  const focusRow = useCallback((id: string | undefined) => {
    if (!id) return;
    setActiveId(id);
    rowRefs.current.get(id)?.focus();
  }, []);

  const onRowKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>, row: RenderRow) => {
      const index = orderedIds.indexOf(rowKey(row));
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
          if (row.kind === 'pager') {
            if (row.variant === 'more') revealMore(row.collectionId);
            else showFewer(row.collectionId);
          } else if (row.hasChildren && !row.isExpanded) setExpandedFor(row.node.id, true);
          else if (row.hasChildren && row.isExpanded) focusRow(orderedIds[index + 1]);
          break;
        case 'ArrowLeft':
          event.preventDefault();
          if (row.kind === 'node' && row.hasChildren && row.isExpanded) {
            setExpandedFor(row.node.id, false);
          } else if (row.parentId) {
            focusRow(row.parentId);
          }
          break;
        case 'Enter':
        case ' ':
          if (row.kind === 'pager') {
            event.preventDefault();
            if (row.variant === 'more') revealMore(row.collectionId);
            else showFewer(row.collectionId);
          } else if (row.hasChildren) {
            event.preventDefault();
            toggle(row.node.id);
          }
          break;
        default:
          break;
      }
    },
    [orderedIds, focusRow, setExpandedFor, toggle, revealMore, showFewer]
  );

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
                ? i18n.translate('unifiedDataTable.jsonFieldTree.collapseAll', {
                    defaultMessage: 'Collapse all',
                  })
                : i18n.translate('unifiedDataTable.jsonFieldTree.expandAll', {
                    defaultMessage: 'Expand all',
                  })}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}

      <div
        css={[styles.wrapper, codeFontCss]}
        role="tree"
        aria-label={i18n.translate('unifiedDataTable.jsonFieldTree.treeAriaLabel', {
          defaultMessage: 'JSON field tree',
        })}
        data-test-subj="jsonFieldTree"
      >
        {rows.map((row) => {
          const paddingInlineStart = `calc(${euiTheme.size.s} + ${row.depth} * ${euiTheme.size.base})`;

          if (row.kind === 'pager') {
            const isMore = row.variant === 'more';
            const label = isMore
              ? showMoreLabel(row.collectionType, Math.min(CHILDREN_INCREMENT, row.hiddenCount))
              : showFewerLabel(row.collectionType);
            return (
              <div
                key={row.id}
                ref={(element) => {
                  if (element) rowRefs.current.set(row.id, element);
                  else rowRefs.current.delete(row.id);
                }}
                role="treeitem"
                aria-level={row.depth + 1}
                aria-selected={row.id === activeRowId}
                tabIndex={row.id === activeRowId ? 0 : -1}
                css={[styles.row, styles.expandableRow]}
                style={{ paddingInlineStart }}
                onClick={() =>
                  isMore ? revealMore(row.collectionId) : showFewer(row.collectionId)
                }
                onFocus={() => setActiveId(row.id)}
                onKeyDown={(event) => onRowKeyDown(event, row)}
                data-test-subj={`jsonFieldTree${isMore ? 'More' : 'Fewer'}-${row.collectionId}`}
              >
                <span css={styles.caret}>
                  <EuiIcon type={isMore ? 'plus' : 'minus'} size="s" aria-hidden />
                </span>
                <span css={styles.moreLabel}>{label}</span>
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
              data-test-subj={`jsonFieldTreeRow-${node.id}`}
            >
              {hasChildren ? (
                <span css={styles.caret}>
                  <EuiIcon type={isExpanded ? 'arrowDown' : 'arrowRight'} size="s" aria-hidden />
                </span>
              ) : (
                <span css={styles.caret} aria-hidden />
              )}

              <span css={styles.label}>
                {/* Array items are positional, so they render as bare values with no index. */}
                {!node.isArrayItem && <span css={styles.key}>{node.key}</span>}

                {node.kind === 'collection' ? (
                  <span css={styles.count}>
                    <span css={styles.bracket}>{node.collectionType === 'array' ? '[' : '{'}</span>
                    {` ${collectionCountLabel(node)} `}
                    <span css={styles.bracket}>{node.collectionType === 'array' ? ']' : '}'}</span>
                  </span>
                ) : (
                  <>
                    {!node.isArrayItem && <span css={styles.separator}>:</span>}
                    {node.rendered ? (
                      <span css={styles.value}>{node.rendered}</span>
                    ) : (
                      <>
                        <PrimitiveValue primitiveType={node.primitiveType} value={node.value} />
                        <ValueCopyButton value={node.value} />
                      </>
                    )}
                  </>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
});
