/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import useMount from 'react-use/lib/useMount';

import type { Filter, Query, AggregateQuery } from '@kbn/es-query';
import type { DataViewField, DataView } from '@kbn/data-views-plugin/public';
import { EmbeddableInput, EmbeddableOutput } from '@kbn/embeddable-plugin/public';
import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import { EuiTable, EuiTableBody, formatDate, LEFT_ALIGNMENT, RIGHT_ALIGNMENT } from '@elastic/eui';
import type { GetStateReturn } from '../../services/discover_state';
import { AvailableFields$, DataRefetch$, DataTotalHits$ } from '../../hooks/use_saved_search';
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
   * The used data view
   */
  dataView: DataView;
  /**
   * Saved search description
   */
  searchDescription?: string;
  /**
   * Saved search title
   */
  searchTitle?: string;
  /**
   * Optional saved search
   */
  savedSearch?: SavedSearch;
  /**
   * Optional query to update the table content
   */
  query?: Query | AggregateQuery;
  /**
   * Filters query to update the table content
   */
  filters?: Filter[];
  /**
   * State container with persisted settings
   */
  stateContainer?: GetStateReturn;
  /**
   * Callback to add a filter to filter bar
   */
  onAddFilter?: (field: DataViewField | string, value: string, type: '+' | '-') => void;
  /**
   * Metric tracking function
   * @param metricType
   * @param eventName
   */
  savedSearchRefetch$?: DataRefetch$;
  availableFields$?: AvailableFields$;
  searchSessionId?: string;
  savedSearchDataTotalHits$?: DataTotalHits$;
}

export interface TestRowType {
  id: string;
  firstName: string;
  lastName: string;
  github: string;
  dateOfBirth: Date | number;
  nationality: string;
  online: boolean;
}

export interface TestColumnType {
  align?: typeof RIGHT_ALIGNMENT | typeof LEFT_ALIGNMENT;
  field: keyof TestRowType;
  truncateText?: boolean;
  sortable?: boolean;
  render?: Function;
  schema?: string;
  name: string;
  id: string;
}

const TestUsers: TestRowType[] = [
  {
    id: '1',
    firstName: 'john',
    lastName: 'doe',
    github: 'johndoe',
    dateOfBirth: Date.now(),
    nationality: 'NL',
    online: true,
  },
  {
    id: '2',
    firstName: 'Clinton',
    lastName: 'Gormley',
    github: 'clingorm',
    dateOfBirth: new Date(Date.now() + 3600 * 1000 * 24),
    nationality: 'UK',
    online: false,
  },
];

export const TermsExplorerTable = (props: TermsExplorerTableProps) => {
  const services = useDiscoverServices();

  const { dataView } = props;

  useMount(() => {
    (async () => {
      console.log('firing off request.... hope you have the flights data installed...');
      const columnNames = [
        'AvgTicketPrice',
        'DestCityName',
        'DestAirportID',
        'DestRegion',
        'DistanceKilometers',
      ];
      const termsExplorerRequestBody: TermsExplorerRequest = {
        collapseFieldName: 'DestCountry',
        columns: columnNames.reduce((acc, columnName) => {
          if (!acc) acc = {};
          const fieldSpec = dataView.getFieldByName(columnName)?.toSpec();
          if (fieldSpec) {
            acc[columnName] = fieldSpec;
          }
          return acc;
        }, {} as TermsExplorerRequest['columns']),
      };
      const response = await services.http.fetch<TermsExplorerResponse>(
        `/api/kibana/discover/termsExplorer/${dataView.getIndexPattern()}`,
        {
          body: JSON.stringify(termsExplorerRequestBody),
          method: 'POST',
        }
      );
      console.log('got a big old response: ', response);
    })();
  });

  const columns: TestColumnType[] = [
    {
      id: 'firstName',
      field: 'firstName',
      name: 'First Name',
      sortable: true,
      truncateText: true,
      align: LEFT_ALIGNMENT,
    },
    {
      id: 'lastName',
      field: 'lastName',
      name: 'Last Name',
      align: LEFT_ALIGNMENT,
      truncateText: true,
    },
    {
      id: 'dateOfBirth',
      field: 'dateOfBirth',
      name: 'Date of Birth',
      schema: 'date',
      render: (date: Date) => formatDate(date, 'dobLong'),
      sortable: true,
    },
  ];

  const renderRows = () => {
    const rows = [];

    for (const row of TestUsers) {
      rows.push(
        <TermsExplorerTableRow row={row} columns={columns} termsExplorerTableProps={props} />
      );
    }

    return rows;
  };

  return (
    <EuiTable id={'table-id'}>
      {/* <EuiTableHeader>{this.renderHeaderCells()}</EuiTableHeader> */}

      <EuiTableBody>{renderRows()}</EuiTableBody>

      {/* <EuiTableFooter>{this.renderFooterCells()}</EuiTableFooter> */}
    </EuiTable>
  );
};
