/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { EuiFilterSelectItem, EuiSpacer, EuiTitle } from '@elastic/eui';
import { useReduxEmbeddableContext } from '@kbn/presentation-util-plugin/public';

import { OptionsListReduxState } from '../types';
import { OptionsListStrings } from './options_list_strings';
import { optionsListReducers } from '../options_list_reducers';

export const OptionsListPopoverInvalidSelections = () => {
  // Redux embeddable container Context
  const {
    useEmbeddableDispatch,
    useEmbeddableSelector: select,
    actions: { deselectOption },
  } = useReduxEmbeddableContext<OptionsListReduxState, typeof optionsListReducers>();
  const dispatch = useEmbeddableDispatch();

  // Select current state from Redux using multiple selectors to avoid rerenders.
  const invalidSelections = select((state) => state.componentState.invalidSelections);
  return (
    <>
      <EuiSpacer size="s" />
      <EuiTitle
        size="xxs"
        className="optionsList-control-ignored-selection-title"
        data-test-subj="optionList__ignoredSelectionLabel"
      >
        <label>
          {OptionsListStrings.popover.getInvalidSelectionsSectionTitle(
            invalidSelections?.length ?? 0
          )}
        </label>
      </EuiTitle>
      {invalidSelections?.map((ignoredSelection, index) => (
        <EuiFilterSelectItem
          data-test-subj={`optionsList-control-ignored-selection-${ignoredSelection}`}
          checked={'on'}
          className="optionsList__selectionInvalid"
          key={index}
          onClick={() => dispatch(deselectOption(ignoredSelection))}
          aria-label={OptionsListStrings.popover.getInvalidSelectionAriaLabel(ignoredSelection)}
        >
          {`${ignoredSelection}`}
        </EuiFilterSelectItem>
      ))}
    </>
  );
};
