/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';

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

import {
  OptionsListSortingTypes,
  SortingType,
} from '../../../common/options_list/suggestions_sorting';
import { OptionsListReduxState } from '../types';
import { OptionsListStrings } from './options_list_strings';
import { optionsListReducers } from '../options_list_reducers';

interface OptionsListPopoverProps {
  showOnlySelected: boolean;
  setShowOnlySelected: (value: boolean) => void;
  updateSearchString: (newSearchString: string) => void;
}

type SortItem = EuiSelectableOption & {
  data: SortingType;
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

  const sort = select((state) => state.explicitInput.sort ?? 'docDescending');

  const [isSortingPopoverOpen, setIsSortingPopoverOpen] = useState(false);
  const [options, setOptions] = useState<SortItem[]>(() => {
    return (Object.keys(OptionsListSortingTypes) as SortingType[]).map((key) => {
      return {
        data: key,
        checked: key === sort ? 'on' : undefined,
        'data-test-subj': `optionsList__sortBy_${key}`,
        label: OptionsListStrings.popover.sortBy[key].getSortByLabel(),
      } as SortItem;
    });
  });

  const onSelectChange = (updatedOptions: SortItem[]) => {
    setOptions(updatedOptions);
    const selectedOption = updatedOptions.find(({ checked }) => checked === 'on');
    if (selectedOption) {
      dispatch(setSort(selectedOption.data));
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
                <EuiToolTip
                  position="top"
                  content={OptionsListStrings.popover.getSortPopoverDescription()}
                >
                  <EuiButtonIcon
                    iconType="sortable"
                    disabled={showOnlySelected}
                    data-test-subj="optionsList-control-sorting-options-button"
                    onClick={() => setIsSortingPopoverOpen(!isSortingPopoverOpen)}
                    aria-label={OptionsListStrings.popover.getSortPopoverDescription()}
                  />
                </EuiToolTip>
              }
              panelPaddingSize="none"
              isOpen={isSortingPopoverOpen}
              aria-labelledby="optionsList_sortingOptions"
              closePopover={() => setIsSortingPopoverOpen(false)}
              data-test-subj="optionsList-control-sorting-options-popover"
            >
              <EuiPopoverTitle paddingSize="s">
                {OptionsListStrings.popover.getSortPopoverTitle()}
              </EuiPopoverTitle>
              <EuiSelectable
                options={options}
                style={{ width: 300 }}
                singleSelection="always"
                onChange={onSelectChange}
                id="optionsList_sortingOptions"
                listProps={{ bordered: false }}
                aria-label={OptionsListStrings.popover.getSortPopoverDescription()}
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
                onClick={() => setShowOnlySelected(!showOnlySelected)}
                data-test-subj="optionsList-control-show-only-selected"
                aria-label={OptionsListStrings.popover.getClearAllSelectionsButtonTitle()}
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
                onClick={() => dispatch(clearSelections({}))}
                data-test-subj="optionsList-control-clear-all-selections"
                aria-label={OptionsListStrings.popover.getClearAllSelectionsButtonTitle()}
              />
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormRow>
    </div>
  );
};
