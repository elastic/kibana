/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import {
  EuiSelectable,
  EuiSelectableProps,
  EuiBadge,
  EuiFlexGroup,
  EuiFormRow,
  EuiFlexItem,
  EuiPopover,
  EuiButtonIcon,
  EuiPopoverTitle,
  EuiSelectableOption,
  EuiPanel,
  EuiHorizontalRule,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DataViewListItem } from '@kbn/data-views-plugin/public';

import { Direction } from '@elastic/eui';
import { css } from '@emotion/react';

export type OptionsListSortBy = '_key';
export type OptionsListOrder = 'asc' | 'desc';

export const DEFAULT_SORT: SortingType = { by: '_key', direction: 'desc' };

export const sortDirections: Readonly<Direction[]> = ['asc', 'desc'] as const;
export type SortDirection = typeof sortDirections[number];
export interface SortingType {
  by: OptionsListSortBy;
  direction: SortDirection;
}

export const getCompatibleSortingTypes = (): OptionsListSortBy[] => ['_key'];
export const getCompatibleSortingTypesByOrder = (): OptionsListOrder[] => ['asc', 'desc'];

type SortByItem = EuiSelectableOption & {
  data: { sortBy: OptionsListSortBy };
};
type SortOrderItem = EuiSelectableOption & {
  data: { order: OptionsListOrder };
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
  const [isSortingPopoverOpen, setIsSortingPopoverOpen] = useState(false);

  const hadnleAlphabeticalSorting = (
    dataViews: DataViewListItemEnhanced[],
    direction?: SortDirection
  ) => {
    const sortedDataViews = dataViews.sort((a, b) =>
      (a.name ?? a.title).localeCompare(b.name ?? b.title)
    );
    return direction === 'asc' ? sortedDataViews : sortedDataViews.reverse();
  };
  const [sortedDataViewsList, setSortedDataViewsList] = useState(
    hadnleAlphabeticalSorting(dataViewsList, 'asc')
  );

  const editorAndPopover = {
    getSortDirectionLegend: () =>
      i18n.translate('unifiedSearch.optionsList.popover.sortDirections', {
        defaultMessage: 'Sort directions',
      }),
    sortBy: {
      _key: {
        getSortByLabel: () =>
          i18n.translate('unifiedSearch.optionsList.popover.sortBy.alphabetical', {
            defaultMessage: 'Alphabetically',
          }),
      },
    },
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
  };

  const [sortByOptions, setSortByOptions] = useState<SortByItem[]>(() => {
    return getCompatibleSortingTypes().map((key) => {
      return {
        data: { sortBy: key },
        checked: key === DEFAULT_SORT.by ? 'on' : undefined,
        label: editorAndPopover.sortBy[key].getSortByLabel(),
      } as SortByItem;
    });
  });

  const [sortOrderOptions, setSortOrderOptions] = useState<SortOrderItem[]>(() => {
    return getCompatibleSortingTypesByOrder().map((key) => {
      return {
        data: { order: key },
        checked: key === DEFAULT_SORT.direction ? 'on' : undefined,
        label: editorAndPopover.sortOrder[key].getSortOrderLabel(),
      } as SortOrderItem;
    });
  });

  const onSortByChange = (updatedOptions: SortByItem[]) => {
    setSortByOptions(updatedOptions);
  };

  const handleOrderChangesDataViewList = (selectedOption?: SortOrderItem) => {
    setSortedDataViewsList((currentDataViewsList) =>
      hadnleAlphabeticalSorting(currentDataViewsList, selectedOption?.data?.order)
    );
  };

  const onSortByOrder = (updatedOptions: SortOrderItem[]) => {
    setSortOrderOptions(updatedOptions);
    const selectedOption = updatedOptions.find(({ checked }) => checked === 'on');
    if (selectedOption) {
      handleOrderChangesDataViewList(selectedOption);
    }
  };

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
            {i18n.translate('unifiedSearch.query.queryBar.indexPattern.temporaryDataviewLabel', {
              defaultMessage: 'Temporary',
            })}
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
        placeholder: i18n.translate('unifiedSearch.query.queryBar.indexPattern.findDataView', {
          defaultMessage: 'Find a data view',
        }),
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
            <EuiFormRow fullWidth>
              <EuiFlexGroup
                gutterSize="xs"
                direction="row"
                justifyContent="spaceBetween"
                alignItems="center"
                responsive={false}
              >
                <EuiFlexItem>{search}</EuiFlexItem>

                <EuiFlexItem grow={false}>
                  <EuiPopover
                    button={
                      <EuiButtonIcon
                        iconType="sortable"
                        onClick={() => setIsSortingPopoverOpen(!isSortingPopoverOpen)}
                        aria-label={i18n.translate(
                          'unifiedSearch.optionsList.popover.sortDescription',
                          {
                            defaultMessage: 'Define the sort order',
                          }
                        )}
                      />
                    }
                    panelPaddingSize="none"
                    isOpen={isSortingPopoverOpen}
                    aria-labelledby="optionsList_sortingOptions"
                    closePopover={() => setIsSortingPopoverOpen(false)}
                    panelClassName={'optionsList--sortPopover'}
                  >
                    <EuiPopoverTitle paddingSize="s">
                      {i18n.translate('unifiedSearch.optionsList.popover.sortTitle', {
                        defaultMessage: 'Sort by',
                      })}
                    </EuiPopoverTitle>
                    <div style={{ width: 200 }}>
                      <EuiSelectable
                        options={sortByOptions}
                        singleSelection="always"
                        onChange={onSortByChange}
                        listProps={{ bordered: false }}
                        aria-label={i18n.translate(
                          'unifiedSearch.optionsList.popover.sortDescription',
                          {
                            defaultMessage: 'Define the sort order',
                          }
                        )}
                      >
                        {(sortByOptionList) => sortByOptionList}
                      </EuiSelectable>
                    </div>
                    <EuiHorizontalRule margin="none" />
                    <div style={{ width: 200 }}>
                      <EuiPopoverTitle paddingSize="s">
                        {i18n.translate('unifiedSearch.optionsList.popover.sortTitle', {
                          defaultMessage: 'Order',
                        })}
                      </EuiPopoverTitle>
                      <EuiSelectable
                        options={sortOrderOptions}
                        singleSelection="always"
                        onChange={onSortByOrder}
                        listProps={{ bordered: false }}
                        aria-label={i18n.translate(
                          'unifiedSearch.optionsList.popover.sortDescription',
                          {
                            defaultMessage: 'Define the sort order',
                          }
                        )}
                      >
                        {(sortOrderOptionList) => sortOrderOptionList}
                      </EuiSelectable>
                    </div>
                  </EuiPopover>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFormRow>
          </EuiPanel>
          {list}
        </>
      )}
    </EuiSelectable>
  );
}
