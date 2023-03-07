/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';

import {
  EuiButtonGroupOptionProps,
  EuiSelectableOption,
  EuiPopoverTitle,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiSelectable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  Direction,
  EuiToolTip,
} from '@elastic/eui';
import { useReduxEmbeddableContext } from '@kbn/presentation-util-plugin/public';

import {
  getCompatibleSortingTypes,
  OPTIONS_LIST_DEFAULT_SORT,
  OptionsListSortBy,
} from '../../../common/options_list/suggestions_sorting';
import { OptionsListReduxState } from '../types';
import { OptionsListStrings } from './options_list_strings';
import { optionsListReducers } from '../options_list_reducers';

interface OptionsListSortingPopoverProps {
  showOnlySelected: boolean;
}
type SortByItem = EuiSelectableOption & {
  data: { sortBy: OptionsListSortBy };
};

export const OptionsListPopoverSortingButton = ({
  showOnlySelected,
}: OptionsListSortingPopoverProps) => {
  // Redux embeddable container Context
  const {
    useEmbeddableDispatch,
    useEmbeddableSelector: select,
    actions: { setSort },
  } = useReduxEmbeddableContext<OptionsListReduxState, typeof optionsListReducers>();
  const dispatch = useEmbeddableDispatch();

  // Select current state from Redux using multiple selectors to avoid rerenders.
  const field = select((state) => state.componentState.field);
  const sort = select((state) => state.explicitInput.sort ?? OPTIONS_LIST_DEFAULT_SORT);

  const [isSortingPopoverOpen, setIsSortingPopoverOpen] = useState(false);

  const [sortByOptions, setSortByOptions] = useState<SortByItem[]>(() => {
    return getCompatibleSortingTypes(field?.type).map((key) => {
      return {
        onFocusBadge: false,
        data: { sortBy: key },
        checked: key === sort.by ? 'on' : undefined,
        'data-test-subj': `optionsList__sortBy_${key}`,
        label: OptionsListStrings.editorAndPopover.sortBy[key].getSortByLabel(),
      } as SortByItem;
    });
  });

  const sortOrderOptions: EuiButtonGroupOptionProps[] = [
    {
      id: 'asc',
      iconType: `sortAscending`,
      'data-test-subj': `optionsList__sortOrder_asc`,
      label: OptionsListStrings.editorAndPopover.sortOrder.asc.getSortOrderLabel(),
    },
    {
      id: 'desc',
      iconType: `sortDescending`,
      'data-test-subj': `optionsList__sortOrder_desc`,
      label: OptionsListStrings.editorAndPopover.sortOrder.desc.getSortOrderLabel(),
    },
  ];

  const onSortByChange = (updatedOptions: SortByItem[]) => {
    setSortByOptions(updatedOptions);
    const selectedOption = updatedOptions.find(({ checked }) => checked === 'on');
    if (selectedOption) {
      dispatch(setSort({ by: selectedOption.data.sortBy }));
    }
  };

  const SortButton = () => (
    <EuiButtonEmpty
      size="s"
      color="text"
      iconSide="right"
      iconType="arrowDown"
      disabled={showOnlySelected}
      data-test-subj="optionsListControl__sortingOptionsButton"
      onClick={() => setIsSortingPopoverOpen(!isSortingPopoverOpen)}
      className="euiFilterGroup" // this gives the button a nice border
      aria-label={OptionsListStrings.popover.getSortPopoverDescription()}
    >
      {OptionsListStrings.popover.getSortPopoverTitle()}
    </EuiButtonEmpty>
  );

  return (
    <EuiPopover
      button={
        showOnlySelected ? (
          <EuiToolTip position="top" content={OptionsListStrings.popover.getSortDisabledTooltip()}>
            <SortButton />
          </EuiToolTip>
        ) : (
          <SortButton />
        )
      }
      panelPaddingSize="none"
      isOpen={isSortingPopoverOpen}
      aria-labelledby="optionsList_sortingOptions"
      closePopover={() => setIsSortingPopoverOpen(false)}
      panelClassName={'optionsList--sortPopover'}
    >
      <span data-test-subj="optionsListControl__sortingOptionsPopover">
        <EuiPopoverTitle paddingSize="s">
          <EuiFlexGroup alignItems="center" responsive={false}>
            <EuiFlexItem>{OptionsListStrings.popover.getSortPopoverTitle()}</EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonGroup
                isIconOnly
                buttonSize="compressed"
                options={sortOrderOptions}
                idSelected={sort.direction}
                legend={OptionsListStrings.editorAndPopover.getSortDirectionLegend()}
                onChange={(value) => dispatch(setSort({ direction: value as Direction }))}
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
          aria-label={OptionsListStrings.popover.getSortPopoverDescription()}
        >
          {(list) => list}
        </EuiSelectable>
      </span>
    </EuiPopover>
  );
};
