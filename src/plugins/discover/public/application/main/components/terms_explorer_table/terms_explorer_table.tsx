/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useState } from 'react';

import type { Filter, Query, AggregateQuery } from '@kbn/es-query';
import type { DataViewField, DataView } from '@kbn/data-views-plugin/public';
import { EmbeddableInput, EmbeddableOutput } from '@kbn/embeddable-plugin/public';
import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import { EuiTable, EuiTableBody } from '@elastic/eui';
import { TermsExplorerTableRow } from './terms_explorer_table_row';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import {
  TermsExplorerRequest,
  TermsExplorerResponse,
} from '../../../../../common/terms_explorer/types';
export interface RandomSamplingOption {
  mode: 'random_sampling';
  seed: string;
  probability: number;
}

export interface NormalSamplingOption {
  mode: 'normal_sampling';
  seed: string;
  shardSize: number;
}

export interface NoSamplingOption {
  mode: 'no_sampling';
  seed: string;
}

export type SamplingOption = RandomSamplingOption | NormalSamplingOption | NoSamplingOption;

export interface DataVisualizerGridEmbeddableInput extends EmbeddableInput {
  dataView: DataView;
  savedSearch?: SavedSearch;
  query?: Query | AggregateQuery;
  visibleFieldNames?: string[];
  filters?: Filter[];
  showPreviewByDefault?: boolean;
  /**
   * Callback to add a filter to filter bar
   */
  onAddFilter?: (field: DataViewField | string, value: string, type: '+' | '-') => void;
  sessionId?: string;
  fieldsToFetch?: string[];
  totalDocuments?: number;
  samplingOption?: SamplingOption;
}
export interface DataVisualizerGridEmbeddableOutput extends EmbeddableOutput {
  showDistributions?: boolean;
}

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
}

export const TermsExplorerTable = (tableProps: TermsExplorerTableProps) => {
  const services = useDiscoverServices();
  const { dataView, columns, collapseFieldName } = tableProps;

  const [rows, setRows] = useState<TermsExplorerResponse['rows'] | undefined>();

  useEffect(() => {
    (async () => {
      const termsExplorerRequestBody: TermsExplorerRequest = {
        collapseFieldName,
        columns: columns.reduce((columnsMap, columnName) => {
          if (!columnsMap) columnsMap = {};
          const fieldSpec = dataView.getFieldByName(columnName)?.toSpec();
          if (fieldSpec) {
            columnsMap[columnName] = fieldSpec;
          }
          return columnsMap;
        }, {} as TermsExplorerRequest['columns']),
      };
      const response = await services.http.fetch<TermsExplorerResponse>(
        `/api/kibana/discover/termsExplorer/${dataView.getIndexPattern()}`,
        {
          body: JSON.stringify(termsExplorerRequestBody),
          method: 'POST',
        }
      );
      setRows(response.rows);
    })();
  }, [columns, dataView, services.http, collapseFieldName]);

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

  return (
    <EuiTable id={'table-id'}>
      {/* <EuiTableHeader>{this.renderHeaderCells()}</EuiTableHeader> */}

      <EuiTableBody>{renderRows()}</EuiTableBody>

      {/* <EuiTableFooter>{this.renderFooterCells()}</EuiTableFooter> */}
    </EuiTable>
  );
};
