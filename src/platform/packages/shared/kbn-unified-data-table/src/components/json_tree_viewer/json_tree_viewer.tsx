/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { memo, useCallback, useMemo, type ReactNode } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, useEuiMemoizedStyles } from '@elastic/eui';
import {
  buildNodes,
  buildRows,
  collectDefaultExpansionSeed,
  collectExpandableIds,
  MAX_RENDERED_NODES,
  rootToJsonString,
  type FormatValue,
  type GetLeafActions,
  type JsonValue,
} from './tree_model';
import { collectSearchMatches, EMPTY_SEARCH_MATCHES } from './doc_scan';
import {
  useRovingTreeNavigation,
  useTreeExpansion,
  type TreeExpansionState,
} from './use_tree_interaction';
import {
  ClosingBracketRow,
  CopyAllButton,
  EmptyRootPlaceholder,
  NodeRowView,
  PagerRowView,
  treeStyles,
} from './tree_rows';

export type { FormatValue, GetLeafActions, JsonTreeRowAction, JsonValue } from './tree_model';
export type { TreeExpansionState } from './use_tree_interaction';

export interface JsonTreeViewerProps {
  json: JsonValue;
  /** Seed expand/reveal state on mount — e.g. restored after a virtualized containers remounts. */
  initialState?: TreeExpansionState;
  /** Fires whenever expand/reveal state changes, so a host can persist it across remounts. */
  onStateChange?: (state: TreeExpansionState) => void;
  /**
   * Every collection whose subtree contains it, is auto-expanded so that
   * the matched value renders. Used to expand nodes when searching.
   */
  expandNodesContainingTerm?: string;
  /**
   * Function called for each leaf node to render its value. Used by highlighting.
   */
  formatValue?: FormatValue;
  /** Actions appended after the copy button at each leaf node. */
  getLeafActions?: GetLeafActions;
  /** Optional extra content rendered in the tree's header row, next to the expand/collapse control. */
  extraHeaderContent?: ReactNode;
  /** When false, leaf values render on a single truncated line instead of wrapping. Defaults to true. */
  wrapLines?: boolean;
  /** How many nodes to render by default (≈ one line each); seeds the initial expansion, split breadth-first across the lists. */
  defaultRenderedNodes?: number;
}

export const JsonTreeViewer = memo(function JsonTreeViewer({
  json,
  initialState,
  onStateChange,
  expandNodesContainingTerm,
  formatValue,
  getLeafActions,
  extraHeaderContent,
  wrapLines = true,
  defaultRenderedNodes = 0,
}: JsonTreeViewerProps) {
  const styles = useEuiMemoizedStyles(treeStyles);

  const nodes = useMemo(() => buildNodes(json), [json]);

  const expandableIds = useMemo(() => collectExpandableIds(nodes), [nodes]);

  // The initial expand/reveal state for a fresh cell: open collections and lift pagers breadth-first
  // until about `defaultRenderedNodes` nodes are rendered.
  const expansionSeed = useMemo(
    () => collectDefaultExpansionSeed(nodes, Math.min(defaultRenderedNodes, MAX_RENDERED_NODES)),
    [nodes, defaultRenderedNodes]
  );

  const searchTermLower = expandNodesContainingTerm?.trim().toLowerCase() ?? '';
  const searchMatches = useMemo(
    () => (searchTermLower ? collectSearchMatches(nodes, searchTermLower) : EMPTY_SEARCH_MATCHES),
    [nodes, searchTermLower]
  );

  const expansion = useTreeExpansion({
    initialState,
    onStateChange,
    expandedBySearchNodes: searchMatches.containers,
    expandableIds,
    expansionSeed,
    defaultRenderedNodes,
  });

  const rootType = useMemo(() => (Array.isArray(json) ? 'array' : 'object'), [json]);
  const copyAllText = useCallback(() => rootToJsonString(nodes, rootType), [nodes, rootType]);

  const rows = useMemo(
    () =>
      buildRows(
        nodes,
        rootType,
        expansion.effectiveExpanded,
        expansion.revealed,
        searchMatches.reveals
      ),
    [nodes, rootType, expansion.effectiveExpanded, expansion.revealed, searchMatches.reveals]
  );

  const nav = useRovingTreeNavigation(rows, expansion);

  const {
    hasControls,
    isAllExpanded,
    expandAll,
    collapseAll,
    toggle,
    expandIds,
    revealMore,
    showFewer,
  } = expansion;
  const { activeRowId, setActive, registerRow, onRowKeyDown, onControlKeyDown, firstControlRef } =
    nav;

  return (
    <>
      <EuiFlexGroup
        className="jsonTreeViewerHeader"
        alignItems="center"
        gutterSize="xs"
        responsive={false}
      >
        {hasControls && (
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              buttonRef={firstControlRef}
              className="jsonTreeViewerHeaderControl"
              flush="left"
              iconType={isAllExpanded ? 'fold' : 'unfold'}
              iconSize="s"
              onClick={isAllExpanded ? collapseAll : expandAll}
              onKeyDown={onControlKeyDown}
              size="xs"
              color="text"
              data-test-subj="jsonTreeViewerExpandAll"
            >
              {isAllExpanded
                ? i18n.translate('unifiedDataTable.jsonTreeViewer.collapseAll', {
                    defaultMessage: 'Collapse all',
                  })
                : i18n.translate('unifiedDataTable.jsonTreeViewer.expandAll', {
                    defaultMessage: 'Expand all',
                  })}
            </EuiButtonEmpty>
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={false}>
          <CopyAllButton
            getText={copyAllText}
            onKeyDown={onControlKeyDown}
            buttonRef={hasControls ? undefined : firstControlRef}
          />
        </EuiFlexItem>
        {extraHeaderContent && <EuiFlexItem grow={false}>{extraHeaderContent}</EuiFlexItem>}
      </EuiFlexGroup>

      <div css={[styles.wrapper, wrapLines ? styles.wrap : styles.noWrap]}>
        <div
          role="tree"
          aria-label={i18n.translate('unifiedDataTable.jsonTreeViewer.treeAriaLabel', {
            defaultMessage: 'JSON tree view',
          })}
          data-test-subj="jsonTreeViewer"
        >
          {rows.length === 0 ? (
            <EmptyRootPlaceholder collectionType={rootType} />
          ) : (
            rows.map((row) => {
              if (row.kind === 'closing') {
                return <ClosingBracketRow key={row.id} row={row} />;
              }
              if (row.kind === 'pager') {
                return (
                  <PagerRowView
                    key={row.id}
                    row={row}
                    isActive={row.id === activeRowId}
                    rowRef={registerRow(row.id)}
                    onShowMore={() => revealMore(row.collectionId)}
                    onShowFewer={() => showFewer(row.collectionId)}
                    onFocus={() => setActive(row.id)}
                    onKeyDown={(event) => onRowKeyDown(event, row)}
                  />
                );
              }
              return (
                <NodeRowView
                  key={row.node.id}
                  row={row}
                  isActive={row.node.id === activeRowId}
                  rowRef={registerRow(row.node.id)}
                  onActivate={(event) => {
                    if (!row.hasChildren) return;
                    // Cmd/Ctrl-click expands the whole subtree
                    if (event.metaKey || event.ctrlKey) {
                      expandIds(collectExpandableIds([row.node]));
                    } else {
                      toggle(row.node.id);
                    }
                  }}
                  onFocus={() => setActive(row.node.id)}
                  onKeyDown={(event) => onRowKeyDown(event, row)}
                  formatValue={formatValue}
                  getLeafActions={getLeafActions}
                />
              );
            })
          )}
        </div>
      </div>
    </>
  );
});
