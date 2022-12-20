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
  SortDirection,
} from '@elastic/eui';
import { DataViewListItem } from '@kbn/data-views-plugin/public';

import { css } from '@emotion/react';

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { optionsListStrings } from './dataview_list_strings';

import { ALPHABETICALLY, Sorting, SortingService } from './sorting_service';
import { IUnifiedSearchPluginServices } from '../types';
import { handleSortingByDirection } from './suggestions_sorting';

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

function getColums(): Array<Sorting['by']> {
  return [ALPHABETICALLY];
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
  const kibana = useKibana<IUnifiedSearchPluginServices>();
  const { storage } = kibana.services;
  const [isSortingPopoverOpen, setIsSortingPopoverOpen] = useState(false);

  const sortingService = useMemo(() => {
    return new SortingService(storage);
  }, [storage]);

  const [dataViewSortSettings, setDataViewSortSettings] = useState(sortingService.getSorting());
  const [sortedDataViewsList, setSortedDataViewsList] = useState(
    handleSortingByDirection(dataViewsList, dataViewSortSettings.direction)
  );

  const [sortByOptions, setSortByOptions] = useState<EuiSelectableOption[]>(() => {
    return getColums().map((key) => {
      return toSelectableOption(
        key,
        key === dataViewSortSettings?.by,
        optionsListStrings.editorAndPopover.sortBy[key].getSortByLabel()
      );
    });
  });

  const [sortOrderOptions, setSortOrderOptions] = useState<EuiSelectableOption[]>(() => {
    return [SortDirection.ASC, SortDirection.DESC].map((key) => {
      return toSelectableOption(
        key,
        key === dataViewSortSettings?.direction,
        optionsListStrings.editorAndPopover.sortOrder[key].getSortOrderLabel()
      );
    });
  });

  const onSortByChange = useCallback(
    () => (updatedOptions: EuiSelectableOption[]) => {
      setSortByOptions(updatedOptions);
    },
    []
  );

  const onChangeSortDataViewList = useCallback(
    (selectedOption: EuiSelectableOption) => {
      sortingService.setSorting({ ...dataViewSortSettings, direction: selectedOption.data?.key });
      setDataViewSortSettings((settings) => {
        return { ...settings, direction: selectedOption.data?.key };
      });
    },
    [dataViewSortSettings, sortingService]
  );

  const handleChangesDataViewListOrder = useCallback(
    (selectedOption: EuiSelectableOption) => {
      onChangeSortDataViewList(selectedOption);
      setSortedDataViewsList((dataViews) =>
        handleSortingByDirection(dataViews, selectedOption.data?.key)
      );
    },
    [onChangeSortDataViewList]
  );

  const onSortByOrder = useCallback(
    (updatedOptions: EuiSelectableOption[]) => {
      setSortOrderOptions(updatedOptions);
      const selectedOption = updatedOptions.find(({ checked }) => checked === 'on');
      if (selectedOption) {
        handleChangesDataViewListOrder(selectedOption);
      }
    },
    [handleChangesDataViewListOrder]
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
                      onChange={onSortByChange}
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
                      options={sortOrderOptions}
                      singleSelection="always"
                      onChange={onSortByOrder}
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
