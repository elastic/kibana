/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Filter, Query, AggregateQuery } from '@kbn/es-query';
import { METRIC_TYPE, UiCounterMetricType } from '@kbn/analytics';
import type { DataViewField, DataView } from '@kbn/data-views-plugin/public';
import {
  EmbeddableInput,
  EmbeddableOutput,
  ErrorEmbeddable,
  IEmbeddable,
  isErrorEmbeddable,
} from '@kbn/embeddable-plugin/public';
import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import {
  EuiBasicTable,
  EuiButtonIcon,
  EuiDescriptionList,
  EuiFlexItem,
  EuiHealth,
  EuiScreenReaderOnly,
  EuiTableRow,
  formatDate,
  RIGHT_ALIGNMENT,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import type { GetStateReturn } from '../../services/discover_state';
import { AvailableFields$, DataRefetch$, DataTotalHits$ } from '../../hooks/use_saved_search';
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

const TestUsers = [
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

const TestCountries = {
  ['NL']: { name: 'Netherlands', flag: '🇳🇱' },
  ['UK']: { name: 'United Kingdom', flag: '🇬🇧' },
};

export const TermsExplorerTable = (props: TermsExplorerTableProps) => {
  const [primaryItemIdToExpandedRowMap, setPrimaryItemIdToExpandedRowMap] = useState({});
  const [secondaryItemIdToExpandedRowMap, setSecondaryItemIdToExpandedRowMap] = useState({});

  const toggleSecondaryDetails = useCallback(
    (item) => {
      console.log('secondary', item);
      const itemIdToExpandedRowMapValues = { ...secondaryItemIdToExpandedRowMap };
      console.log('---> before: ', itemIdToExpandedRowMapValues);
      if (itemIdToExpandedRowMapValues[item.id]) {
        console.log('delete');
        delete itemIdToExpandedRowMapValues[item.id];
      } else {
        const { online } = item;
        const color = online ? 'success' : 'danger';
        const label = online ? 'Online' : 'Offline';
        const listItems = [
          {
            title: 'Online',
            description: <EuiHealth color={color}>{label}</EuiHealth>,
          },
        ];
        itemIdToExpandedRowMapValues[item.id] = <EuiDescriptionList listItems={listItems} />;
      }
      console.log('---> after: ', itemIdToExpandedRowMapValues);

      setSecondaryItemIdToExpandedRowMap(itemIdToExpandedRowMapValues);
    },
    [secondaryItemIdToExpandedRowMap]
  );

  const getPrimaryColumns = useMemo(() => {
    console.log('here', secondaryItemIdToExpandedRowMap);
    return [
      {
        field: 'nationality',
        name: 'Nationality',
      },
      {
        field: 'dateOfBirth',
        name: 'Date of Birth',
        schema: 'date',
        render: (date) => formatDate(date, 'dobLong'),
      },
      {
        align: RIGHT_ALIGNMENT,
        width: '40px',
        isExpander: true,
        name: (
          <EuiScreenReaderOnly>
            <span>Expand rows</span>
          </EuiScreenReaderOnly>
        ),
        render: (item) => (
          <EuiButtonIcon
            onClick={() => toggleSecondaryDetails(item)}
            aria-label={secondaryItemIdToExpandedRowMap[item.id] ? 'Collapse' : 'Expand'}
            iconType={secondaryItemIdToExpandedRowMap[item.id] ? 'arrowUp' : 'arrowDown'}
          />
        ),
      },
    ];
  }, [secondaryItemIdToExpandedRowMap, toggleSecondaryDetails]);

  const togglePrimaryDetails = useCallback(
    (item) => {
      console.log('primary', item);
      const itemIdToExpandedRowMapValues = { ...primaryItemIdToExpandedRowMap };
      console.log('---> before: ', itemIdToExpandedRowMapValues);
      console.log('---> secondary:', secondaryItemIdToExpandedRowMap);
      if (itemIdToExpandedRowMapValues[item.id]) {
        delete itemIdToExpandedRowMapValues[item.id];
      } else {
        const { nationality, dateOfBirth } = item;
        const country = TestCountries[nationality];
        const listItems = [
          {
            ...item,
            nationality: `${country.flag} ${country.name}`,
            id: `${item.id}-secondary`,
          },
        ];
        itemIdToExpandedRowMapValues[item.id] = (
          <EuiBasicTable
            tableCaption="Demo of EuiBasicTable"
            items={listItems}
            rowHeader="firstName"
            itemId={''}
            itemIdToExpandedRowMap={secondaryItemIdToExpandedRowMap}
            isExpandable={true}
            columns={getPrimaryColumns}
          />
        );
      }
      console.log('---> after: ', itemIdToExpandedRowMapValues);

      setPrimaryItemIdToExpandedRowMap(itemIdToExpandedRowMapValues);
    },
    [primaryItemIdToExpandedRowMap, secondaryItemIdToExpandedRowMap, getPrimaryColumns]
  );

  console.log('render');

  return (
    <EuiBasicTable
      tableCaption="Demo of EuiBasicTable with expanding rows"
      items={TestUsers}
      itemId="id"
      itemIdToExpandedRowMap={primaryItemIdToExpandedRowMap}
      isExpandable={true}
      columns={[
        {
          field: 'firstName',
          name: 'First Name',
          sortable: true,
          truncateText: true,
          mobileOptions: {
            render: (item) => (
              <span>
                {item.firstName} {item.lastName}
              </span>
            ),
            header: false,
            truncateText: false,
            enlarge: true,
            width: '100%',
          },
        },
        {
          field: 'lastName',
          name: 'Last Name',
          truncateText: true,
          mobileOptions: {
            show: false,
          },
        },
        {
          align: RIGHT_ALIGNMENT,
          width: '40px',
          isExpander: true,
          name: (
            <EuiScreenReaderOnly>
              <span>Expand rows</span>
            </EuiScreenReaderOnly>
          ),
          render: (item) => (
            <EuiButtonIcon
              onClick={() => togglePrimaryDetails(item)}
              aria-label={primaryItemIdToExpandedRowMap[item.id] ? 'Collapse' : 'Expand'}
              iconType={primaryItemIdToExpandedRowMap[item.id] ? 'arrowUp' : 'arrowDown'}
            />
          ),
        },
      ]}
    />
  );
};
