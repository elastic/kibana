/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { memo, useMemo } from 'react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, useEuiFontSize } from '@elastic/eui';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import {
  buildRows,
  collectExpandableIds,
  getRootLayout,
  type FormatValue,
  type JsonValue,
} from './tree_model';
import { collectContainersWithMatch, getDocScan, EMPTY_ID_SET } from './doc_scan';
import {
  useRovingTreeNavigation,
  useTreeExpansion,
  type TreeExpansionState,
} from './use_tree_interaction';
import { ClosingBracketRow, NodeRowView, PagerRowView, treeStyles } from './tree_row_views';

export type { FormatValue, JsonValue } from './tree_model';
export type { TreeExpansionState } from './use_tree_interaction';

export interface JsonTreeViewerProps {
  json: JsonValue;
  /** Seed expand/reveal state on mount — e.g. restored after a virtualized containers remounts. */
  initialState?: TreeExpansionState;
  /** Fires whenever expand/reveal state changes, so a host can persist it across remounts. */
  onStateChange?: (state: TreeExpansionState) => void;
  /**
   * The active in-table search term. Every collection whose subtree contains it is auto-expanded so
   * the match renders — in-table search can only count/highlight rendered DOM text.
   */
  searchTerm?: string;
  /**
   * Function called for each leaf node to render its value.
   */
  formatValue?: FormatValue;
}

export const JsonTreeViewer = memo(function JsonTreeViewer({
  json,
  initialState,
  onStateChange,
  searchTerm,
  formatValue,
}: JsonTreeViewerProps) {
  const styles = useMemoCss(treeStyles);
  const codeFontCss = css(useEuiFontSize('xs'));

  const { nodes, text } = useMemo(() => getDocScan(json), [json]);
  const expandableIds = useMemo(() => collectExpandableIds(nodes), [nodes]);
  const root = useMemo(() => getRootLayout(json), [json]);

  // Collections to force-open for the active search term (empty unless the document has a match).
  const searchTermLower = searchTerm?.trim().toLowerCase() ?? '';
  const searchExpanded = useMemo(
    () =>
      searchTermLower && text.includes(searchTermLower)
        ? collectContainersWithMatch(nodes, searchTermLower)
        : EMPTY_ID_SET,
    [nodes, text, searchTermLower]
  );

  const expansion = useTreeExpansion({
    initialState,
    onStateChange,
    searchExpanded,
    expandableIds,
  });

  const rows = useMemo(
    () => buildRows(nodes, root.type, expansion.effectiveExpanded, expansion.revealed),
    [nodes, root.type, expansion.effectiveExpanded, expansion.revealed]
  );

  const nav = useRovingTreeNavigation(rows, expansion);

  const { hasControls, isAllExpanded, expandAll, collapseAll, toggle, activatePager, showFewer } =
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
        {root.brackets && <div css={styles.rootBracket}>{root.brackets.open}</div>}

        <div
          role="tree"
          aria-label={i18n.translate('unifiedDataTable.jsonSyntaxTree.treeAriaLabel', {
            defaultMessage: 'JSON tree view',
          })}
          data-test-subj="jsonSyntaxTree"
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
                  onActivate={() => activatePager(row)}
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

        {root.brackets && <div css={styles.rootBracket}>{root.brackets.close}</div>}
      </div>
    </>
  );
});
