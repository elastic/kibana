/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { css } from '@emotion/react';
import React, { useEffect, useState } from 'react';

import { Filter, Query, AggregateQuery, buildEsQuery, TimeRange } from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/public';
import {
  EuiSpacer,
  EuiTitle,
  EuiTable,
  EuiTableBody,
  EuiTableHeader,
  EuiTableHeaderCell,
  EuiBadge,
  EuiButtonIcon,
  EuiText,
  EuiTableFooter,
  EuiTableFooterCell,
} from '@elastic/eui';
import { TermsExplorerTableRow } from './terms_explorer_table_row';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import {
  TermsExplorerRequest,
  TermsExplorerResponse,
} from '../../../../../common/terms_explorer/types';

export interface TermsExplorerTableProps {
  /**
   * Determines which columns are displayed
   */
  columns: string[];
  /**
   * Determines which field the table is collapsed on
   */
  collapseFieldName: string;
  /**
   * The used data view
   */
  dataView: DataView;
  /**
   * Optional query to update the table content
   */
  query?: Query | AggregateQuery;
  /**
   * Filters query to update the table content
   */
  filters?: Filter[];

  timeRange?: TimeRange;

  breadcrumbs?: string[];

  isTopLevel: boolean;
}

export const TermsExplorerTable = (tableProps: TermsExplorerTableProps) => {
  const { dataView, columns, collapseFieldName, timeRange, filters, query, breadcrumbs } =
    tableProps;

  const services = useDiscoverServices();
  const {
    http,
    data: {
      query: {
        timefilter: { timefilter: timeService },
      },
    },
  } = services;

  const [rows, setRows] = useState<TermsExplorerResponse['rows'] | undefined>();
  const [summaryRow, setSummaryRow] = useState<TermsExplorerResponse['summaryRow'] | undefined>();
  const [totalRows, setTotalRows] = useState<number>(0);
  const [currentFrom, setCurrentFrom] = useState<number>(0);

  const renderHeaderCells = () => {
    return columns.map((column) => (
      <EuiTableHeaderCell key={column} align={'center'}>
        {column}
      </EuiTableHeaderCell>
    ));
  };

  const pageSize = 10;

  useEffect(() => {
    const timeFilter = timeRange ? timeService.createFilter(dataView, timeRange) : undefined;
    const filtersToUse = [...(filters ?? []), ...(timeFilter ? [timeFilter] : [])];
    const esFilters = [buildEsQuery(dataView, query ?? [], filtersToUse ?? [])];

    (async () => {
      if (!collapseFieldName) return;

      const termsExplorerRequestBody: TermsExplorerRequest = {
        from: currentFrom,
        size: pageSize,
        collapseFieldName,
        filters: esFilters,
        columns: columns.reduce((columnsMap, columnName) => {
          if (!columnsMap) columnsMap = {};
          const fieldSpec = dataView.getFieldByName(columnName)?.toSpec();
          if (fieldSpec) {
            columnsMap[columnName] = fieldSpec;
          }
          return columnsMap;
        }, {} as TermsExplorerRequest['columns']),
      };
      const response = await http.fetch<TermsExplorerResponse>(
        `/api/kibana/discover/termsExplorer/${dataView.getIndexPattern()}`,
        {
          body: JSON.stringify(termsExplorerRequestBody),
          method: 'POST',
        }
      );
      setRows(response.rows);
      setTotalRows(response.totalRows);
      setSummaryRow(response.summaryRow);
    })();
  }, [
    collapseFieldName,
    timeService,
    currentFrom,
    timeRange,
    dataView,
    pageSize,
    filters,
    columns,
    query,
    http,
  ]);

  const renderRows = () => {
    const renderedRows = [];
    if (!rows) return;

    for (const row of Object.values(rows)) {
      renderedRows.push(
        <TermsExplorerTableRow row={row} columns={columns} termsExplorerTableProps={tableProps} />
      );
    }

    return renderedRows;
  };

  const renderFooterCells = () => {
    if (!summaryRow) return;
    return columns.map((columnName) => {
      const numericSummary = summaryRow[columnName];
      const summaryContent = (() => {
        if (numericSummary) {
          const field = dataView.getFieldByName(columnName);
          const fieldFormatter = field && dataView.getFormatterForField(field);
          return fieldFormatter
            ? fieldFormatter.getConverterFor('text')(numericSummary.result)
            : numericSummary.result;
        }
        return columnName;
      })();
      return (
        <EuiTableFooterCell
          key={`summary_${columnName}`}
          align={numericSummary ? 'left' : 'center'}
        >
          {summaryContent}
        </EuiTableFooterCell>
      );
    });
  };

  const crumbs = breadcrumbs
    ?.map<React.ReactNode>((crumb) => (
      <EuiBadge className="termsExplorerTable__titleBadge">{crumb}</EuiBadge>
    ))
    .reduce((prev, current) => [prev, <span> and </span>, current]);

  return (
    <>
      <EuiSpacer size="xl" />
      <EuiTitle
        size="xxs"
        css={css`
          margin-left: 15px;
        `}
      >
        <p>
          <span>
            Unique values of{' '}
            <EuiBadge className="termsExplorerTable__titleBadge">{collapseFieldName}</EuiBadge>
          </span>
          <span>
            {crumbs ? ' where ' : ''} {crumbs}
          </span>
        </p>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiTable id={'table-id'}>
        <EuiTableHeader>{renderHeaderCells()}</EuiTableHeader>

        <EuiTableBody>{renderRows()}</EuiTableBody>

        <EuiTableFooter>{renderFooterCells()}</EuiTableFooter>
      </EuiTable>
      <div
        css={css`
          width: 100%;
          display: flex;
          justify-content: end;
          align-items: center;
          padding: 5px;
        `}
      >
        <EuiButtonIcon
          iconType="arrowStart"
          display="empty"
          disabled={currentFrom === 0}
          onClick={() => setCurrentFrom(0)}
        />
        <EuiButtonIcon
          iconType="arrowLeft"
          display="empty"
          disabled={currentFrom === 0}
          onClick={() =>
            setCurrentFrom((from) => {
              return from - pageSize;
            })
          }
        />
        <EuiText size="xs">
          <p>
            {currentFrom + 1}-{Math.min(currentFrom + pageSize, totalRows)} of {totalRows}
          </p>
        </EuiText>
        <EuiButtonIcon
          iconType="arrowRight"
          display="empty"
          disabled={currentFrom + pageSize >= totalRows}
          onClick={() =>
            setCurrentFrom((from) => {
              return from + pageSize;
            })
          }
        />
      </div>
      <EuiSpacer size="xl" />
    </>
  );
};
