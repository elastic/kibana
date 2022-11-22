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
  EuiBadge,
} from '@elastic/eui';
import { useReduxEmbeddableContext } from '@kbn/presentation-util-plugin/public';

import { OptionsListReduxState } from '../types';
import { OptionsListStrings } from './options_list_strings';
import { optionsListReducers } from '../options_list_reducers';

interface OptionsListPopoverProps {
  showOnlySelected: boolean;
  setShowOnlySelected: (value: boolean) => void;
  updateSearchString: (newSearchString: string) => void;
}

export const OptionsListPopoverActionBar = ({
  showOnlySelected,
  setShowOnlySelected,
  updateSearchString,
}: OptionsListPopoverProps) => {
  // Redux embeddable container Context
  const {
    useEmbeddableDispatch,
    useEmbeddableSelector: select,
    actions: { clearSelections },
  } = useReduxEmbeddableContext<OptionsListReduxState, typeof optionsListReducers>();
  const dispatch = useEmbeddableDispatch();

  // Select current state from Redux using multiple selectors to avoid rerenders.
  const invalidSelections = select((state) => state.componentState.invalidSelections);
  const totalCardinality = select((state) => state.componentState.totalCardinality);
  const searchString = select((state) => state.componentState.searchString);

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
        </EuiFlexGroup>
      </EuiFormRow>
    </div>
  );
};
