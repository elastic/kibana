/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiSpacer,
  EuiIcon,
  EuiEmptyPrompt,
  EuiFieldSearch,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiHighlight,
  EuiBadge,
  prettyDuration,
  ShortDate,
  formatDate,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import React, { useCallback, useEffect, useState, useRef } from 'react';
import { sortBy } from 'lodash';
import { useKibana } from '../../../../kibana_react/public';
import { SavedQuery, SavedQueryService, SavedQueryTimeFilter, IDataPluginServices } from '../..';

interface DurationRange {
  end: ShortDate;
  label?: string;
  start: ShortDate;
}

const commonDurationRanges: DurationRange[] = [
  { start: 'now/d', end: 'now/d', label: 'Today' },
  { start: 'now/w', end: 'now/w', label: 'This week' },
  { start: 'now/M', end: 'now/M', label: 'This month' },
  { start: 'now/y', end: 'now/y', label: 'This year' },
  { start: 'now-1d/d', end: 'now-1d/d', label: 'Yesterday' },
  { start: 'now/w', end: 'now', label: 'Week to date' },
  { start: 'now/M', end: 'now', label: 'Month to date' },
  { start: 'now/y', end: 'now', label: 'Year to date' },
];

const perPage = 50;
interface TablePage {
  page: {
    index: number;
    size: number;
  };
}
interface Props {
  showSaveQuery?: boolean;
  loadedSavedQuery?: SavedQuery;
  savedQueryService: SavedQueryService;
  onSave: () => void;
  onSaveAsNew: () => void;
  onLoad: (savedQueries: SavedQuery) => void;
  onClearSavedQuery: () => void;
  selectedSavedQueries?: SavedQuery[];
}

export function SavedFilterSetListing({
  showSaveQuery,
  loadedSavedQuery,
  onSave,
  onSaveAsNew,
  onLoad,
  onClearSavedQuery,
  selectedSavedQueries,
  savedQueryService,
}: Props) {
  const kibana = useKibana<IDataPluginServices>();
  const [savedQueries, setSavedQueries] = useState([] as SavedQuery[]);
  const [count, setTotalCount] = useState(0);
  const [activePage, setActivePage] = useState(0);
  const [pageSize, setPageSize] = useState(perPage);
  const [searchValue, setSearchValue] = useState('');
  const [savedQueriesBySearch, setSavedQueriesBySearch] = useState([] as SavedQuery[]);
  const [selectedQueries, setSelectedQueries] = useState(selectedSavedQueries);
  const cancelPendingListingRequest = useRef<() => void>(() => {});
  const { uiSettings } = kibana.services;
  const format = uiSettings.get('dateFormat');

  useEffect(() => {
    const fetchCountAndSavedQueries = async () => {
      cancelPendingListingRequest.current();
      let requestGotCancelled = false;
      cancelPendingListingRequest.current = () => {
        requestGotCancelled = true;
      };

      const { total: savedQueryCount, queries: savedQueryItems } =
        await savedQueryService.findSavedQueries('', pageSize, activePage + 1);

      if (requestGotCancelled) return;

      const sortedSavedQueryItems = sortBy(savedQueryItems, 'attributes.title');
      setTotalCount(savedQueryCount);
      setSavedQueries(sortedSavedQueryItems);
      setSavedQueriesBySearch(sortedSavedQueryItems);
    };
    fetchCountAndSavedQueries();
  }, [activePage, savedQueryService, pageSize]);

  const handleDelete = useCallback(
    (savedQueryToDelete: SavedQuery) => {
      const onDeleteSavedQuery = async (savedQuery: SavedQuery) => {
        cancelPendingListingRequest.current();
        const updatedSavedQueries = savedQueries.filter(
          (currentSavedQuery) => currentSavedQuery.id !== savedQuery.id
        );
        setSavedQueries(updatedSavedQueries);
        setSavedQueriesBySearch(updatedSavedQueries);

        if (loadedSavedQuery && loadedSavedQuery.id === savedQuery.id) {
          onClearSavedQuery();
        }

        await savedQueryService.deleteSavedQuery(savedQuery.id);
        setActivePage(0);
      };

      onDeleteSavedQuery(savedQueryToDelete);
    },
    [loadedSavedQuery, onClearSavedQuery, savedQueries, savedQueryService]
  );

  const onInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setSearchValue(value);
    const newSavedQueriesList = savedQueries.filter((savedQuery) => {
      return savedQuery.attributes.title.toLowerCase().includes(value.toLowerCase());
    });
    setSavedQueriesBySearch(newSavedQueriesList);
  };

  const onSelectionChange = useCallback(
    (selectedItems: SavedQuery[]) => {
      setSelectedQueries(selectedItems);
      onLoad(selectedItems[0]);
    },
    [onLoad]
  );

  const onTableChange = ({ page }: TablePage) => {
    const { index: pageIndex, size } = page;
    setActivePage(pageIndex);
    setPageSize(size);
  };

  const tableActions = [
    {
      name: i18n.translate('data.search.searchBar.savedFilterSetDeleteTitle', {
        defaultMessage: 'Delete',
      }),
      description: i18n.translate('data.search.searchBar.savedFilterSetDeleteDescription', {
        defaultMessage: 'Delete this saved filter.',
      }),
      icon: 'trash',
      color: 'danger',
      type: 'icon',
      isPrimary: true,
      onClick: handleDelete,
      'data-test-subj': 'action-delete',
    },
  ];

  const tableColumns = [
    {
      field: 'attributes.title',
      name: 'Name',
      sortable: true,
      render: (title: string) => <EuiHighlight search={searchValue}>{title}</EuiHighlight>,
    },
    {
      field: 'attributes.query.language',
      name: 'Language',
      truncateText: false,
      width: '100px',
      render: (language: string) => <EuiBadge>{language === 'kuery' ? 'KQL' : language}</EuiBadge>,
    },
    {
      field: 'attributes.timefilter',
      name: 'Time filter',
      render: (timefilter: SavedQueryTimeFilter) => (
        <span>
          {timefilter
            ? prettyDuration(timefilter?.from, timefilter?.to, commonDurationRanges, format)
            : ''}
        </span>
      ),
    },
    {
      field: 'updated_at',
      name: 'Last updated',
      render: (date: string) => <span>{formatDate(date, format)}</span>,
    },
    {
      name: 'Actions',
      actions: tableActions,
      width: '70px',
    } as EuiBasicTableColumn<SavedQuery>,
  ];

  const pagination = {
    pageIndex: activePage,
    pageSize,
    totalItemCount: count,
  };

  const emptyState = (
    <EuiEmptyPrompt
      title={<h3>No saved filters</h3>}
      titleSize="s"
      body={
        <p>
          Saved filters allow you to reuse all or parts of your query including the time filter. To
          create a saved filter, open the <EuiIcon type="filter" color="primary" /> Filter Menu and
          select “Save current filter set”.
        </p>
      }
    />
  );
  const component = (
    <>
      {savedQueries.length && (
        <div>
          <EuiFieldSearch
            placeholder="Find a saved filter..."
            value={searchValue}
            fullWidth
            onChange={onInputChange}
            isClearable={true}
            aria-label="Search..."
            compressed
          />
          <EuiSpacer size="m" />
          <EuiBasicTable
            tableCaption="Saved filters list"
            items={savedQueriesBySearch}
            itemId="id"
            columns={tableColumns}
            pagination={pagination}
            hasActions={!!showSaveQuery}
            selection={{ onSelectionChange, initialSelected: selectedQueries }}
            onChange={onTableChange}
          />
        </div>
      )}
      {!savedQueries.length && (
        <EuiEmptyPrompt
          title={<h2>No saved filters</h2>}
          body={
            <p>
              Saved searches allow you to reuse all or parts of your query including time filter. To
              create a saved query, open the <EuiIcon type="filter" color="primary" /> Filter Menu
              and select “Save current filter set”.
            </p>
          }
        />
      )}
    </>
  );

  return savedQueries.length ? component : emptyState;
}
