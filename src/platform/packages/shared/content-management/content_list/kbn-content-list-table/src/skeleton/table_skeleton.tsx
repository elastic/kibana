/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { css } from '@emotion/react';
import {
  EuiSkeletonCircle,
  EuiSkeletonRectangle,
  EuiSkeletonText,
  useEuiTheme,
} from '@elastic/eui';
import { isCustomSkeletonNode, type SkeletonOutput } from '@kbn/content-list-assembly';
import type { ResolvedColumn } from '../hooks/use_columns';

/** Width of the selection checkbox column. */
const CHECKBOX_COLUMN_WIDTH = 32;

const CELL_HEIGHT = 28;
const HEADER_HEIGHT = 36;
const DEFAULT_RECTANGLE_HEIGHT = 16;
export const MAX_SKELETON_ROW_COUNT = 20;

const renderSkeletonCell = (output: SkeletonOutput): React.ReactNode => {
  if (isCustomSkeletonNode(output)) {
    return output.node;
  }

  if (output.shape === 'text') {
    // `EuiSkeletonText` occupies the full width of its container by
    // default; wrap in a fixed-width box to honor the descriptor.
    return (
      <div style={{ width: output.width ?? '100%' }}>
        <EuiSkeletonText lines={output.lines ?? 1} isLoading />
      </div>
    );
  }

  if (output.shape === 'circle') {
    return (
      <EuiSkeletonCircle isLoading size="m" style={{ width: output.size, height: output.size }} />
    );
  }

  // Rectangle is the default.
  return (
    <EuiSkeletonRectangle
      isLoading
      width={output.width ?? '100%'}
      height={output.height ?? DEFAULT_RECTANGLE_HEIGHT}
      borderRadius="s"
    />
  );
};

/**
 * Props for {@link TableSkeleton}.
 */
export interface TableSkeletonProps {
  /** Resolved columns and their skeleton descriptors. */
  columns: ResolvedColumn[];
  /** Whether to prepend the selection checkbox column. */
  hasSelection: boolean;
  /**
   * Desired body row count. Clamped to `1..MAX_SKELETON_ROW_COUNT` so the
   * skeleton tracks page size without creating huge loading placeholders.
   */
  rowCount?: number;
  /** Matches the real table layout. */
  tableLayout: 'fixed' | 'auto';
  /** Matches the real table density. */
  compressed: boolean;
  'data-test-subj'?: string;
}

/**
 * Column-aware loading skeleton shown while the initial table fetch is in
 * flight. Cell shapes come from preset/custom descriptors or column metadata.
 */
export const TableSkeleton = ({
  columns,
  hasSelection,
  rowCount,
  tableLayout,
  compressed,
  'data-test-subj': dataTestSubj = 'content-list-table-skeleton',
}: TableSkeletonProps) => {
  const { euiTheme } = useEuiTheme();

  const tableCss = css`
    width: 100%;
    border-collapse: collapse;
  `;

  const headerCellCss = css`
    padding: ${euiTheme.size.s} ${euiTheme.size.base};
    vertical-align: middle;
  `;

  const bodyCellCss = css`
    padding: ${compressed ? euiTheme.size.xs : euiTheme.size.s} ${euiTheme.size.base};
    vertical-align: middle;
  `;

  const clampedRowCount = Math.min(
    Math.max(rowCount ?? MAX_SKELETON_ROW_COUNT, 1),
    MAX_SKELETON_ROW_COUNT
  );
  const rows = Array.from({ length: clampedRowCount }, (_unused, rowIdx) => rowIdx);

  return (
    <table css={tableCss} style={{ tableLayout }} data-test-subj={dataTestSubj} aria-hidden="true">
      <thead>
        <tr>
          {hasSelection && (
            <th css={headerCellCss} style={{ width: `${CHECKBOX_COLUMN_WIDTH}px` }}>
              <EuiSkeletonRectangle
                isLoading
                width={`${CHECKBOX_COLUMN_WIDTH}px`}
                height={HEADER_HEIGHT}
                borderRadius="s"
              />
            </th>
          )}
          {columns.map((resolved, colIdx) => {
            const colWidth = 'width' in resolved.column ? resolved.column.width : undefined;
            return (
              <th
                key={colIdx}
                css={headerCellCss}
                style={colWidth ? { width: colWidth } : undefined}
              >
                <EuiSkeletonRectangle
                  isLoading
                  width="100%"
                  height={HEADER_HEIGHT}
                  borderRadius="s"
                />
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody>
        {rows.map((rowIdx) => (
          <tr key={rowIdx} data-test-subj={`${dataTestSubj}-row`}>
            {hasSelection && (
              <td css={bodyCellCss} style={{ width: CHECKBOX_COLUMN_WIDTH }}>
                <EuiSkeletonRectangle
                  isLoading
                  width={CHECKBOX_COLUMN_WIDTH}
                  height={CELL_HEIGHT}
                  borderRadius="s"
                />
              </td>
            )}
            {columns.map((resolved, colIdx) => {
              const colWidth = 'width' in resolved.column ? resolved.column.width : undefined;
              return (
                <td
                  key={colIdx}
                  css={bodyCellCss}
                  style={colWidth ? { width: colWidth } : undefined}
                >
                  {renderSkeletonCell(resolved.skeleton)}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
};
