/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo, useState } from 'react';
import { css } from '@emotion/react';
import { EuiTableRow, EuiButtonEmpty, EuiTableRowCell, useEuiTheme } from '@elastic/eui';
import {
  TermsExplorerTable,
  TermsExplorerTableProps,
  TestColumnType,
  TestRowType,
} from './terms_explorer_table';

interface Props {
  row: TestRowType;
  columns: TestColumnType[];
  expandedColumnName?: keyof TestRowType;
  termsExplorerTableProps: TermsExplorerTableProps;
}

export const TermsExplorerTableRow = ({
  termsExplorerTableProps,
  row,
  columns,
  expandedColumnName,
}: Props) => {
  const { euiTheme } = useEuiTheme();

  const [expandedColumn, setExpandedColumn] = useState<keyof TestRowType | undefined>(
    expandedColumnName
  );

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
      const isSelectedField = column.field === expandedColumn;

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
          css={css`
            font-weight: ${isSelectedField ? '800' : '400'};
          `}
        >
          {child}
          <EuiButtonEmpty
            iconType={isSelectedField ? 'arrowUp' : 'arrowDown'}
            aria-expanded={Boolean(expandedColumn)}
            onClick={() => setExpandedColumn(isSelectedField ? undefined : column.field)}
          />
        </EuiTableRowCell>
      );
    });
  };

  const ExpandedRow = () => {
    return (
      <EuiTableRowCell colSpan={columns.length} css={expandedRowStyle}>
        <h3>{`Expanded on ${
          expandedColumn ? `${expandedColumn} with value of ${row[expandedColumn]}` : 'nothing'
        }`}</h3>
        <TermsExplorerTable
          {...termsExplorerTableProps}
          filters={[...(termsExplorerTableProps.filters ?? [])]} // TODO: add on the filter we create by opening this table row :)
        />
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
