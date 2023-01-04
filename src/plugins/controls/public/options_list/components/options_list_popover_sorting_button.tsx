/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo, useState } from 'react';

import {
  EuiButtonGroupOptionProps,
  EuiSelectableOption,
  EuiPopoverTitle,
  EuiButtonGroup,
  toSentenceCase,
  EuiButtonIcon,
  EuiSelectable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiToolTip,
  EuiPopover,
  Direction,
} from '@elastic/eui';
import { useReduxEmbeddableContext } from '@kbn/presentation-util-plugin/public';

import {
  getCompatibleSortingTypes,
  DEFAULT_SORT,
  sortDirections,
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
type SortOrderItem = EuiButtonGroupOptionProps & {
  value: Direction;
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
  const sort = select((state) => state.explicitInput.sort ?? DEFAULT_SORT);

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

  const sortOrderOptions = useMemo(
    () =>
      sortDirections.map((key) => {
        return {
          id: key,
          iconType: `sort${toSentenceCase(key)}ending`,
          'data-test-subj': `optionsList__sortOrder_${key}`,
          label: OptionsListStrings.editorAndPopover.sortOrder[key].getSortOrderLabel(),
        } as SortOrderItem;
      }),
    []
  );

  const onSortByChange = (updatedOptions: SortByItem[]) => {
    setSortByOptions(updatedOptions);
    const selectedOption = updatedOptions.find(({ checked }) => checked === 'on');
    if (selectedOption) {
      dispatch(setSort({ by: selectedOption.data.sortBy }));
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
