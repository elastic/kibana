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
} from '@elastic/eui';
import { TestColumnType, TestRowType } from './terms_explorer_table';

interface Props {
  row: TestRowType;
  columns: TestColumnType[];
}

export const TermsExplorerTableRow = ({ row, columns }: Props) => {
  const { euiTheme } = useEuiTheme();

  const [isExpanded, setIsExpanded] = useState(false);

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
        <EuiTableRowCell truncateText={column.truncateText} key={column.id} align={column.align}>
          {child}
        </EuiTableRowCell>
      );
    });
  };

  const ExpandedRow = () => {
    return (
      <EuiTableRowCell colSpan={columns.length + 1} css={expandedRowStyle}>
        <EuiTable>
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
      <EuiTableRow>
        {renderCells()}
        <EuiTableRowCell isExpander textOnly={false}>
          <EuiButtonEmpty
            iconType={isExpanded ? 'arrowUp' : 'arrowDown'}
            aria-expanded={isExpanded}
            onClick={() => setIsExpanded(!isExpanded)}
          />
        </EuiTableRowCell>
      </EuiTableRow>
      <EuiTableRow isExpandable isExpandedRow={isExpanded}>
        {isExpanded && <ExpandedRow />}
      </EuiTableRow>
    </>
  );
};
