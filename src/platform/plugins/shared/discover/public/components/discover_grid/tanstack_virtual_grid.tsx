/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
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
import type { UnifiedDataTableProps } from '@kbn/unified-data-table';
import { getTanstackVirtualGridStyles } from './tanstack_virtual_grid.styles';

export interface TanstackVirtualGridProps {
  rows: DataTableRecord[];
  columns: string[];
  dataView: DataView;
  showTimeCol: boolean;
  expandedDoc?: DataTableRecord;
  setExpandedDoc?: UnifiedDataTableProps['setExpandedDoc'];
  renderDocumentView?: UnifiedDataTableProps['renderDocumentView'];
  columnsMeta?: DataTableColumnsMeta;
}

const ROW_HEIGHT = 34;
const OVERSCAN = 10;
const MAX_SUMMARY_FIELDS = 5;

const formatCellValue = (value: unknown): string => {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
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

const buildSummary = (row: DataTableRecord, excludeFields: Set<string>): string => {
  const pairs: string[] = [];
  for (const [key, value] of Object.entries(row.flattened)) {
    if (excludeFields.has(key)) continue;
    if (value === null || value === undefined) continue;
    pairs.push(`${key}: ${formatCellValue(value)}`);
    if (pairs.length >= MAX_SUMMARY_FIELDS) break;
  }
  const remaining = Object.keys(row.flattened).length - pairs.length - excludeFields.size;
  if (remaining > 0) {
    pairs.push(`and ${remaining} more`);
  }
  return pairs.join(' \u00b7 ');
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
    summaryExcludeFields,
    styles,
  }: {
    row: DataTableRecord;
    virtualRow: VirtualItem;
    isDocExpanded: boolean;
    onToggleExpand: (doc: DataTableRecord) => void;
    timeFieldName: string | undefined;
    showTimeCol: boolean;
    summaryExcludeFields: Set<string>;
    styles: ReturnType<typeof getTanstackVirtualGridStyles>;
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

    return (
      <div data-index={virtualRow.index} style={{ height: ROW_HEIGHT }}>
        <div css={styles.virtualRow} role="row" tabIndex={0}>
          {/* expand button */}
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

          {/* timestamp */}
          {showTimeCol && timeFieldName && (
            <div css={styles.timestampCell} role="gridcell" title={String(timestampValue ?? '')}>
              {formatTimestamp(timestampValue)}
            </div>
          )}

          {/* summary */}
          <div css={styles.summaryCell} role="gridcell">
            {buildSummary(row, summaryExcludeFields)}
          </div>
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
  }) => {
    const { euiTheme } = useEuiTheme();
    const parentRef = useRef<HTMLDivElement | null>(null);

    const timeFieldName = dataView.timeFieldName;

    const summaryExcludeFields = useMemo(() => {
      const exclude = new Set<string>();
      if (timeFieldName && showTimeCol) {
        exclude.add(timeFieldName);
      }
      return exclude;
    }, [timeFieldName, showTimeCol]);

    const rowVirtualizer = useVirtualizer({
      count: rows.length,
      getScrollElement: () => parentRef.current,
      estimateSize: () => ROW_HEIGHT,
      overscan: OVERSCAN,
    });

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
            {/* header */}
            <div css={styles.headerRow} role="row">
              <div css={styles.expandHeaderCell} role="columnheader" />
              {showTimeCol && timeFieldName && (
                <div css={styles.timestampHeaderCell} role="columnheader" title={timeFieldName}>
                  {timeFieldName}
                </div>
              )}
              <div css={styles.summaryHeaderCell} role="columnheader" title="Summary">
                Summary
              </div>
            </div>

            {/* virtualised body */}
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
                      summaryExcludeFields={summaryExcludeFields}
                      styles={styles}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* document flyout */}
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
