/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { EuiSelectableProps, Direction } from '@elastic/eui';
import {
  EuiSelectable,
  EuiBadge,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiButtonGroup,
  toSentenceCase,
} from '@elastic/eui';
import type { DataViewListItem } from '@kbn/data-views-plugin/public';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { ESQL_TYPE } from '@kbn/data-view-utils';
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
    },
  },
};

export interface DataViewListItemEnhanced extends DataViewListItem {
  isAdhoc?: boolean;
}

export interface DataViewsListProps {
  dataViewsList: DataViewListItemEnhanced[];
  onChangeDataView: (newId: string) => void;
  currentDataViewId?: string;
  selectableProps?: EuiSelectableProps;
  searchListInputId?: string;
  /**
   * Called when the search input value changes, with the current value and number of matching options.
   */
  onSearchChange?: (value: string, matchCount: number) => void;
}

export function DataViewsList({
  dataViewsList,
  onChangeDataView,
  currentDataViewId,
  selectableProps,
  searchListInputId,
  onSearchChange,
}: DataViewsListProps) {
  const sortingService = useMemo(
    () =>
      new SortingService<DataViewListItemEnhanced>({
        alphabetically: (item) => item.name || item.title,
      }),
    []
  );

  const [sortedDataViewsList, setSortedDataViewsList] = useState<DataViewListItemEnhanced[]>(() => {
    // Don't show ES|QL ad hoc data views in the data view list
    const withoutEsqlAdHoc = dataViewsList.filter(
      (dataView) => !dataView.isAdhoc || dataView.type !== ESQL_TYPE
    );
    return sortingService.sortData(withoutEsqlAdHoc);
  });

  const [searchValue, setSearchValue] = useState('');

  const filterBySearchValue = useCallback((items: DataViewListItemEnhanced[], value: string) => {
    if (!value) return items;
    const search = value.toLowerCase();
    return items.filter((item) => {
      const label = (item.name ?? item.title).toLowerCase();
      return label.includes(search);
    });
  }, []);

  const searchFilteredDataViews = useMemo(
    () => filterBySearchValue(sortedDataViewsList, searchValue),
    [filterBySearchValue, sortedDataViewsList, searchValue]
  );

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

  const onChangeSortDirection = useCallback(
    (value: string) => {
      sortingService.setDirection(value as Direction);
      setSortedDataViewsList((dataViews) => sortingService.sortData(dataViews));
    },
    [sortingService]
  );

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSearchValue(value);
      if (onSearchChange) {
        onSearchChange(value, filterBySearchValue(sortedDataViewsList, value).length);
      }
    },
    [filterBySearchValue, onSearchChange, sortedDataViewsList]
  );

  // Destructure searchProps out so it is not forwarded to the non-searchable EuiSelectable
  const { searchProps: _searchProps, listProps, ...restSelectableProps } = selectableProps ?? {};

  return (
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
          <EuiFlexItem>
            <EuiFieldSearch
              id={searchListInputId}
              compressed
              value={searchValue}
              onChange={handleSearchChange}
              placeholder={strings.editorAndPopover.search.getSearchPlaceholder()}
              aria-label={strings.editorAndPopover.search.getSearchPlaceholder()}
              data-test-subj="indexPattern-switcher--input"
              inputRef={(ref) => {
                // Focus the search input when the component mounts.
                // See https://github.com/elastic/eui/issues/8287
                ref?.focus({ preventScroll: true });
              }}
            />
          </EuiFlexItem>

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
      <EuiSelectable<{
        key?: string;
        label: string;
        value?: string;
        checked?: 'on' | 'off' | undefined;
      }>
        {...restSelectableProps}
        listProps={{
          truncationProps: MIDDLE_TRUNCATION_PROPS,
          ...(listProps ?? undefined),
        }}
        data-test-subj="indexPattern-switcher"
        singleSelection="always"
        options={searchFilteredDataViews?.map(({ title, id, name, isAdhoc, managed }) => ({
          key: id,
          label: name ? name : title,
          value: id,
          checked: id === currentDataViewId ? 'on' : undefined,
          append: managed ? (
            <EuiBadge color="hollow" data-test-subj={`dataViewItemManagedBadge-${name}`}>
              {strings.editorAndPopover.managed.getManagedDataviewLabel()}
            </EuiBadge>
          ) : isAdhoc ? (
            <EuiBadge color="hollow" data-test-subj={`dataViewItemTempBadge-${name}`}>
              {strings.editorAndPopover.adhoc.getTemporaryDataviewLabel()}
            </EuiBadge>
          ) : null,
        }))}
        onChange={(choices) => {
          const choice = choices.find(({ checked }) => checked) as unknown as {
            value: string;
          };
          onChangeDataView(choice.value);
        }}
      >
        {(list) => list}
      </EuiSelectable>
    </>
  );
}
