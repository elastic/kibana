/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { memo, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import {
  buildNodes,
  buildRows,
  collectExpandableIds,
  type FormatValue,
  type JsonValue,
} from './tree_model';
import { collectContainersWithMatch, EMPTY_ID_SET } from './doc_scan';
import {
  useRovingTreeNavigation,
  useTreeExpansion,
  type TreeExpansionState,
} from './use_tree_interaction';
import { ClosingBracketRow, NodeRowView, PagerRowView, treeStyles } from './tree_rows';

export type { FormatValue, JsonValue } from './tree_model';
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
}

export const JsonTreeViewer = memo(function JsonTreeViewer({
  json,
  initialState,
  onStateChange,
  expandNodesContainingTerm,
  formatValue,
}: JsonTreeViewerProps) {
  const styles = useMemoCss(treeStyles);

  const nodes = useMemo(() => buildNodes(json), [json]);
  const expandableIds = useMemo(() => collectExpandableIds(nodes), [nodes]);

  const searchTermLower = expandNodesContainingTerm?.trim().toLowerCase() ?? '';
  const expandedBySearchNodes = useMemo(
    () => (searchTermLower ? collectContainersWithMatch(nodes, searchTermLower) : EMPTY_ID_SET),
    [nodes, searchTermLower]
  );

  const expansion = useTreeExpansion({
    initialState,
    onStateChange,
    expandedBySearchNodes,
    expandableIds,
  });

  const rootType = useMemo(() => (Array.isArray(json) ? 'array' : 'object'), [json]);

  const rows = useMemo(
    () => buildRows(nodes, rootType, expansion.effectiveExpanded, expansion.revealed),
    [nodes, rootType, expansion.effectiveExpanded, expansion.revealed]
  );

  const nav = useRovingTreeNavigation(rows, expansion);

  const { hasControls, isAllExpanded, expandAll, collapseAll, toggle, revealMore, showFewer } =
    expansion;
  const { activeRowId, setActive, registerRow, onRowKeyDown, onControlKeyDown, expandAllRef } = nav;

  return (
    <>
      {hasControls && (
        <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              buttonRef={expandAllRef}
              flush="left"
              iconType={isAllExpanded ? 'fold' : 'unfold'}
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
        </EuiFlexGroup>
      )}

      <div css={styles.wrapper}>
        <div
          role="tree"
          aria-label={i18n.translate('unifiedDataTable.jsonTreeViewer.treeAriaLabel', {
            defaultMessage: 'JSON tree view',
          })}
          data-test-subj="jsonTreeViewer"
        >
          {rows.map((row) => {
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
                onActivate={() => row.hasChildren && toggle(row.node.id)}
                onFocus={() => setActive(row.node.id)}
                onKeyDown={(event) => onRowKeyDown(event, row)}
                formatValue={formatValue}
              />
            );
          })}
        </div>
      </div>
    </>
  );
});
