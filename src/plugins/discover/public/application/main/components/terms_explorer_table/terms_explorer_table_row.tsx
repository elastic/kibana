/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiTableRow,
  EuiButtonEmpty,
  EuiTableRowCell,
  useEuiTheme,
  EuiTableBody,
  EuiTable,
  EuiTableHeader,
  EuiTableHeaderCell,
} from '@elastic/eui';
import { TestColumnType, TestRowType } from './terms_explorer_table';

interface Props {
  row: TestRowType;
  columns: TestColumnType[];
  expandedColumnName?: string;
}

export const TermsExplorerTableRow = ({ row, columns, expandedColumnName }: Props) => {
  const { euiTheme } = useEuiTheme();

  const [expandedColumn, setExpandedColumn] = useState(expandedColumnName);

  const expandedRowStyle = useMemo(
    () => css`
      padding: 0 ${euiTheme.size.m};
      background-color: ${euiTheme.colors.lightestShade};
    `,
    [euiTheme.size.m, euiTheme.colors.lightestShade]
  );

  const renderCells = () => {
    return columns.map((column) => {
      const cell = row[column.field];

      let child;
      if (column.render) {
        child = column.render(row);
      } else {
        child = cell;
      }

      return (
        <EuiTableRowCell
          truncateText={column.truncateText}
          key={column.id}
          align={column.align}
          isExpander={true}
        >
          {child}
          <EuiButtonEmpty
            iconType={column.field === expandedColumn ? 'arrowUp' : 'arrowDown'}
            aria-expanded={Boolean(expandedColumn)}
            onClick={() =>
              setExpandedColumn(column.field === expandedColumn ? undefined : column.field)
            }
          />
        </EuiTableRowCell>
      );
    });
  };

  const ExpandedRow = () => {
    return (
      <EuiTableRowCell colSpan={columns.length} css={expandedRowStyle}>
        <EuiTable title="test">
          <EuiTableHeader>
            <EuiTableHeaderCell colSpan={columns.length}>
              {`Expanded on ${
                expandedColumn
                  ? `${expandedColumn} with value of ${row[expandedColumn]}`
                  : 'nothing'
              }`}
            </EuiTableHeaderCell>
          </EuiTableHeader>
          <EuiTableBody>
            <TermsExplorerTableRow
              row={row}
              columns={columns}
              css={css`
                width: 100% !important;
              `}
            />
          </EuiTableBody>
        </EuiTable>
      </EuiTableRowCell>
    );
  };

  return (
    <>
      <EuiTableRow>{renderCells()}</EuiTableRow>
      <EuiTableRow isExpandable isExpandedRow={Boolean(expandedColumn)}>
        {Boolean(expandedColumn) && <ExpandedRow />}
      </EuiTableRow>
    </>
  );
};
