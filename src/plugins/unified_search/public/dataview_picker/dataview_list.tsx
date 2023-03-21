/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiSelectable,
  EuiSelectableProps,
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiButtonGroup,
  toSentenceCase,
} from '@elastic/eui';
import type { DataViewListItem } from '@kbn/data-views-plugin/public';
import { i18n } from '@kbn/i18n';

import { css } from '@emotion/react';

import { SortingService } from './sorting_service';

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
  isTextBasedLangSelected?: boolean;
  currentDataViewId?: string;
  selectableProps?: EuiSelectableProps;
  searchListInputId?: string;
}

export function DataViewsList({
  dataViewsList,
  onChangeDataView,
  isTextBasedLangSelected,
  currentDataViewId,
  selectableProps,
  searchListInputId,
}: DataViewsListProps) {
  const sortingService = useMemo(
    () =>
      new SortingService<DataViewListItemEnhanced>({
        alphabetically: (item) => item.name ?? item.title,
      }),
    []
  );

  const [sortedDataViewsList, setSortedDataViewsList] = useState<DataViewListItemEnhanced[]>(
    sortingService.sortData(dataViewsList)
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
    (value) => {
      sortingService.setDirection(value);
      setSortedDataViewsList((dataViews) => sortingService.sortData(dataViews));
    },
    [sortingService]
  );

  return (
    <EuiSelectable<{
      key?: string;
      label: string;
      value?: string;
      checked?: 'on' | 'off' | undefined;
    }>
      {...selectableProps}
      data-test-subj="indexPattern-switcher"
      searchable
      singleSelection="always"
      options={sortedDataViewsList?.map(({ title, id, name, isAdhoc }) => ({
        key: id,
        label: name ? name : title,
        value: id,
        checked: id === currentDataViewId && !Boolean(isTextBasedLangSelected) ? 'on' : undefined,
        append: isAdhoc ? (
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
      searchProps={{
        id: searchListInputId,
        compressed: true,
        placeholder: strings.editorAndPopover.search.getSearchPlaceholder(),
        'data-test-subj': 'indexPattern-switcher--input',
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

// React.lazy support
// eslint-disable-next-line import/no-default-export
export default DataViewsList;
