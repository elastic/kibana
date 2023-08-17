/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import {
  EuiFieldSearch,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiToolTip,
  EuiText,
} from '@elastic/eui';

import { OptionsListStrings } from './options_list_strings';
import { useOptionsList } from '../embeddable/options_list_embeddable';
import { OptionsListPopoverSortingButton } from './options_list_popover_sorting_button';
import { OPTIONS_LIST_DEFAULT_SEARCH_TECHNIQUE } from '../../../common/options_list/types';

interface OptionsListPopoverProps {
  showOnlySelected: boolean;
  updateSearchString: (newSearchString: string) => void;
  setShowOnlySelected: (value: boolean) => void;
}

export const OptionsListPopoverActionBar = ({
  showOnlySelected,
  updateSearchString,
  setShowOnlySelected,
}: OptionsListPopoverProps) => {
  const optionsList = useOptionsList();

  const totalCardinality =
    optionsList.select((state) => state.componentState.totalCardinality) ?? 0;
  const searchString = optionsList.select((state) => state.componentState.searchString);
  const invalidSelections = optionsList.select((state) => state.componentState.invalidSelections);

  const hideSort = optionsList.select((state) => state.explicitInput.hideSort);
  const searchTechnique = optionsList.select((state) => state.explicitInput.searchTechnique);

  const allowExpensiveQueries = optionsList.select(
    (state) => state.componentState.allowExpensiveQueries
  );

  return (
    <div className="optionsList__actions">
      <EuiFormRow fullWidth>
        <EuiFlexGroup className="optionsList__searchSortRow" gutterSize="xs" responsive={false}>
          <EuiFlexItem grow={true}>
            <EuiFieldSearch
              isInvalid={!searchString.valid}
              compressed
              disabled={showOnlySelected}
              fullWidth
              onChange={(event) => updateSearchString(event.target.value)}
              value={searchString.value}
              data-test-subj="optionsList-control-search-input"
              placeholder={OptionsListStrings.popover.searchPlaceholder[
                searchTechnique ?? OPTIONS_LIST_DEFAULT_SEARCH_TECHNIQUE
              ].getPlaceholderText()}
            />
          </EuiFlexItem>
          {!hideSort && (
            <EuiFlexItem className="optionsList__sortButtonWrapper" grow={false}>
              <OptionsListPopoverSortingButton showOnlySelected={showOnlySelected} />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFormRow>
      <EuiFormRow className="optionsList__actionsRow" fullWidth>
        <EuiFlexGroup
          justifyContent="spaceBetween"
          alignItems="center"
          gutterSize="s"
          responsive={false}
        >
          {allowExpensiveQueries && (
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued" data-test-subj="optionsList-cardinality-label">
                {OptionsListStrings.popover.getCardinalityLabel(totalCardinality)}
              </EuiText>
            </EuiFlexItem>
          )}
          {invalidSelections && invalidSelections.length > 0 && (
            <>
              {allowExpensiveQueries && (
                <EuiFlexItem grow={false}>
                  <div className="optionsList__actionBarDivider" />
                </EuiFlexItem>
              )}
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  {OptionsListStrings.popover.getInvalidSelectionsLabel(invalidSelections.length)}
                </EuiText>
              </EuiFlexItem>
            </>
          )}
          <EuiFlexItem grow={true}>
            <EuiFlexGroup
              gutterSize="xs"
              alignItems="center"
              justifyContent="flexEnd"
              responsive={false}
            >
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
                    size="xs"
                    iconType="list"
                    aria-pressed={showOnlySelected}
                    color={showOnlySelected ? 'primary' : 'text'}
                    display={showOnlySelected ? 'base' : 'empty'}
                    onClick={() => setShowOnlySelected(!showOnlySelected)}
                    data-test-subj="optionsList-control-show-only-selected"
                    aria-label={
                      showOnlySelected
                        ? OptionsListStrings.popover.getAllOptionsButtonTitle()
                        : OptionsListStrings.popover.getSelectedOptionsButtonTitle()
                    }
                  />
                </EuiToolTip>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormRow>
    </div>
  );
};
