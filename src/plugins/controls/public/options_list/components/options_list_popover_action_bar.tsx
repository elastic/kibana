/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import { isEqual } from 'lodash';

import {
  EuiFieldSearch,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiToolTip,
  EuiBadge,
  EuiPopover,
  EuiSelectable,
  EuiPopoverTitle,
  EuiSelectableOption,
} from '@elastic/eui';
import { useReduxEmbeddableContext } from '@kbn/presentation-util-plugin/public';

import { OptionsListReduxState } from '../types';
import { OptionsListStrings } from './options_list_strings';
import { optionsListReducers } from '../options_list_reducers';
import { SuggestionsSorting } from '../../../common/options_list/types';
import { OptionsListSortingOptions } from '@kbn/controls-plugin/common/options_list/suggestions_sorting';

interface OptionsListPopoverProps {
  showOnlySelected: boolean;
  setShowOnlySelected: (value: boolean) => void;
  updateSearchString: (newSearchString: string) => void;
}

type SortItem = EuiSelectableOption & {
  data: SuggestionsSorting;
};

export const OptionsListPopoverActionBar = ({
  showOnlySelected,
  updateSearchString,
  setShowOnlySelected,
}: OptionsListPopoverProps) => {
  // Redux embeddable container Context
  const {
    useEmbeddableDispatch,
    useEmbeddableSelector: select,
    actions: { clearSelections, setSort },
  } = useReduxEmbeddableContext<OptionsListReduxState, typeof optionsListReducers>();
  const dispatch = useEmbeddableDispatch();

  // Select current state from Redux using multiple selectors to avoid rerenders.
  const invalidSelections = select((state) => state.componentState.invalidSelections);
  const totalCardinality = select((state) => state.componentState.totalCardinality);
  const searchString = select((state) => state.componentState.searchString);

  const sort = select((state) => state.explicitInput.sort ?? { by: '_count', direction: 'desc' });

  const [isSortingPopoverOpen, setIsSortingPopoverOpen] = useState(false);
  const [options, setOptions] = useState<SortItem[]>(() => {
    return Object.values(OptionsListSortingOptions).map((data) => {
      return {
        data,
        checked: isEqual(data, sort) ? 'on' : undefined,
        'data-test-subj': `optionsList__sortBy${data.by}_${data.direction}`,
        label: OptionsListStrings.popover.sortBy[data.by][data.direction].getSortByLabel(),
      };
    });
  });

  const onSelectChange = (updatedOptions: SortItem[]) => {
    setOptions(updatedOptions);
    const selectedOption = updatedOptions.find(({ checked }) => checked === 'on');
    if (selectedOption) {
      dispatch(setSort(selectedOption.data as SuggestionsSorting));
      setIsSortingPopoverOpen(false);
    }
  };

  return (
    <div className="optionsList__actions">
      <EuiFormRow fullWidth>
        <EuiFlexGroup
          gutterSize="xs"
          direction="row"
          justifyContent="spaceBetween"
          alignItems="center"
          responsive={false}
        >
          <EuiFlexItem>
            <EuiFieldSearch
              isInvalid={!searchString.valid}
              compressed
              disabled={showOnlySelected}
              fullWidth
              onChange={(event) => updateSearchString(event.target.value)}
              value={searchString.value}
              data-test-subj="optionsList-control-search-input"
              placeholder={
                totalCardinality
                  ? OptionsListStrings.popover.getTotalCardinalityPlaceholder(totalCardinality)
                  : undefined
              }
              autoFocus={true}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            {(invalidSelections?.length ?? 0) > 0 && (
              <EuiToolTip
                content={OptionsListStrings.popover.getInvalidSelectionsTooltip(
                  invalidSelections?.length ?? 0
                )}
              >
                <EuiBadge className="optionsList__ignoredBadge" color="warning">
                  {invalidSelections?.length}
                </EuiBadge>
              </EuiToolTip>
            )}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiPopover
              button={
                <EuiButtonIcon
                  iconType="sortable"
                  onClick={() => setIsSortingPopoverOpen(!isSortingPopoverOpen)}
                  aria-label={'sort by'}
                  disabled={showOnlySelected}
                />
              }
              isOpen={isSortingPopoverOpen}
              closePopover={() => setIsSortingPopoverOpen(false)}
              panelPaddingSize="none"
            >
              <EuiPopoverTitle paddingSize="s">Sort</EuiPopoverTitle>
              <EuiSelectable
                singleSelection="always"
                aria-label="Single selection example"
                options={options}
                listProps={{ bordered: false }}
                style={{ width: 300 }}
                onChange={onSelectChange}
              >
                {(list) => list}
              </EuiSelectable>
            </EuiPopover>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiToolTip
              position="top"
              content={
                showOnlySelected
                  ? OptionsListStrings.popover.getAllOptionsButtonTitle()
                  : OptionsListStrings.popover.getSelectedOptionsButtonTitle()
              }
            >
              <EuiButtonIcon
                size="s"
                iconType="list"
                aria-pressed={showOnlySelected}
                color={showOnlySelected ? 'primary' : 'text'}
                display={showOnlySelected ? 'base' : 'empty'}
                aria-label={OptionsListStrings.popover.getClearAllSelectionsButtonTitle()}
                data-test-subj="optionsList-control-show-only-selected"
                onClick={() => setShowOnlySelected(!showOnlySelected)}
              />
            </EuiToolTip>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiToolTip
              position="top"
              content={OptionsListStrings.popover.getClearAllSelectionsButtonTitle()}
            >
              <EuiButtonIcon
                size="s"
                color="danger"
                iconType="eraser"
                data-test-subj="optionsList-control-clear-all-selections"
                aria-label={OptionsListStrings.popover.getClearAllSelectionsButtonTitle()}
                onClick={() => dispatch(clearSelections({}))}
              />
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormRow>
    </div>
  );
};
