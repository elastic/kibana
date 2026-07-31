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

const INITIAL_VISIBLE_ITEMS = 10;
const VISIBLE_ITEMS_INCREMENT = 10;

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

// ---- Flatten visible nodes (drives both rendering order and keyboard navigation) ----

interface FlatRow {
  node: JsonNode;
  depth: number;
  hasChildren: boolean;
  isExpanded: boolean;
  parentId: string | null;
  setSize: number;
  posInSet: number;
}

const flattenVisible = (
  nodes: JsonNode[],
  expanded: ReadonlySet<string>,
  depth: number,
  parentId: string | null,
  out: FlatRow[]
): FlatRow[] => {
  nodes.forEach((node, index) => {
    const hasChildren = node.kind === 'collection' && node.children.length > 0;
    const isExpanded = hasChildren && expanded.has(node.id);
    out.push({
      node,
      depth,
      hasChildren,
      isExpanded,
      parentId,
      setSize: nodes.length,
      posInSet: index + 1,
    });
    if (isExpanded && node.kind === 'collection') {
      flattenVisible(node.children, expanded, depth + 1, node.id, out);
    }
  });
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
      alignItems: 'flex-start',
      gap: euiTheme.size.xs,
      minHeight: euiTheme.size.l,
      paddingBlock: euiTheme.size.xxs,
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
      // nudge the caret onto the text baseline of the row
      marginBlockStart: euiTheme.size.xxs,
    }),
  key: ({ euiTheme }: UseEuiTheme) =>
    css({
      flexShrink: 0,
      color: euiTheme.colors.textParagraph,
      fontWeight: euiTheme.font.weight.medium,
    }),
  separator: ({ euiTheme }: UseEuiTheme) =>
    css({ flexShrink: 0, color: euiTheme.colors.textSubdued, marginInlineEnd: euiTheme.size.xs }),
  count: ({ euiTheme }: UseEuiTheme) =>
    css({ color: euiTheme.colors.textSubdued, marginInlineStart: euiTheme.size.xs }),
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

// ---- Main component ----

export const JsonFieldTree = memo(function JsonFieldTree({ json }: JsonFieldTreeProps) {
  const styles = useMemoCss(treeStyles);
  const { euiTheme } = useEuiTheme();
  const codeFontCss = css(useEuiFontSize('xs'));

  const nodes = useMemo(() => buildNodes(json), [json]);
  const allCollectionIds = useMemo(() => collectCollectionIds(nodes), [nodes]);
  const rootIsArray = Array.isArray(json);

  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_ITEMS);
  const [activeId, setActiveId] = useState<string | null>(null);

  const rowRefs = useRef(new Map<string, HTMLDivElement>());

  const visibleTopLevel = useMemo(
    () => nodes.slice(0, Math.min(visibleCount, nodes.length)),
    [nodes, visibleCount]
  );

  const rows = useMemo(
    () => flattenVisible(visibleTopLevel, expanded, 0, null, []),
    [visibleTopLevel, expanded]
  );

  const orderedIds = useMemo(() => rows.map((row) => row.node.id), [rows]);
  const rowById = useMemo(() => new Map(rows.map((row) => [row.node.id, row])), [rows]);

  const hiddenCount = nodes.length - visibleTopLevel.length;
  const nextChunk = Math.min(VISIBLE_ITEMS_INCREMENT, hiddenCount);
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

  const expandAll = useCallback(() => {
    setExpanded(new Set(allCollectionIds));
    setVisibleCount(nodes.length);
  }, [allCollectionIds, nodes.length]);

  const collapseAll = useCallback(() => setExpanded(new Set()), []);

  const focusRow = useCallback((id: string | undefined) => {
    if (!id) return;
    setActiveId(id);
    rowRefs.current.get(id)?.focus();
  }, []);

  const onRowKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>, row: FlatRow) => {
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
      ? i18n.translate('unifiedDataTable.jsonFieldTree.showMoreItems', {
          defaultMessage: 'Show {count} more {count, plural, one {item} other {items}}',
          values: { count: nextChunk },
        })
      : i18n.translate('unifiedDataTable.jsonFieldTree.showMoreFields', {
          defaultMessage: 'Show {count} more {count, plural, one {field} other {fields}}',
          values: { count: nextChunk },
        }),
    all: rootIsArray
      ? i18n.translate('unifiedDataTable.jsonFieldTree.showAllItems', {
          defaultMessage: 'Show all items',
        })
      : i18n.translate('unifiedDataTable.jsonFieldTree.showAllFields', {
          defaultMessage: 'Show all fields',
        }),
    fewer: rootIsArray
      ? i18n.translate('unifiedDataTable.jsonFieldTree.showFewerItems', {
          defaultMessage: 'Show fewer items',
        })
      : i18n.translate('unifiedDataTable.jsonFieldTree.showFewerFields', {
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
          const { node, depth, hasChildren, isExpanded } = row;
          return (
            <div
              key={node.id}
              ref={(element) => {
                if (element) rowRefs.current.set(node.id, element);
                else rowRefs.current.delete(node.id);
              }}
              role="treeitem"
              aria-level={depth + 1}
              aria-setsize={row.setSize}
              aria-posinset={row.posInSet}
              aria-expanded={hasChildren ? isExpanded : undefined}
              aria-selected={node.id === activeRowId}
              tabIndex={node.id === activeRowId ? 0 : -1}
              css={hasChildren ? [styles.row, styles.expandableRow] : styles.row}
              style={{
                paddingInlineStart: `calc(${euiTheme.size.s} + ${depth} * ${euiTheme.size.base})`,
              }}
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

              {/* Array items are positional, so they render as bare values with no index. */}
              {!node.isArrayItem && <span css={styles.key}>{node.key}</span>}

              {node.kind === 'collection' ? (
                <span css={styles.count}>{collectionCountLabel(node)}</span>
              ) : (
                <>
                  {!node.isArrayItem && <span css={styles.separator}>:</span>}
                  <PrimitiveValue primitiveType={node.primitiveType} value={node.value} />
                  <ValueCopyButton value={node.value} />
                </>
              )}
            </div>
          );
        })}
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
