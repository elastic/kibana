/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useState } from 'react';

import {
  Direction,
  EuiButtonGroup,
  EuiButtonGroupOptionProps,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiPopoverTitle,
  EuiSelectable,
  EuiSelectableOption,
  EuiToolTip,
} from '@elastic/eui';
import { useBatchedPublishingSubjects } from '@kbn/presentation-publishing';

import {
  getCompatibleSortingTypes,
  OptionsListSortBy,
  OPTIONS_LIST_DEFAULT_SORT,
} from '../../../../../../common/options_list/suggestions_sorting';
import { useOptionsListContext } from '../options_list_context_provider';
import { OptionsListStrings } from '../options_list_strings';

type SortByItem = EuiSelectableOption & {
  data: { sortBy: OptionsListSortBy };
};

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

export const OptionsListPopoverSortingButton = ({
  showOnlySelected,
}: {
  showOnlySelected: boolean;
}) => {
  const { api, stateManager } = useOptionsListContext();

  const [isSortingPopoverOpen, setIsSortingPopoverOpen] = useState(false);
  const [sort, field] = useBatchedPublishingSubjects(stateManager.sort, api.field$);

  const selectedSort = useMemo(() => sort ?? OPTIONS_LIST_DEFAULT_SORT, [sort]);

  const [sortByOptions, setSortByOptions] = useState<SortByItem[]>(() => {
    return getCompatibleSortingTypes(field?.type).map((key) => {
      return {
        onFocusBadge: false,
        data: { sortBy: key },
        checked: key === selectedSort.by ? 'on' : undefined,
        'data-test-subj': `optionsList__sortBy_${key}`,
        label: OptionsListStrings.editorAndPopover.sortBy[key].getSortByLabel(field?.type),
      } as SortByItem;
    });
  });

  const onSortByChange = useCallback(
    (updatedOptions: SortByItem[]) => {
      setSortByOptions(updatedOptions);
      const selectedOption = updatedOptions.find(({ checked }) => checked === 'on');
      if (selectedOption) {
        stateManager.sort.next({
          ...selectedSort,
          by: selectedOption.data.sortBy,
        });
      }
    },
    [selectedSort, stateManager.sort]
  );

  const SortButton = () => (
    <EuiButtonIcon
      size="xs"
      display="empty"
      color="text"
      iconType={selectedSort.direction === 'asc' ? 'sortAscending' : 'sortDescending'}
      isDisabled={showOnlySelected}
      className="optionsList__sortButton"
      data-test-subj="optionsListControl__sortingOptionsButton"
      onClick={() => setIsSortingPopoverOpen(!isSortingPopoverOpen)}
      aria-label={OptionsListStrings.popover.getSortPopoverDescription()}
    />
  );

  return (
    <EuiPopover
      button={
        <EuiToolTip
          position="top"
          content={
            showOnlySelected
              ? OptionsListStrings.popover.getSortDisabledTooltip()
              : OptionsListStrings.popover.getSortPopoverTitle()
          }
        >
          <SortButton />
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
                idSelected={selectedSort.direction ?? OPTIONS_LIST_DEFAULT_SORT.direction}
                legend={OptionsListStrings.editorAndPopover.getSortDirectionLegend()}
                onChange={(value) => {
                  stateManager.sort.next({
                    ...selectedSort,
                    direction: value as Direction,
                  });
                }}
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
