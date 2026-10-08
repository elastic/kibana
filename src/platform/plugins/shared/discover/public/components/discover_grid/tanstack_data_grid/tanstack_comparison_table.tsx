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
import { formatFieldValueReact } from '@kbn/discover-utils';
import { getDataViewFieldOrCreateFromColumnMeta } from '@kbn/data-view-utils';
import { isEqual } from 'lodash';
import {
  calculateDiff,
  formatDiffValue,
  type CompareDocumentsProps,
  type DocMap,
  type DocumentDiffMode,
} from '@kbn/unified-data-table';

interface ComparisonRow {
  fieldName: string;
}

type TanStackComparisonTableProps = Pick<
  CompareDocumentsProps,
  'ariaLabelledBy' | 'dataView' | 'columnsMeta' | 'fieldFormats'
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
  columnsMeta,
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
          const field = getDataViewFieldOrCreateFromColumnMeta({
            dataView,
            fieldName,
            columnMeta: columnsMeta?.[fieldName],
          });
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
            cell: ({ row }) => {
              const { fieldName } = row.original;
              const value = doc.flattened[fieldName];
              const baseValue = baseDoc?.flattened[fieldName];
              const field = getDataViewFieldOrCreateFromColumnMeta({
                dataView,
                fieldName,
                columnMeta: columnsMeta?.[fieldName],
              });
              const activeDiffMode = showDiff && docIndex > 0 ? diffMode : undefined;
              const basicColor =
                activeDiffMode === 'basic'
                  ? isEqual(baseValue, value)
                    ? euiTheme.colors.textSuccess
                    : euiTheme.colors.textDanger
                  : undefined;
              const content =
                activeDiffMode && activeDiffMode !== 'basic'
                  ? calculateDiff({
                      diffMode: activeDiffMode,
                      baseValue,
                      comparisonValue: value,
                    }).map((change, index) => {
                      const Segment = activeDiffMode === 'lines' ? 'div' : 'span';
                      return (
                        <Segment
                          key={index}
                          css={{
                            backgroundColor: change.added
                              ? euiTheme.colors.backgroundBaseSuccess
                              : change.removed
                              ? euiTheme.colors.backgroundBaseDanger
                              : undefined,
                            color: change.added
                              ? euiTheme.colors.textSuccess
                              : change.removed
                              ? euiTheme.colors.textDanger
                              : undefined,
                            textDecoration:
                              showDiffDecorations && activeDiffMode !== 'lines'
                                ? change.added
                                  ? 'underline'
                                  : change.removed
                                  ? 'line-through'
                                  : undefined
                                : undefined,
                          }}
                        >
                          {showDiffDecorations && activeDiffMode === 'lines'
                            ? change.added
                              ? '+ '
                              : change.removed
                              ? '- '
                              : undefined
                            : undefined}
                          {change.value || '-'}
                        </Segment>
                      );
                    })
                  : activeDiffMode === undefined &&
                    showDiff &&
                    docIndex === 0 &&
                    diffMode !== 'basic'
                  ? formatDiffValue(value, false).value || '-'
                  : formatFieldValueReact({ value, hit: doc.raw, fieldFormats, dataView, field });
              return <span css={{ color: basicColor, whiteSpace: 'pre-wrap' }}>{content}</span>;
            },
          },
        ];
      }),
    ],
    [
      baseDoc,
      columnsMeta,
      dataView,
      diffMode,
      docMap,
      euiTheme.colors,
      fieldFormats,
      replaceSelectedDocs,
      selectedDocIds,
      showDiff,
      showDiffDecorations,
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

  return (
    <div
      ref={scrollRef}
      role="table"
      aria-labelledby={ariaLabelledBy}
      css={{ flex: 1, overflow: 'auto', minHeight: 0 }}
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
                  {flexRender(header.column.columnDef.header, header.getContext())}
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
                    role="cell"
                    css={{
                      width: cell.column.getSize(),
                      flexShrink: 0,
                      padding: euiTheme.size.s,
                      borderBottom: border,
                      borderRight: border,
                      overflowWrap: 'anywhere',
                      backgroundColor:
                        cellIndex === 1 ? euiTheme.colors.backgroundBaseSubdued : undefined,
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
