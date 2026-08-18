/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useContext, useMemo } from 'react';
import { EuiIconTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { InTableSearchCellContext } from '@kbn/data-grid-in-table-search';
import type {
  DataTableColumnsMeta,
  DataTableRecord,
  EsHitRecord,
  ShouldShowFieldInTableHandler,
} from '@kbn/discover-utils/types';
import { formatFieldStringValueWithHighlights } from '@kbn/discover-utils';
import { CELL_CLASS } from '../utils/get_render_cell_value';
import { flattenedToNestedDocument, MAX_TREE_VALUES } from '../utils/build_document_tree';
import type { FormatValue } from './json_tree_viewer/json_tree_viewer';
import { JsonTreeViewer, type TreeExpansionState } from './json_tree_viewer/json_tree_viewer';
import { getDocumentText } from './json_tree_viewer/doc_scan';

// Virtualization destroys and recreats cells while navigating, in order to keep which nodes are expanded
// we need to persist the state outside the cell so it survives the remounts.
// Keyed by the raw ES hit so every entry is released automatically once the row is dropped.
const treeExpansionStore = new WeakMap<EsHitRecord, TreeExpansionState>();

export interface SourceDocumentJsonModeProps {
  row: DataTableRecord;
  dataView: DataView;
  columnsMeta: DataTableColumnsMeta | undefined;
  shouldShowFieldHandler: ShouldShowFieldInTableHandler;
  fieldFormats: FieldFormatsStart;
  /** When set, the JSON tree is filtered to these fields; empty = whole document. */
  selectedColumns?: string[];
}

export const SourceDocumentJsonMode = ({
  row,
  dataView,
  columnsMeta,
  shouldShowFieldHandler,
  fieldFormats,
  selectedColumns,
}: SourceDocumentJsonModeProps) => {
  const { inTableSearchTerm, isCounting: isInTableSearchCounting } =
    useContext(InTableSearchCellContext);

  const initialTreeState = useMemo(() => treeExpansionStore.get(row.raw), [row]);
  const onTreeStateChange = useCallback(
    (state: TreeExpansionState) => treeExpansionStore.set(row.raw, state),
    [row]
  );

  // Unflatten the row and process fields for better rendering.
  const { tree: documentTree, truncated } = flattenedToNestedDocument({
    row,
    dataView,
    columnsMeta,
    shouldShowFieldHandler,
    selectedColumns,
  });

  // We just add the highlight formatter, the values are shown raw.
  const formatTreeValue = useMemo<FormatValue>(
    () =>
      ({ value, path }) => {
        if (value === null) return undefined;
        const fieldName = fieldNameFromPath(path);
        if (!row.raw.highlight?.[fieldName]) return undefined;
        return formatFieldStringValueWithHighlights({
          value,
          hit: row.raw,
          fieldFormats,
          dataView,
          fieldName,
        });
      },
    [row, dataView, fieldFormats]
  );

  const truncatedWarning = useMemo(
    () =>
      truncated ? (
        <EuiIconTip
          type="warning"
          color="warning"
          size="s"
          anchorProps={{ css: { display: 'flex' } }}
          iconProps={{ 'data-test-subj': 'sourceDocumentTruncatedWarning' }}
          content={i18n.translate('unifiedDataTable.sourceDocumentJsonMode.truncatedWarning', {
            defaultMessage:
              'JSON is too large to display in full. Only the first {maxValues} values are displayed.',
            values: {
              maxValues: MAX_TREE_VALUES,
            },
          })}
        />
      ) : undefined,
    [truncated]
  );

  // in-table search renders the cells for all given rows for counting matches, this is expensive for the JSONTreeViewer,
  // If we detect this case, we render a light version of the document tree (just text). This is never seen by the user.
  if (isInTableSearchCounting) {
    return <span className={CELL_CLASS}>{getDocumentText(documentTree)}</span>;
  }

  return (
    <span
      className={CELL_CLASS}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.stopPropagation();
          event.currentTarget.closest<HTMLElement>('[role="gridcell"]')?.focus();
        }
      }}
    >
      <JsonTreeViewer
        json={documentTree}
        extraHeaderContent={truncatedWarning}
        initialState={initialTreeState}
        onStateChange={onTreeStateChange}
        expandNodesContainingTerm={inTableSearchTerm}
        formatValue={formatTreeValue}
      />
    </span>
  );
};

const fieldNameFromPath = (path: readonly string[]): string =>
  path.filter((segment) => !/^\d+$/.test(segment)).join('.');
