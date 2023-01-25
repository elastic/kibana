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
  EuiButtonGroup,
  EuiButtonIcon,
  EuiSelectable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiToolTip,
  EuiPopover,
  Direction,
} from '@elastic/eui';

import {
  getCompatibleSortingTypes,
  OPTIONS_LIST_DEFAULT_SORT,
  OptionsListSortBy,
} from '../../../common/options_list/suggestions_sorting';
import { OptionsListStrings } from './options_list_strings';
import { useOptionsList } from '../embeddable/options_list_embeddable';

interface OptionsListSortingPopoverProps {
  showOnlySelected: boolean;
}
type SortByItem = EuiSelectableOption & {
  data: { sortBy: OptionsListSortBy };
};

export const OptionsListPopoverSortingButton = ({
  showOnlySelected,
}: OptionsListSortingPopoverProps) => {
  const optionsList = useOptionsList();

  const field = optionsList.select((state) => state.componentState.field);
  const sort = optionsList.select((state) => state.explicitInput.sort ?? OPTIONS_LIST_DEFAULT_SORT);

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
      optionsList.dispatch.setSort({ by: selectedOption.data.sortBy });
    }
  };

  return (
    <EuiPopover
      button={
        <EuiToolTip
          position="top"
          content={
            showOnlySelected
              ? OptionsListStrings.popover.getSortDisabledTooltip()
              : OptionsListStrings.popover.getSortPopoverDescription()
          }
        >
          <EuiButtonIcon
            iconType="sortable"
            disabled={showOnlySelected}
            data-test-subj="optionsListControl__sortingOptionsButton"
            onClick={() => setIsSortingPopoverOpen(!isSortingPopoverOpen)}
            aria-label={OptionsListStrings.popover.getSortPopoverDescription()}
          />
        </EuiToolTip>
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
                onChange={(value) =>
                  optionsList.dispatch.setSort({ direction: value as Direction })
                }
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
