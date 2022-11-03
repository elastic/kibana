/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo } from 'react';

import { EuiFilterSelectItem, EuiSpacer, EuiIcon } from '@elastic/eui';
import { useReduxEmbeddableContext } from '@kbn/presentation-util-plugin/public';

import { OptionsListReduxState } from '../types';
import { OptionsListStrings } from './options_list_strings';
import { optionsListReducers } from '../options_list_reducers';

interface OptionsListPopoverSuggestionsProps {
  showOnlySelected: boolean;
}

export const OptionsListPopoverSuggestions = ({
  showOnlySelected,
}: OptionsListPopoverSuggestionsProps) => {
  // Redux embeddable container Context
  const {
    useEmbeddableDispatch,
    useEmbeddableSelector: select,
    actions: { replaceSelection, deselectOption, selectOption, selectExists },
  } = useReduxEmbeddableContext<OptionsListReduxState, typeof optionsListReducers>();
  const dispatch = useEmbeddableDispatch();

  // Select current state from Redux using multiple selectors to avoid rerenders.
  const existsSelectionInvalid = select((state) => state.componentState.existsSelectionInvalid);
  const invalidSelections = select((state) => state.componentState.invalidSelections);
  const availableOptions = select((state) => state.componentState.availableOptions);

  const selectedOptions = select((state) => state.explicitInput.selectedOptions);
  const existsSelected = select((state) => state.explicitInput.existsSelected);
  const singleSelect = select((state) => state.explicitInput.singleSelect);
  const hideExists = select((state) => state.explicitInput.hideExists);

  const loading = select((state) => state.output.loading);

  // track selectedOptions and invalidSelections in sets for more efficient lookup
  const selectedOptionsSet = useMemo(() => new Set<string>(selectedOptions), [selectedOptions]);
  const invalidSelectionsSet = useMemo(
    () => new Set<string>(invalidSelections),
    [invalidSelections]
  );
  const suggestions = showOnlySelected ? selectedOptions : availableOptions;

  if (
    !loading &&
    (!suggestions || suggestions.length === 0) &&
    !(showOnlySelected && existsSelected)
  ) {
    return (
      <div
        className="euiFilterSelect__note"
        data-test-subj={`optionsList-control-${
          showOnlySelected ? 'selectionsEmptyMessage' : 'noSelectionsMessage'
        }`}
      >
        <div className="euiFilterSelect__noteContent">
          <EuiIcon type="minusInCircle" />
          <EuiSpacer size="xs" />
          <p>
            {showOnlySelected
              ? OptionsListStrings.popover.getSelectionsEmptyMessage()
              : OptionsListStrings.popover.getEmptyMessage()}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {!hideExists &&
        ((showOnlySelected && existsSelected) ||
          (!showOnlySelected && !existsSelectionInvalid)) && (
          <EuiFilterSelectItem
            data-test-subj={`optionsList-control-selection-exists`}
            checked={existsSelected ? 'on' : undefined}
            key={'exists-option'}
            onClick={() => {
              dispatch(selectExists(!Boolean(existsSelected)));
            }}
          >
            <span className="optionsList__existsFilter">
              {OptionsListStrings.controlAndPopover.getExists()}
            </span>
          </EuiFilterSelectItem>
        )}
      {suggestions?.map((suggestion, index) => (
        <EuiFilterSelectItem
          data-test-subj={`optionsList-control-selection-${suggestion}`}
          checked={selectedOptionsSet?.has(suggestion) ? 'on' : undefined}
          key={index}
          onClick={() => {
            if (showOnlySelected) {
              dispatch(deselectOption(suggestion));
              return;
            }
            if (singleSelect) {
              dispatch(replaceSelection(suggestion));
              return;
            }
            if (selectedOptionsSet.has(suggestion)) {
              dispatch(deselectOption(suggestion));
              return;
            }
            dispatch(selectOption(suggestion));
          }}
          className={
            showOnlySelected && invalidSelectionsSet.has(suggestion)
              ? 'optionsList__selectionInvalid'
              : undefined
          }
        >
          {`${suggestion}`}
        </EuiFilterSelectItem>
      ))}
    </>
  );
};
