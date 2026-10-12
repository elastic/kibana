/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, useRef } from 'react';
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { formatFieldValueReact, getDataViewFieldFromDataSource } from '@kbn/discover-utils';
import { isEqual } from 'lodash';
import {
  COMPARISON_ADDED_SEGMENT_CLASS,
  COMPARISON_BASE_CELL_CLASS,
  COMPARISON_DIFF_CELL_CLASS,
  COMPARISON_MATCH_CELL_CLASS,
  COMPARISON_REMOVED_SEGMENT_CLASS,
  COMPARISON_SEGMENT_CLASS,
  DATA_TABLE_CELL_VALUE_CLASS,
  calculateDiff,
  formatDiffValue,
  useComparisonCss,
  type CompareDocumentsProps,
  type DocMap,
  type DocumentDiffMode,
} from '@kbn/unified-data-table';

interface ComparisonRow {
  fieldName: string;
}

type TanStackComparisonTableProps = Pick<
  CompareDocumentsProps,
  'ariaLabelledBy' | 'dataView' | 'dataSource' | 'fieldFormats'
> & {
  comparisonFields: string[];
  selectedDocIds: string[];
  docMap: DocMap;
  showDiff: boolean;
  diffMode: DocumentDiffMode;
  showDiffDecorations: boolean;
  replaceSelectedDocs: (ids: string[]) => void;
};

export const TanStackComparisonTable = ({
  ariaLabelledBy,
  dataView,
  dataSource,
  fieldFormats,
  comparisonFields,
  selectedDocIds,
  docMap,
  showDiff,
  diffMode,
  showDiffDecorations,
  replaceSelectedDocs,
}: TanStackComparisonTableProps) => {
  const { euiTheme } = useEuiTheme();
  const scrollRef = useRef<HTMLDivElement>(null);
  const data = useMemo<ComparisonRow[]>(
    () => comparisonFields.map((fieldName) => ({ fieldName })),
    [comparisonFields]
  );
  const baseDoc = docMap.get(selectedDocIds[0])?.doc;
  const columns = useMemo<ColumnDef<ComparisonRow>[]>(
    () => [
      {
        id: 'field',
        header: i18n.translate('discover.grid.tanStack.comparisonFieldHeaderLabel', {
          defaultMessage: 'Field',
        }),
        size: 200,
        cell: ({ row }) => {
          const { fieldName } = row.original;
          const field = getDataViewFieldFromDataSource({ dataView, dataSource, fieldName });
          return (
            <strong data-test-subj="unifiedDataTableComparisonFieldName">
              {field?.displayName ?? fieldName}
            </strong>
          );
        },
      },
      ...selectedDocIds.flatMap((docId, docIndex): Array<ColumnDef<ComparisonRow>> => {
        const entry = docMap.get(docId);
        if (!entry) return [];
        const { doc, docIndex: resultIndex } = entry;
        const title =
          doc.raw._id ??
          i18n.translate('discover.grid.tanStack.comparisonResultHeaderLabel', {
            defaultMessage: 'Result {resultNumber}',
            values: { resultNumber: resultIndex + 1 },
          });
        return [
          {
            id: docId,
            size: 300,
            header: () => (
              <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
                {docIndex === 0 && (
                  <EuiFlexItem grow={false}>
                    <EuiIcon type="pinFill" aria-hidden={true} />
                  </EuiFlexItem>
                )}
                <EuiFlexItem grow={true}>{title}</EuiFlexItem>
                {docIndex > 0 && (
                  <EuiFlexItem grow={false}>
                    <EuiToolTip
                      disableScreenReaderOutput
                      content={i18n.translate(
                        'discover.grid.tanStack.pinForComparisonButtonLabel',
                        {
                          defaultMessage: 'Pin for comparison',
                        }
                      )}
                    >
                      <EuiButtonIcon
                        iconType="pin"
                        aria-label={i18n.translate(
                          'discover.grid.tanStack.pinForComparisonButtonLabel',
                          {
                            defaultMessage: 'Pin for comparison',
                          }
                        )}
                        onClick={() =>
                          replaceSelectedDocs([
                            docId,
                            ...selectedDocIds.filter((id) => id !== docId),
                          ])
                        }
                      />
                    </EuiToolTip>
                  </EuiFlexItem>
                )}
                {selectedDocIds.length > 2 && (
                  <EuiFlexItem grow={false}>
                    <EuiToolTip
                      disableScreenReaderOutput
                      content={i18n.translate(
                        'discover.grid.tanStack.removeFromComparisonButtonLabel',
                        {
                          defaultMessage: 'Remove from comparison',
                        }
                      )}
                    >
                      <EuiButtonIcon
                        iconType="cross"
                        aria-label={i18n.translate(
                          'discover.grid.tanStack.removeFromComparisonButtonLabel',
                          {
                            defaultMessage: 'Remove from comparison',
                          }
                        )}
                        onClick={() =>
                          replaceSelectedDocs(selectedDocIds.filter((id) => id !== docId))
                        }
                      />
                    </EuiToolTip>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            ),
            // Same markup and class names as UnifiedDataTable's comparison cells, styled by `useComparisonCss`.
            cell: ({ row }) => {
              const { fieldName } = row.original;
              const value = doc.flattened[fieldName];
              const baseValue = baseDoc?.flattened[fieldName];
              const field = getDataViewFieldFromDataSource({ dataView, dataSource, fieldName });
              const activeDiffMode = showDiff ? diffMode : undefined;
              if (!activeDiffMode || activeDiffMode === 'basic') {
                return (
                  <span className={DATA_TABLE_CELL_VALUE_CLASS}>
                    {formatFieldValueReact({ value, hit: doc.raw, fieldFormats, dataView, field })}
                  </span>
                );
              }
              if (docIndex === 0) {
                return (
                  <span className={DATA_TABLE_CELL_VALUE_CLASS}>
                    {formatDiffValue(value, false).value || '-'}
                  </span>
                );
              }
              const SegmentTag = activeDiffMode === 'lines' ? 'div' : 'span';
              return (
                <span className={DATA_TABLE_CELL_VALUE_CLASS}>
                  {calculateDiff({
                    diffMode: activeDiffMode,
                    baseValue,
                    comparisonValue: value,
                  }).map((change, index) => (
                    <SegmentTag
                      key={index}
                      className={[
                        COMPARISON_SEGMENT_CLASS,
                        change.added && COMPARISON_ADDED_SEGMENT_CLASS,
                        change.removed && COMPARISON_REMOVED_SEGMENT_CLASS,
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      {change.value || '-'}
                    </SegmentTag>
                  ))}
                </span>
              );
            },
          },
        ];
      }),
    ],
    [
      baseDoc,
      dataSource,
      dataView,
      diffMode,
      docMap,
      fieldFormats,
      replaceSelectedDocs,
      selectedDocIds,
      showDiff,
    ]
  );
  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() });
  const tableRows = table.getRowModel().rows;
  const virtualizer = useVirtualizer({
    count: tableRows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 48,
    overscan: 5,
  });
  const border = `${euiTheme.border.width.thin} solid ${euiTheme.components.dataGridBorderColor}`;
  const comparisonCss = useComparisonCss({
    diffMode: showDiff ? diffMode : undefined,
    showDiffDecorations,
  });
  const getCellClassName = (docId: string, fieldName: string) => {
    if (docId === selectedDocIds[0]) return COMPARISON_BASE_CELL_CLASS;
    if (!showDiff || diffMode !== 'basic') return undefined;
    return isEqual(baseDoc?.flattened[fieldName], docMap.get(docId)?.doc.flattened[fieldName])
      ? COMPARISON_MATCH_CELL_CLASS
      : COMPARISON_DIFF_CELL_CLASS;
  };

  return (
    <div
      ref={scrollRef}
      role="grid"
      aria-labelledby={ariaLabelledBy}
      aria-rowcount={tableRows.length}
      css={[{ flex: 1, overflow: 'auto', minHeight: 0 }, comparisonCss]}
    >
      <div css={{ width: table.getTotalSize(), minWidth: '100%' }}>
        <div
          role="rowgroup"
          css={{
            position: 'sticky',
            top: 0,
            zIndex: 1,
            backgroundColor: euiTheme.colors.backgroundBaseSubdued,
          }}
        >
          {table.getHeaderGroups().map((group) => (
            <div key={group.id} role="row" css={{ display: 'flex' }}>
              {group.headers.map((header) => (
                <div
                  key={header.id}
                  role="columnheader"
                  css={{
                    width: header.getSize(),
                    flexShrink: 0,
                    padding: euiTheme.size.s,
                    border,
                  }}
                >
                  <span data-test-subj="dataGridHeaderCellTitle">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div role="rowgroup" css={{ position: 'relative', height: virtualizer.getTotalSize() }}>
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const row = tableRows[virtualRow.index];
            return (
              <div
                key={row.id}
                role="row"
                ref={virtualizer.measureElement}
                data-index={virtualRow.index}
                data-grid-row-index={virtualRow.index}
                data-grid-visible-row-index={virtualRow.index}
                css={{
                  display: 'flex',
                  position: 'absolute',
                  top: 0,
                  transform: `translateY(${virtualRow.start}px)`,
                  width: '100%',
                }}
              >
                {row.getVisibleCells().map((cell, cellIndex) => (
                  <div
                    key={cell.id}
                    role="gridcell"
                    className={
                      cellIndex > 0
                        ? getCellClassName(cell.column.id, row.original.fieldName)
                        : undefined
                    }
                    css={{
                      width: cell.column.getSize(),
                      flexShrink: 0,
                      padding: euiTheme.size.s,
                      borderBottom: border,
                      borderRight: border,
                      overflowWrap: 'anywhere',
                    }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
