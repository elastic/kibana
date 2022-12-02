/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useMemo, useState } from 'react';

import { css } from '@emotion/react';
import { PhraseFilter } from '@kbn/es-query';
import { EuiTableRow, EuiTableRowCell, useEuiTheme, EuiBadge, transparentize } from '@elastic/eui';

import { TermsExplorerTable, TermsExplorerTableProps } from './terms_explorer_table';
import { TermsExplorerResponseRow } from '../../../../../common/terms_explorer/types';

interface Props {
  row: TermsExplorerResponseRow;
  columns: string[];
  expandedColumnName?: string;
  expandedRows: Array<() => void>;
  setExpandedRows: (deselectRows: Array<() => void>) => void;
  termsExplorerTableProps: TermsExplorerTableProps;
}

export const TermsExplorerTableRow = ({
  row,
  columns,
  expandedRows,
  setExpandedRows,
  expandedColumnName,
  termsExplorerTableProps,
}: Props) => {
  const { euiTheme } = useEuiTheme();

  const [expandedColumn, setExpandedColumn] = useState<string | undefined>(expandedColumnName);

  const toggleColumn = useCallback(
    (newExpandedColumn?: string) => {
      setExpandedColumn(newExpandedColumn);
      if (newExpandedColumn) {
        setExpandedRows([...[...expandedRows].slice(0, -1), () => setExpandedColumn(undefined)]);
      } else {
        setExpandedRows([...expandedRows].slice(0, -1));
      }
    },
    [setExpandedColumn, setExpandedRows, expandedRows]
  );

  const expandedRowStyle = useMemo(
    () => css`
      padding: 0 ${euiTheme.size.m};
      background-color: ${euiTheme.colors.lightestShade};
    `,
    [euiTheme.size.m, euiTheme.colors.lightestShade]
  );

  const panelStyle = useMemo(
    () => css`
      background-color: ${euiTheme.colors.emptyShade};
      border-left: 1px solid ${euiTheme.colors.lightShade};
      margin-left: ${euiTheme.size.xxl};
    `,
    [euiTheme.colors.emptyShade, euiTheme.colors.lightShade, euiTheme.size.xxl]
  );

  const { collapseFieldName, dataView, filters, breadcrumbs } = termsExplorerTableProps;

  const renderCells = () => {
    return columns.map((column) => {
      const cell = row[column];

      const isSelectedField = column === expandedColumn;

      const child = (() => {
        if (!cell) return '¯\\_(ツ)_/¯';
        if (cell?.result_type === 'string_cardinality') {
          return (
            <EuiBadge
              color={isSelectedField ? 'accent' : 'hollow'}
              iconType={isSelectedField ? 'arrowUp' : 'arrowDown'}
              aria-expanded={isSelectedField}
              onClickAriaLabel="Expand row"
              onClick={() => toggleColumn(isSelectedField ? undefined : column)}
              css={css`
                font-weight: ${isSelectedField ? '800' : '400'};
              `}
            >
              {cell.result} values
            </EuiBadge>
          );
        }
        const field = dataView.getFieldByName(column);
        const fieldFormatter = field && dataView.getFormatterForField(field);
        return fieldFormatter ? fieldFormatter.getConverterFor('text')(cell.result) : cell.result;
      })();

      return (
        <EuiTableRowCell
          truncateText={true}
          key={column}
          align={cell?.result_type === 'numeric_aggregation' ? 'left' : 'center'}
          isExpander={true}
          css={css`
            ${column === collapseFieldName && columns.length > 1
              ? `background-color: ${transparentize(euiTheme.colors.success, 0.15)};`
              : ''}
          `}
        >
          {child}
        </EuiTableRowCell>
      );
    });
  };

  const ExpandedRow = () => {
    if (!expandedColumn) return <></>;
    // expanding a row adds an additional filter to the context.
    const additionalFilter: PhraseFilter = {
      meta: { index: dataView.getIndexPattern() },
      query: {
        match_phrase: {
          [collapseFieldName]: row[collapseFieldName].result as string, // we know this is a string because the group by column is always of type 'string_value'
        },
      },
    };

    return (
      <EuiTableRowCell colSpan={columns.length} css={expandedRowStyle}>
        <div css={panelStyle}>
          <TermsExplorerTable
            {...termsExplorerTableProps}
            isTopLevel={false}
            breadcrumbs={[
              ...(breadcrumbs ?? []),
              `${collapseFieldName} is ${row[collapseFieldName].result}`,
            ]}
            filters={[...(filters ?? []), additionalFilter]}
            collapseFieldName={expandedColumn}
          />
        </div>
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
