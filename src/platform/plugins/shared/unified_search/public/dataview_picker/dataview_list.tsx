/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, useState } from 'react';
import type { EuiSelectableProps, Direction } from '@elastic/eui';
import {
  EuiSelectable,
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiButtonGroup,
  EuiFilterButton,
  EuiFilterGroup,
  EuiIcon,
  EuiPopover,
  toSentenceCase,
} from '@elastic/eui';
import type { DataViewListItem } from '@kbn/data-views-plugin/public';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { ESQL_TYPE } from '@kbn/data-view-utils';
import {
  DATA_SOURCE_TYPES,
  type DataSourceType,
  type DiscoverSessionListItem,
} from './data_source_types';
import { SortingService } from './sorting_service';
import { MIDDLE_TRUNCATION_PROPS } from '../filter_bar/filter_editor/lib/helpers';

const strings = {
  sortOrder: {
    asc: {
      getSortOrderLabel: () =>
        i18n.translate('unifiedSearch.optionsList.popover.sortOrder.asc', {
          defaultMessage: 'Ascending',
        }),
    },
    desc: {
      getSortOrderLabel: () =>
        i18n.translate('unifiedSearch.optionsList.popover.sortOrder.desc', {
          defaultMessage: 'Descending',
        }),
    },
  },
  editorAndPopover: {
    getSortDirectionLegend: () =>
      i18n.translate('unifiedSearch.optionsList.popover.sortDirections', {
        defaultMessage: 'Sort directions',
      }),
    adhoc: {
      getTemporaryDataviewLabel: () =>
        i18n.translate('unifiedSearch.query.queryBar.indexPattern.temporaryDataviewLabel', {
          defaultMessage: 'Temporary',
        }),
    },
    managed: {
      getManagedDataviewLabel: () =>
        i18n.translate('unifiedSearch.query.queryBar.indexPattern.managedDataviewLabel', {
          defaultMessage: 'Managed',
        }),
    },
    search: {
      getSearchPlaceholder: () =>
        i18n.translate('unifiedSearch.query.queryBar.indexPattern.findDataView', {
          defaultMessage: 'Find a data view',
        }),
      getDataSourcesSearchPlaceholder: () =>
        i18n.translate('unifiedSearch.query.queryBar.indexPattern.findDataSource', {
          defaultMessage: 'Search data sources',
        }),
    },
    typeFilter: {
      getButtonLabel: () =>
        i18n.translate('unifiedSearch.query.queryBar.indexPattern.typeFilterButtonLabel', {
          defaultMessage: 'Type',
        }),
      getDataViewLabel: () =>
        i18n.translate('unifiedSearch.query.queryBar.indexPattern.typeFilterDataViewLabel', {
          defaultMessage: 'Data view',
        }),
      getDiscoverSessionLabel: () =>
        i18n.translate('unifiedSearch.query.queryBar.indexPattern.typeFilterDiscoverSessionLabel', {
          defaultMessage: 'Discover session',
        }),
    },
  },
};

export interface DataViewListItemEnhanced extends DataViewListItem {
  isAdhoc?: boolean;
  dataSourceType?: typeof DATA_SOURCE_TYPES.DATA_VIEW;
}

export interface DiscoverSessionListItemEnhanced extends DiscoverSessionListItem {
  dataSourceType: typeof DATA_SOURCE_TYPES.DISCOVER_SESSION;
}

type DataSourceListItem = DataViewListItemEnhanced | DiscoverSessionListItemEnhanced;

export interface DataViewsListProps {
  dataViewsList: DataViewListItemEnhanced[];
  onChangeDataView: (newId: string) => void;
  currentDataViewId?: string;
  currentDiscoverSessionId?: string;
  discoverSessionsList?: DiscoverSessionListItemEnhanced[];
  onChangeDiscoverSession?: (newId: string) => void;
  selectableProps?: EuiSelectableProps;
  searchListInputId?: string;
  showDataSourceTypeFilter?: boolean;
}

export function DataViewsList({
  dataViewsList,
  onChangeDataView,
  currentDataViewId,
  currentDiscoverSessionId,
  discoverSessionsList = [],
  onChangeDiscoverSession,
  selectableProps,
  searchListInputId,
  showDataSourceTypeFilter = false,
}: DataViewsListProps) {
  const sortingService = useMemo(
    () =>
      new SortingService<DataSourceListItem>({
        alphabetically: (item) => item.name || item.title,
      }),
    []
  );

  const [selectedDataSourceTypes, setSelectedDataSourceTypes] = useState<DataSourceType[]>([
    DATA_SOURCE_TYPES.DATA_VIEW,
    DATA_SOURCE_TYPES.DISCOVER_SESSION,
  ]);
  const [isTypeFilterPopoverOpen, setIsTypeFilterPopoverOpen] = useState(false);
  const [sortDirection, setSortDirection] = useState<Direction>(sortingService.direction);

  const sortedDataSourcesList = useMemo(() => {
    if (sortingService.direction !== sortDirection) {
      sortingService.setDirection(sortDirection);
    }

    const filteredDataViewsList = dataViewsList
      // Don't show ES|QL ad hoc data views in the data view list
      .filter((dataView) => !dataView.isAdhoc || dataView.type !== ESQL_TYPE)
      .map<DataSourceListItem>((dataView) => ({
        ...dataView,
        dataSourceType: DATA_SOURCE_TYPES.DATA_VIEW,
      }));

    const dataSources = [...filteredDataViewsList, ...discoverSessionsList].filter((dataSource) =>
      selectedDataSourceTypes.includes(dataSource.dataSourceType ?? DATA_SOURCE_TYPES.DATA_VIEW)
    );

    return sortingService.sortData(dataSources);
  }, [dataViewsList, discoverSessionsList, selectedDataSourceTypes, sortingService, sortDirection]);

  const sortOrderOptions = useMemo(
    () =>
      sortingService.getOrderDirections().map((key) => {
        return {
          id: key,
          iconType: `sort${toSentenceCase(key)}ending`,
          label: strings.sortOrder[key].getSortOrderLabel(),
        };
      }),
    [sortingService]
  );

  const onChangeSortDirection = (value: string) => {
    setSortDirection(value as Direction);
  };

  const typeFilterOptions = useMemo(
    () => [
      {
        checked: selectedDataSourceTypes.includes(DATA_SOURCE_TYPES.DATA_VIEW)
          ? ('on' as const)
          : undefined,
        'data-test-subj': 'dataSourceTypeFilter-dataView',
        key: DATA_SOURCE_TYPES.DATA_VIEW,
        label: strings.editorAndPopover.typeFilter.getDataViewLabel(),
        prepend: <EuiIcon type="indexPatternApp" />,
      },
      {
        checked: selectedDataSourceTypes.includes(DATA_SOURCE_TYPES.DISCOVER_SESSION)
          ? ('on' as const)
          : undefined,
        'data-test-subj': 'dataSourceTypeFilter-discoverSession',
        key: DATA_SOURCE_TYPES.DISCOVER_SESSION,
        label: strings.editorAndPopover.typeFilter.getDiscoverSessionLabel(),
        prepend: <EuiIcon type="discoverApp" />,
      },
    ],
    [selectedDataSourceTypes]
  );

  const selectedDataSource = currentDiscoverSessionId
    ? {
        dataSourceType: DATA_SOURCE_TYPES.DISCOVER_SESSION,
        id: currentDiscoverSessionId,
      }
    : {
        dataSourceType: DATA_SOURCE_TYPES.DATA_VIEW,
        id: currentDataViewId,
      };

  return (
    <EuiSelectable<{
      key?: string;
      label: string;
      value?: string;
      'data-source-type'?: DataSourceType;
      checked?: 'on' | 'off' | undefined;
    }>
      {...selectableProps}
      listProps={{
        truncationProps: MIDDLE_TRUNCATION_PROPS,
        paddingSize: 's',
        ...(selectableProps?.listProps ? selectableProps.listProps : undefined),
      }}
      data-test-subj="indexPattern-switcher"
      searchable
      singleSelection="always"
      options={sortedDataSourcesList?.map((dataSource) => ({
        key: `${dataSource.dataSourceType}-${dataSource.id}`,
        label: dataSource.name ? dataSource.name : dataSource.title,
        value: dataSource.id,
        'data-source-type': dataSource.dataSourceType,
        checked:
          dataSource.dataSourceType === selectedDataSource.dataSourceType &&
          dataSource.id === selectedDataSource.id
            ? 'on'
            : undefined,
        'data-test-subj':
          dataSource.dataSourceType === DATA_SOURCE_TYPES.DISCOVER_SESSION
            ? `discoverSession-${dataSource.name ? dataSource.name : dataSource.title}`
            : `dataView-${dataSource.name ? dataSource.name : dataSource.title}`,
        prepend: (
          <EuiIcon
            type={
              dataSource.dataSourceType === DATA_SOURCE_TYPES.DISCOVER_SESSION
                ? 'discoverApp'
                : 'indexPatternApp'
            }
          />
        ),
        append: dataSource.managed ? (
          <EuiBadge color="hollow" data-test-subj={`dataViewItemManagedBadge-${dataSource.name}`}>
            {strings.editorAndPopover.managed.getManagedDataviewLabel()}
          </EuiBadge>
        ) : dataSource.dataSourceType === DATA_SOURCE_TYPES.DATA_VIEW &&
          'isAdhoc' in dataSource &&
          dataSource.isAdhoc ? (
          <EuiBadge color="hollow" data-test-subj={`dataViewItemTempBadge-${dataSource.name}`}>
            {strings.editorAndPopover.adhoc.getTemporaryDataviewLabel()}
          </EuiBadge>
        ) : null,
      }))}
      onChange={(choices) => {
        const choice = choices.find(({ checked }) => checked) as unknown as {
          'data-source-type': DataSourceType;
          value: string;
        };
        if (choice['data-source-type'] === DATA_SOURCE_TYPES.DISCOVER_SESSION) {
          onChangeDiscoverSession?.(choice.value);
          return;
        }
        onChangeDataView(choice.value);
      }}
      searchProps={{
        id: searchListInputId,
        compressed: true,
        placeholder: showDataSourceTypeFilter
          ? strings.editorAndPopover.search.getDataSourcesSearchPlaceholder()
          : strings.editorAndPopover.search.getSearchPlaceholder(),
        'data-test-subj': 'indexPattern-switcher--input',
        autoFocus: false, // focused manually below - see https://github.com/elastic/eui/issues/8287
        inputRef: (ref) => {
          ref?.focus({ preventScroll: true });
        },
        ...(selectableProps ? selectableProps.searchProps : undefined),
      }}
    >
      {(list, search) => (
        <>
          <EuiPanel
            css={css`
              padding-bottom: 0;
            `}
            color="transparent"
            paddingSize="s"
          >
            <EuiFlexGroup
              gutterSize="xs"
              direction="row"
              justifyContent="spaceBetween"
              alignItems="center"
              responsive={false}
            >
              <EuiFlexItem>{search}</EuiFlexItem>

              {showDataSourceTypeFilter ? (
                <EuiFlexItem grow={false}>
                  <EuiFilterGroup compressed>
                    <EuiPopover
                      button={
                        <EuiFilterButton
                          data-test-subj="dataSourceTypeFilterButton"
                          hasActiveFilters={selectedDataSourceTypes.length < 2}
                          iconType="arrowDown"
                          numActiveFilters={
                            selectedDataSourceTypes.length < 2 ? selectedDataSourceTypes.length : 0
                          }
                          onClick={() => setIsTypeFilterPopoverOpen((isOpen) => !isOpen)}
                        >
                          {strings.editorAndPopover.typeFilter.getButtonLabel()}
                        </EuiFilterButton>
                      }
                      closePopover={() => setIsTypeFilterPopoverOpen(false)}
                      isOpen={isTypeFilterPopoverOpen}
                      panelPaddingSize="none"
                      panelStyle={{
                        width: '200px',
                      }}
                    >
                      <EuiSelectable
                        aria-label={strings.editorAndPopover.typeFilter.getButtonLabel()}
                        data-test-subj="dataSourceTypeFilterSelectable"
                        onChange={(options) => {
                          const nextSelectedDataSourceTypes = options
                            .filter(({ checked }) => checked === 'on')
                            .map(({ key }) => key as DataSourceType);
                          setSelectedDataSourceTypes(nextSelectedDataSourceTypes);
                        }}
                        options={typeFilterOptions}
                      >
                        {(typeList) => typeList}
                      </EuiSelectable>
                    </EuiPopover>
                  </EuiFilterGroup>
                </EuiFlexItem>
              ) : null}

              <EuiFlexItem grow={false}>
                <EuiButtonGroup
                  isIconOnly
                  buttonSize="compressed"
                  options={sortOrderOptions}
                  legend={strings.editorAndPopover.getSortDirectionLegend()}
                  idSelected={sortingService.direction}
                  onChange={onChangeSortDirection}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
          {list}
        </>
      )}
    </EuiSelectable>
  );
}
