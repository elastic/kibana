/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo, useState } from 'react';
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
  EuiButtonGroup,
  toSentenceCase,
  EuiSelectableOption,
  EuiButtonGroupOptionProps,
  EuiPanel,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DataViewListItem } from '@kbn/data-views-plugin/public';

import { Direction } from '@elastic/eui';
import { css } from '@emotion/react';

export type OptionsListSortBy = '_count' | '_key';

export const DEFAULT_SORT: SortingType = { by: '_count', direction: 'desc' };

export const sortDirections: Readonly<Direction[]> = ['asc', 'desc'] as const;
export type SortDirection = typeof sortDirections[number];
export interface SortingType {
  by: OptionsListSortBy;
  direction: SortDirection;
}

export const getCompatibleSortingTypes = (): OptionsListSortBy[] => ['_count', '_key'];

type SortByItem = EuiSelectableOption & {
  data: { sortBy: OptionsListSortBy };
};
type SortOrderItem = EuiButtonGroupOptionProps & {
  value: Direction;
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
  const field = '';
  const sort = DEFAULT_SORT;

  const [isSortingPopoverOpen, setIsSortingPopoverOpen] = useState(false);

  const editorAndPopover = {
    getSortDirectionLegend: () =>
      i18n.translate('controls.optionsList.popover.sortDirections', {
        defaultMessage: 'Sort directions',
      }),
    sortBy: {
      _count: {
        getSortByLabel: () =>
          i18n.translate('controls.optionsList.popover.sortBy.docCount', {
            defaultMessage: 'By document count',
          }),
      },
      _key: {
        getSortByLabel: () =>
          i18n.translate('controls.optionsList.popover.sortBy.alphabetical', {
            defaultMessage: 'Alphabetically',
          }),
      },
    },
    sortOrder: {
      asc: {
        getSortOrderLabel: () =>
          i18n.translate('controls.optionsList.popover.sortOrder.asc', {
            defaultMessage: 'Ascending',
          }),
      },
      desc: {
        getSortOrderLabel: () =>
          i18n.translate('controls.optionsList.popover.sortOrder.desc', {
            defaultMessage: 'Descending',
          }),
      },
    },
  };

  const [sortByOptions, setSortByOptions] = useState<SortByItem[]>(() => {
    return getCompatibleSortingTypes().map((key) => {
      return {
        onFocusBadge: false,
        data: { sortBy: key },
        checked: key === sort.by ? 'on' : undefined,
        label: editorAndPopover.sortBy[key].getSortByLabel(),
      } as SortByItem;
    });
  });

  const sortOrderOptions = useMemo(
    () =>
      sortDirections.map((key) => {
        return {
          id: key,
          iconType: `sort${toSentenceCase(key)}ending`,
          'data-test-subj': `optionsList__sortOrder_${key}`,
          label: editorAndPopover.sortOrder[key].getSortOrderLabel(),
        } as SortOrderItem;
      }),
    [editorAndPopover.sortOrder]
  );

  const onSortByChange = (updatedOptions: SortByItem[]) => {
    setSortByOptions(updatedOptions);
    const selectedOption = updatedOptions.find(({ checked }) => checked === 'on');
    if (selectedOption) {
      // setSort({ by: selectedOption.data.sortBy });
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
      options={dataViewsList?.map(({ title, id, name, isAdhoc }) => ({
        key: id,
        label: name ? name : title,
        value: id,
        checked: id === currentDataViewId && !Boolean(isTextBasedLangSelected) ? 'on' : undefined,
        append: isAdhoc ? (
          <EuiBadge color="hollow">
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
                        data-test-subj="optionsListControl__sortingOptionsButton"
                        onClick={() => setIsSortingPopoverOpen(!isSortingPopoverOpen)}
                        aria-label={i18n.translate('controls.optionsList.popover.sortDescription', {
                          defaultMessage: 'Define the sort order',
                        })}
                      />
                    }
                    panelPaddingSize="none"
                    isOpen={isSortingPopoverOpen}
                    aria-labelledby="optionsList_sortingOptions"
                    closePopover={() => setIsSortingPopoverOpen(false)}
                    panelClassName={'optionsList--sortPopover'}
                  >
                    <EuiPopoverTitle paddingSize="s">
                      <EuiFlexGroup alignItems="center" responsive={false}>
                        <EuiFlexItem>
                          {i18n.translate('controls.optionsList.popover.sortTitle', {
                            defaultMessage: 'Sort',
                          })}
                        </EuiFlexItem>
                        <EuiFlexItem grow={false}>
                          <EuiButtonGroup
                            isIconOnly
                            buttonSize="compressed"
                            options={sortOrderOptions}
                            idSelected={sort.direction}
                            legend={i18n.translate('controls.optionsList.popover.sortDirections', {
                              defaultMessage: 'Sort directions',
                            })}
                            onChange={(value) => {}}
                          />
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiPopoverTitle>
                    <EuiSelectable
                      options={sortByOptions}
                      singleSelection="always"
                      onChange={onSortByChange}
                      id="optionsList_sortingOptions"
                      listProps={{ bordered: false }}
                      data-test-subj="optionsListControl__sortingOptions"
                      aria-label={i18n.translate('controls.optionsList.popover.sortDescription', {
                        defaultMessage: 'Define the sort order',
                      })}
                    >
                      {(list) => list}
                    </EuiSelectable>
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
