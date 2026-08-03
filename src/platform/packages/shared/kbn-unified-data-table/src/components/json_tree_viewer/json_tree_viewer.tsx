/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * An accessible, self-contained JSON tree that renders a document as literal JSON.
 *
 * Expansion is controlled in JS and never remounts on expand/collapse-all, so keyboard
 * focus and scroll position are preserved; nodes are navigable with roving-tabindex
 * arrow keys, and each value has a plain icon copy button inside a `div` row (no
 * nested-interactive a11y violations).
 *
 * It renders literal JSON styling: quoted keys, opening/closing braces on their own lines,
 * trailing commas, a `{ N fields }` preview on collapsed nodes, and colour-coded values.
 * Because expansion state lives in JS, the closing bracket is a real interleaved line and
 * the collapsed preview is a plain branch — no `key`-remount, negative-margin, `:has()` or
 * `!important` styling hacks are needed.
 *
 * Large documents are kept cheap by capping *every* collection (the root and each expanded
 * node) at `INITIAL_CHILDREN` rendered children, with an inline "Show N more" row that
 * reveals the next chunk. This bounds the DOM per cell at any depth — Expand-all included —
 * so the grid's own row virtualization is all that's needed; the viewer never virtualizes.
 */

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

// The tree's expand/collapse and "show N more" state, lifted out so a host can persist it across
// remounts (in-table search remounts every cell via a search-term-keyed React `key`).
export interface TreeExpansionState {
  expanded: ReadonlySet<string>;
  revealed: ReadonlyMap<string, number>;
}

export interface JsonTreeViewerProps {
  json: JsonValue;
  /** Seed expand/reveal state on mount — e.g. restored after in-table search remounts the cell. */
  initialState?: TreeExpansionState;
  /** Fires whenever expand/reveal state changes, so a host can persist it across remounts. */
  onStateChange?: (state: TreeExpansionState) => void;
  /**
   * The active in-table search term. Every collection whose subtree contains it is auto-expanded so
   * the match renders — in-table search can only count/highlight rendered DOM text.
   */
  searchTerm?: string;
}

// Each collection (root + every expanded node) renders at most this many children before a
// "Show N more" row appears; revealing bumps the collection's budget by this increment.
const INITIAL_CHILDREN = 10;
const CHILDREN_INCREMENT = 10;

// Stable id for the (container-less) root list, so it can carry its own reveal budget.
const ROOT_ID = 'json-syntax-$root';

const OPEN_BRACKET = { object: '{', array: '[' } as const;
const CLOSE_BRACKET = { object: '}', array: ']' } as const;

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
//
// Every collection is capped at its reveal budget; when a list is truncated a `more` row is
// emitted at the children's depth (before the closing bracket). `more` rows are real,
// focusable treeitems so they stay in the roving-tabindex order.

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

type RenderRow = NodeRow | ClosingRow | PagerRow;

const rowKey = (row: RenderRow) => (row.kind === 'node' ? row.node.id : row.id);

// Closing brackets are presentational; nodes and pager rows are the focusable treeitems.
const isFocusable = (row: RenderRow): row is NodeRow | PagerRow => row.kind !== 'closing';

const flattenRows = (
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
    // Full-length comparison: the last *shown* item still gets a comma when more are hidden.
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
      flattenRows(
        node.children,
        node.id,
        node.collectionType,
        expanded,
        revealed,
        depth + 1,
        node.id,
        out
      );
      out.push({
        kind: 'closing',
        id: `${node.id}__close`,
        depth,
        collectionType: node.collectionType,
        trailingComma,
      });
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
        {node.rendered ? (
          <span css={styles.value}>{node.rendered}</span>
        ) : (
          <PrimitiveValue primitiveType={node.primitiveType} value={node.value} />
        )}
        {trailingComma && <Comma />}
        {!node.rendered && <ValueCopyButton value={node.value} />}
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

// ---- In-table search: auto-expand nodes that contain a match ----
//
// In-table search only sees rendered DOM text, so a value inside a collapsed node is never counted,
// highlighted, or reachable by next/prev. When a term is active we expand every collection whose
// subtree contains it, so the match renders and the grid's own search machinery picks it up. A match
// hidden past a collection's "show more" cap isn't surfaced — a deliberate simplification that keeps
// the rendered DOM bounded by the existing caps rather than tracking per-collection reveal budgets.
//
// The grid counts matches by rendering EVERY row's cell in an offscreen pass on every keystroke, so
// the per-row work must stay cheap. `getDocScan` memoises the built node tree plus a lowercased blob
// of all leaf text in a module WeakMap keyed by the (stable, per-row) document, so the tree is built
// once (not per keystroke) and a single substring check rules out a non-matching document before any
// tree walk — only a matching document pays for `collectContainersWithMatch`.
const EMPTY_ID_SET: ReadonlySet<string> = new Set();

interface DocScan {
  nodes: JsonNode[];
  text: string;
}

const docScanCache = new WeakMap<object, DocScan>();

const buildDocScan = (json: JsonValue): DocScan => {
  const nodes = buildNodes(json);
  const parts: string[] = [];
  const collectText = (node: JsonNode) => {
    // Raw primitive leaves only; a React-node leaf (an ES-query highlight) has no raw text here.
    if (node.kind === 'leaf') {
      if (!node.rendered) parts.push(String(node.value).toLowerCase());
    } else {
      node.children.forEach(collectText);
    }
  };
  nodes.forEach(collectText);
  return { nodes, text: parts.join('\n') };
};

const getDocScan = (json: JsonValue): DocScan => {
  if (typeof json !== 'object' || json === null) {
    return { nodes: buildNodes(json), text: '' };
  }
  const cached = docScanCache.get(json);
  if (cached) return cached;
  const scan = buildDocScan(json);
  docScanCache.set(json, scan);
  return scan;
};

// The ids of every collection whose subtree contains the term — i.e. the nodes to force-open.
const collectContainersWithMatch = (nodes: JsonNode[], termLower: string): ReadonlySet<string> => {
  const matched = new Set<string>();
  const visit = (node: JsonNode): boolean => {
    if (node.kind === 'leaf') {
      return !node.rendered && String(node.value).toLowerCase().includes(termLower);
    }
    // Visit every child (no early return) so all matching collections are recorded.
    let hasMatch = false;
    for (const child of node.children) {
      if (visit(child)) hasMatch = true;
    }
    if (hasMatch) matched.add(node.id);
    return hasMatch;
  };
  nodes.forEach(visit);
  return matched;
};

// ---- Main component ----

export const JsonTreeViewer = memo(function JsonTreeViewer({
  json,
  initialState,
  onStateChange,
  searchTerm,
}: JsonTreeViewerProps) {
  const styles = useMemoCss(treeStyles);
  const { euiTheme } = useEuiTheme();
  const codeFontCss = css(useEuiFontSize('xs'));

  const { nodes, text } = useMemo(() => getDocScan(json), [json]);
  const expandableIds = useMemo(() => collectExpandableIds(nodes), [nodes]);
  const rootType: CollectionType = Array.isArray(json) ? 'array' : 'object';

  // Collections to force-open for the active search term (empty unless the document has a match).
  const searchTermLower = searchTerm?.trim().toLowerCase() ?? '';
  const searchExpanded = useMemo(
    () =>
      searchTermLower && text.includes(searchTermLower)
        ? collectContainersWithMatch(nodes, searchTermLower)
        : EMPTY_ID_SET,
    [nodes, text, searchTermLower]
  );

  const { openBracket, closeBracket } = useMemo(() => {
    if (Array.isArray(json)) return { openBracket: '[', closeBracket: ']' };
    if (isJsonObject(json)) return { openBracket: '{', closeBracket: '}' };
    return { openBracket: null, closeBracket: null };
  }, [json]);

  const [expanded, setExpanded] = useState<ReadonlySet<string>>(
    () => initialState?.expanded ?? new Set()
  );
  const [revealed, setRevealed] = useState<ReadonlyMap<string, number>>(
    () => initialState?.revealed ?? new Map()
  );
  const [activeId, setActiveId] = useState<string | null>(null);

  const rowRefs = useRef(new Map<string, HTMLDivElement>());

  // Mirror expand/reveal state to the host on every change so it can restore the tree after a
  // remount. Held in a ref so a changing callback identity never re-fires the effect; local state
  // stays the render source of truth, so expanding still re-renders only this cell.
  const onStateChangeRef = useRef(onStateChange);
  onStateChangeRef.current = onStateChange;
  useEffect(() => {
    onStateChangeRef.current?.({ expanded, revealed });
  }, [expanded, revealed]);

  // The user's own expansion unioned with the search-driven set. The search set is never persisted
  // (the write-through effect above only mirrors `expanded`/`revealed`), so a query never pollutes
  // the user's expand/collapse state.
  const effectiveExpanded = useMemo(
    () => (searchExpanded.size ? new Set([...expanded, ...searchExpanded]) : expanded),
    [expanded, searchExpanded]
  );

  const rows = useMemo(
    () => flattenRows(nodes, ROOT_ID, rootType, effectiveExpanded, revealed, 0, null, []),
    [nodes, rootType, effectiveExpanded, revealed]
  );

  const orderedIds = useMemo(() => rows.filter(isFocusable).map(rowKey), [rows]);
  const orderedIdSet = useMemo(() => new Set(orderedIds), [orderedIds]);

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
    (id: string) => setExpandedFor(id, !effectiveExpanded.has(id)),
    [effectiveExpanded, setExpandedFor]
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
  const expandAll = useCallback(() => setExpanded(new Set(expandableIds)), [expandableIds]);
  const collapseAll = useCallback(() => setExpanded(new Set()), []);

  const focusRow = useCallback((id: string | undefined) => {
    if (!id) return;
    setActiveId(id);
    rowRefs.current.get(id)?.focus();
  }, []);

  const onRowKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>, row: NodeRow | PagerRow) => {
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
                  data-test-subj={`jsonSyntaxTree${isMore ? 'More' : 'Fewer'}-${row.collectionId}`}
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
    </>
  );
});
