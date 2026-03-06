/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useVirtualizer, type VirtualItem } from '@tanstack/react-virtual';
import {
  EuiBadge,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { DataTableRecord, DataTableColumnsMeta } from '@kbn/discover-utils';
import { getShouldShowFieldHandler } from '@kbn/discover-utils';
import { SourceDocument } from '@kbn/unified-data-table';
import type { UnifiedDataTableProps } from '@kbn/unified-data-table';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { AggregateQuery } from '@kbn/es-query';
import { getTanstackVirtualGridStyles } from './tanstack_virtual_grid.styles';
import { useDiscoverServices } from '../../hooks/use_discover_services';

export interface TanstackVirtualGridProps {
  rows: DataTableRecord[];
  columns: string[];
  dataView: DataView;
  showTimeCol: boolean;
  expandedDoc?: DataTableRecord;
  setExpandedDoc?: UnifiedDataTableProps['setExpandedDoc'];
  renderDocumentView?: UnifiedDataTableProps['renderDocumentView'];
  columnsMeta?: DataTableColumnsMeta;
  query?: AggregateQuery;
}

interface StatsByInfo {
  byFields: string[];
  orderedColumns: string[];
}

/**
 * Parses a STATS ... BY query and reorders columns:
 * BY fields first, then count-like fields, then remaining aggregations.
 */
const parseStatsByColumns = (
  query: AggregateQuery | undefined,
  columns: string[]
): StatsByInfo | undefined => {
  if (!query || !('esql' in query)) return undefined;

  const esql = query.esql;
  const byMatch = esql.match(/\bSTATS\b[\s\S]+?\bBY\b\s+(.+?)(?:\||$)/i);
  if (!byMatch) return undefined;

  // Strip trailing comments (// or /* ... */) from the BY clause
  const byClause = byMatch[1].replace(/\/\/.*$|\/\*[\s\S]*?\*\//g, '');

  const byFields = byClause
    .split(',')
    .map((f) => f.trim())
    .filter(Boolean);

  if (byFields.length === 0) return undefined;

  const bySet = new Set(byFields);
  const countFields: string[] = [];
  const otherFields: string[] = [];

  for (const col of columns) {
    if (col === '_source') continue;
    if (bySet.has(col)) continue;
    if (/count/i.test(col)) {
      countFields.push(col);
    } else {
      otherFields.push(col);
    }
  }

  const orderedColumns = [...byFields, ...countFields, ...otherFields].filter((col) =>
    columns.includes(col)
  );

  return { byFields, orderedColumns };
};

const ROW_HEIGHT = 90;
const OVERSCAN = 10;
const MAX_SUMMARY_FIELDS = 80;

const scrollPositionCache = new Map<string, number>();

/**
 * Returns a shallow copy of the row with null/undefined values removed from flattened,
 * so formatHit only counts and renders fields that actually have data.
 */
const filterNullFields = (row: DataTableRecord): DataTableRecord => {
  const filtered: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row.flattened)) {
    if (value !== null && value !== undefined) {
      filtered[key] = value;
    }
  }
  return { ...row, flattened: filtered };
};

const formatTimestamp = (value: unknown): string => {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'string') {
    try {
      return new Date(value).toISOString();
    } catch {
      return value;
    }
  }
  return String(value);
};

const formatCellValue = (value: unknown): string => {
  if (value === null || value === undefined) return '-';
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
};

/**
 * A single virtualised row, extracted to avoid closure allocations in the hot path.
 */
const VirtualRow = React.memo(
  ({
    row,
    virtualRow,
    isDocExpanded,
    onToggleExpand,
    timeFieldName,
    showTimeCol,
    dataView,
    fieldFormats,
    shouldShowFieldHandler,
    columnsMeta,
    styles,
    statsByInfo,
    rowHeight,
  }: {
    row: DataTableRecord;
    virtualRow: VirtualItem;
    isDocExpanded: boolean;
    onToggleExpand: (doc: DataTableRecord) => void;
    timeFieldName: string | undefined;
    showTimeCol: boolean;
    dataView: DataView;
    fieldFormats: FieldFormatsStart;
    shouldShowFieldHandler: (fieldName: string) => boolean;
    columnsMeta: DataTableColumnsMeta | undefined;
    styles: ReturnType<typeof getTanstackVirtualGridStyles>;
    statsByInfo: StatsByInfo | undefined;
    rowHeight: number;
  }) => {
    const handleExpandClick = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onToggleExpand(row);
      },
      [onToggleExpand, row]
    );

    const handleExpandKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          onToggleExpand(row);
        }
      },
      [onToggleExpand, row]
    );

    const timestampValue = timeFieldName ? row.flattened[timeFieldName] : undefined;
    const filteredRow = useMemo(() => filterNullFields(row), [row]);

    return (
      <div data-index={virtualRow.index} style={{ height: rowHeight }}>
        <div css={styles.virtualRow} role="row" tabIndex={0}>
          <div css={styles.expandCell} role="gridcell">
            <EuiButtonIcon
              size="xs"
              iconSize="s"
              aria-label="Toggle document details"
              data-test-subj="docTableExpandToggleColumn"
              onClick={handleExpandClick}
              onKeyDown={handleExpandKeyDown}
              color={isDocExpanded ? 'primary' : 'text'}
              iconType={isDocExpanded ? 'minimize' : 'expand'}
              isSelected={isDocExpanded}
            />
          </div>

          {statsByInfo ? (
            statsByInfo.orderedColumns.map((col) => {
              const val = row.flattened[col];
              const isByField = statsByInfo.byFields.includes(col);
              return (
                <div
                  key={col}
                  css={isByField ? styles.byCell : styles.aggCell}
                  role="gridcell"
                  title={formatCellValue(val)}
                >
                  {formatCellValue(val)}
                </div>
              );
            })
          ) : (
            <>
              {showTimeCol && timeFieldName && (
                <div
                  css={styles.timestampCell}
                  role="gridcell"
                  title={String(timestampValue ?? '')}
                >
                  {formatTimestamp(timestampValue)}
                </div>
              )}
              <div css={styles.summaryCell} role="gridcell">
                <SourceDocument
                  useTopLevelObjectColumns={false}
                  row={filteredRow}
                  columnId="_source"
                  dataView={dataView}
                  shouldShowFieldHandler={shouldShowFieldHandler}
                  maxEntries={MAX_SUMMARY_FIELDS}
                  fieldFormats={fieldFormats}
                  columnsMeta={columnsMeta}
                  isCompressed
                />
              </div>
            </>
          )}
        </div>
      </div>
    );
  }
);

/**
 * Lightweight POC grid backed by @tanstack/react-virtual (no EuiDataGrid).
 * Activated by adding a comment containing "tanstack" in an ES|QL query.
 * Used purely for A-B testing virtualisation performance.
 */
const STATS_ROW_HEIGHT = 34;

export const TanstackVirtualGrid: React.FC<TanstackVirtualGridProps> = React.memo(
  ({
    rows,
    dataView,
    showTimeCol,
    expandedDoc,
    setExpandedDoc,
    renderDocumentView,
    columnsMeta,
    columns,
    query,
  }) => {
    const { euiTheme } = useEuiTheme();
    const { fieldFormats } = useDiscoverServices();
    const parentRef = useRef<HTMLDivElement | null>(null);

    const scrollKey = dataView.id ?? dataView.title;

    const timeFieldName = dataView.timeFieldName;

    const statsByInfo = useMemo(() => parseStatsByColumns(query, columns), [query, columns]);
    const rowHeight = statsByInfo ? STATS_ROW_HEIGHT : ROW_HEIGHT;

    const shouldShowFieldHandler = useMemo(() => {
      const dataViewFields = dataView.fields.getAll().map((fld) => fld.name);
      return getShouldShowFieldHandler(dataViewFields, dataView, true);
    }, [dataView]);

    const rowVirtualizer = useVirtualizer({
      count: rows.length,
      getScrollElement: () => parentRef.current,
      estimateSize: () => rowHeight,
      overscan: OVERSCAN,
      initialOffset: scrollPositionCache.get(scrollKey) ?? 0,
    });

    useEffect(() => {
      const scrollEl = parentRef.current;
      if (!scrollEl) return;

      let rafId: number;
      const handleScroll = () => {
        cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          scrollPositionCache.set(scrollKey, scrollEl.scrollTop);
        });
      };

      scrollEl.addEventListener('scroll', handleScroll, { passive: true });
      return () => {
        cancelAnimationFrame(rafId);
        scrollEl.removeEventListener('scroll', handleScroll);
      };
    }, [scrollKey]);

    const [localExpandedDoc, setLocalExpandedDoc] = useState<DataTableRecord | undefined>();
    const currentExpandedDoc = expandedDoc ?? localExpandedDoc;

    const toggleExpandDoc = useCallback(
      (doc: DataTableRecord) => {
        const next = currentExpandedDoc?.id === doc.id ? undefined : doc;
        if (setExpandedDoc) {
          setExpandedDoc(next);
        } else {
          setLocalExpandedDoc(next);
        }
      },
      [currentExpandedDoc, setExpandedDoc]
    );

    const styles = useMemo(() => getTanstackVirtualGridStyles(euiTheme), [euiTheme]);

    const virtualItems = rowVirtualizer.getVirtualItems();

    const canRenderDocumentView = Boolean(setExpandedDoc && renderDocumentView);

    return (
      <div css={styles.wrapper}>
        <div css={styles.toolbar}>
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiBadge color="accent">TanStack Virtual POC</EuiBadge>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs">
                {rows.length} rows &middot; overscan {OVERSCAN} &middot; rendered{' '}
                {virtualItems.length}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>

        <div css={styles.contentArea}>
          <div ref={parentRef} css={styles.scrollContainer} role="grid">
            <div css={styles.headerRow} role="row">
              <div css={styles.expandHeaderCell} role="columnheader" />
              {statsByInfo ? (
                statsByInfo.orderedColumns.map((col) => {
                  const isByField = statsByInfo.byFields.includes(col);
                  return (
                    <div
                      key={col}
                      css={isByField ? styles.byHeaderCell : styles.aggHeaderCell}
                      role="columnheader"
                      title={col}
                    >
                      {col}
                    </div>
                  );
                })
              ) : (
                <>
                  {showTimeCol && timeFieldName && (
                    <div css={styles.timestampHeaderCell} role="columnheader" title={timeFieldName}>
                      {timeFieldName}
                    </div>
                  )}
                  <div css={styles.summaryHeaderCell} role="columnheader" title="Summary">
                    Summary
                  </div>
                </>
              )}
            </div>

            <div css={styles.virtualOuter} style={{ height: rowVirtualizer.getTotalSize() }}>
              <div
                css={styles.virtualInner}
                style={{ transform: `translateY(${virtualItems[0]?.start ?? 0}px)` }}
              >
                {virtualItems.map((virtualRow) => {
                  const row = rows[virtualRow.index];
                  return (
                    <VirtualRow
                      key={virtualRow.key}
                      row={row}
                      virtualRow={virtualRow}
                      isDocExpanded={currentExpandedDoc?.id === row.id}
                      onToggleExpand={toggleExpandDoc}
                      timeFieldName={timeFieldName}
                      showTimeCol={showTimeCol}
                      dataView={dataView}
                      fieldFormats={fieldFormats}
                      shouldShowFieldHandler={shouldShowFieldHandler}
                      columnsMeta={columnsMeta}
                      styles={styles}
                      statsByInfo={statsByInfo}
                      rowHeight={rowHeight}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {canRenderDocumentView && currentExpandedDoc && (
            <span className="dscTable__flyout">
              {renderDocumentView!(currentExpandedDoc, rows, columns, setExpandedDoc!, columnsMeta)}
            </span>
          )}
        </div>
      </div>
    );
  }
);
