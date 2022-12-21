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
  EuiFormRow,
  EuiFlexItem,
  EuiPopover,
  EuiButtonIcon,
  EuiPopoverTitle,
  EuiSelectableOption,
  EuiPanel,
  EuiHorizontalRule,
  useEuiTheme,
} from '@elastic/eui';
import { DataViewListItem } from '@kbn/data-views-plugin/public';

import { css } from '@emotion/react';

import { optionsListStrings } from './dataview_list_strings';
import { SortingService } from './sorting_service';

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

function toSelectableOption(key: string, isChecked: boolean, label: string): EuiSelectableOption {
  return {
    data: { key },
    checked: isChecked ? 'on' : undefined,
    label,
  };
}

export function DataViewsList({
  dataViewsList,
  onChangeDataView,
  isTextBasedLangSelected,
  currentDataViewId,
  selectableProps,
  searchListInputId,
}: DataViewsListProps) {
  const { euiTheme } = useEuiTheme();
  const popoverStyle = euiTheme.base * 13;

  const [isSortingPopoverOpen, setIsSortingPopoverOpen] = useState(false);

  const sortingService = useMemo(
    () =>
      new SortingService<DataViewListItemEnhanced>({
        alphabetically: (item) => item.name ?? item.title,
      }),
    []
  );

  const [sortedDataViewsList, setSortedDataViewsList] = useState(
    sortingService.sortData(dataViewsList)
  );

  const [sortByOptions, setSortByOptions] = useState<EuiSelectableOption[]>(() => {
    return sortingService
      .getColumns()
      .map((key) =>
        toSelectableOption(
          key,
          key === sortingService.column,
          optionsListStrings.editorAndPopover.sortBy[key].getSortByLabel()
        )
      );
  });

  const [sortDirectionOptions, setSortDirectionOptions] = useState<EuiSelectableOption[]>(() => {
    return sortingService
      .getOrderDirections()
      .map((key) =>
        toSelectableOption(
          key,
          key === sortingService.direction,
          optionsListStrings.editorAndPopover.sortOrder[key].getSortOrderLabel()
        )
      );
  });

  const onChangeSortDirection = useCallback(
    (updatedOptions: EuiSelectableOption[]) => {
      const selectedOption = updatedOptions.find(({ checked }) => checked === 'on');

      setSortDirectionOptions(updatedOptions);
      if (selectedOption?.data?.key) {
        const key = selectedOption.data.key;

        sortingService.setDirection(key);
        setSortedDataViewsList((dataViews) => sortingService.sortData(dataViews));
      }
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
            {optionsListStrings.editorAndPopover.adhoc.getTemporaryDataviewLabel()}
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
        placeholder: optionsListStrings.editorAndPopover.search.getSearchPlaceholder(),
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
                        aria-label={optionsListStrings.popover.getSortPopoverDescription()}
                      />
                    }
                    panelPaddingSize="none"
                    isOpen={isSortingPopoverOpen}
                    aria-labelledby="optionsList_sortingOptions"
                    closePopover={() => setIsSortingPopoverOpen(false)}
                  >
                    <EuiPopoverTitle paddingSize="s">
                      {optionsListStrings.popover.getSortPopoverTitle()}
                    </EuiPopoverTitle>

                    <EuiSelectable
                      options={sortByOptions}
                      singleSelection="always"
                      onChange={setSortByOptions}
                      listProps={{ bordered: false }}
                      aria-label={optionsListStrings.popover.getSortPopoverDescription()}
                      style={{ width: popoverStyle }}
                    >
                      {(sortByOptionList) => sortByOptionList}
                    </EuiSelectable>

                    <EuiHorizontalRule margin="none" />

                    <EuiPopoverTitle paddingSize="s">
                      {optionsListStrings.popover.getOrderPopoverTitle()}
                    </EuiPopoverTitle>
                    <EuiSelectable
                      options={sortDirectionOptions}
                      singleSelection="always"
                      onChange={onChangeSortDirection}
                      listProps={{ bordered: false }}
                      aria-label={optionsListStrings.popover.getSortPopoverDescription()}
                      style={{ width: popoverStyle }}
                    >
                      {(sortOrderOptionList) => sortOrderOptionList}
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
