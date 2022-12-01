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

  const renderHeaderCells = () => {
    return columns.map((column) => (
      <EuiTableHeaderCell key={column} align={'center'}>
        {column}
      </EuiTableHeaderCell>
    ));
  };

  useEffect(() => {
    const timeFilter = timeRange ? timeService.createFilter(dataView, timeRange) : undefined;
    const filtersToUse = [...(filters ?? []), ...(timeFilter ? [timeFilter] : [])];
    const esFilters = [buildEsQuery(dataView, query ?? [], filtersToUse ?? [])];

    (async () => {
      const termsExplorerRequestBody: TermsExplorerRequest = {
        size: 20,
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
    })();
  }, [columns, dataView, http, collapseFieldName, timeRange, timeService, filters, query]);

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

  const crumbs = breadcrumbs
    ?.map<React.ReactNode>((crumb) => <EuiBadge>{crumb}</EuiBadge>)
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
            Unique values of <EuiBadge>{collapseFieldName}</EuiBadge>
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

        {/* <EuiTableFooter>{this.renderFooterCells()}</EuiTableFooter> */}
      </EuiTable>
      <EuiSpacer size="xl" />
    </>
  );
};
